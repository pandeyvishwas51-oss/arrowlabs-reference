"""Multi-marketplace product scraping — Flipkart, Myntra, Noon, Namshi, Nykaa.

Design: one normalized product shape for every marketplace, extracted from the
sources these modern storefronts reliably embed in the HTML:
  1. JSON-LD  (<script type="application/ld+json"> Product schema) — title, brand,
     price, images, rating, reviewCount, and often a `review` array.
  2. Next.js __NEXT_DATA__  (Noon, Namshi, Nykaa are Next.js apps) — full product
     payload including specs, gallery, and reviews.
  3. OpenGraph / meta tags — resilient fallback for title/image/price.

Each platform has (a) a URL builder from its native id (Flipkart FSN, Myntra
style id, Noon/Namshi sku) and (b) an optional review extractor. Everything runs
through the existing fetch() in app.py, so it inherits the direct→proxy→Playwright
reliability stack and the manual proxy pool.
"""

import json
import re
from bs4 import BeautifulSoup

PLATFORMS = {
    "flipkart": {"host": "www.flipkart.com", "currency": "INR"},
    "myntra": {"host": "www.myntra.com", "currency": "INR"},
    "nykaa": {"host": "www.nykaa.com", "currency": "INR"},
    "noon": {"host": "www.noon.com", "currency": "AED"},
    "namshi": {"host": "www.namshi.com", "currency": "AED"},
}


def _txt(el):
    return el.get_text(strip=True) if el else ""


# ---------------- generic extractors ----------------
def extract_jsonld(html):
    """Return all JSON-LD objects on the page (flattened over @graph)."""
    out = []
    soup = BeautifulSoup(html, "lxml")
    for tag in soup.find_all("script", {"type": "application/ld+json"}):
        raw = tag.string or tag.get_text() or ""
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except Exception:
            # Some sites concatenate multiple objects; try a lenient split.
            try:
                data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
            except Exception:
                continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            if isinstance(it, dict) and "@graph" in it and isinstance(it["@graph"], list):
                out.extend([g for g in it["@graph"] if isinstance(g, dict)])
            elif isinstance(it, dict):
                out.append(it)
    return out


def _first_product(objs):
    for o in objs:
        t = o.get("@type") or o.get("type") or ""
        t = " ".join(t) if isinstance(t, list) else str(t)
        if "Product" in t:
            return o
    return None


def extract_next_data(html):
    """__NEXT_DATA__ payload (Next.js sites: Noon, Namshi, Nykaa)."""
    m = re.search(
        r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S
    )
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except Exception:
        return None


def extract_og(html):
    soup = BeautifulSoup(html, "lxml")
    og = {}
    for m in soup.find_all("meta"):
        p = m.get("property") or m.get("name") or ""
        if p.startswith("og:") or p.startswith("product:") or p in ("description",):
            og[p] = m.get("content", "")
    return og


def _num(v):
    if v is None:
        return 0.0
    s = re.search(r"[\d,]+\.?\d*", str(v))
    return float(s.group(0).replace(",", "")) if s else 0.0


def _deep_find(node, keys, depth=0):
    """Best-effort: find the first dict in a nested structure that has any of
    `keys` — used to locate the product node inside a __NEXT_DATA__ blob."""
    if depth > 8:
        return None
    if isinstance(node, dict):
        if any(k in node for k in keys):
            return node
        for v in node.values():
            r = _deep_find(v, keys, depth + 1)
            if r:
                return r
    elif isinstance(node, list):
        for v in node:
            r = _deep_find(v, keys, depth + 1)
            if r:
                return r
    return None


# ---------------- normalization ----------------
def normalize(platform, html, url):
    """Merge JSON-LD + __NEXT_DATA__ + OG into one normalized product."""
    currency = PLATFORMS.get(platform, {}).get("currency", "USD")
    objs = extract_jsonld(html)
    p = _first_product(objs) or {}
    og = extract_og(html)

    title = p.get("name") or og.get("og:title") or ""
    brand = ""
    b = p.get("brand")
    if isinstance(b, dict):
        brand = b.get("name", "")
    elif isinstance(b, str):
        brand = b
    description = p.get("description") or og.get("og:description") or og.get("description") or ""

    # Images
    images = []
    img = p.get("image")
    if isinstance(img, list):
        images = [i for i in img if isinstance(i, str)]
    elif isinstance(img, str):
        images = [img]
    if not images and og.get("og:image"):
        images = [og["og:image"]]

    # Price
    price = 0.0
    list_price = 0.0
    offers = p.get("offers")
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    if isinstance(offers, dict):
        price = _num(offers.get("price") or offers.get("lowPrice"))
        currency = offers.get("priceCurrency") or currency
    if not price:
        price = _num(og.get("product:price:amount"))

    # Rating / reviews
    rating = 0.0
    review_count = 0
    agg = p.get("aggregateRating")
    if isinstance(agg, dict):
        rating = _num(agg.get("ratingValue"))
        review_count = int(_num(agg.get("reviewCount") or agg.get("ratingCount")))

    reviews = []
    jr = p.get("review")
    if isinstance(jr, dict):
        jr = [jr]
    if isinstance(jr, list):
        for r in jr[:20]:
            if not isinstance(r, dict):
                continue
            body = r.get("reviewBody") or r.get("description") or ""
            rr = r.get("reviewRating") or {}
            reviews.append({
                "rating": _num(rr.get("ratingValue")) if isinstance(rr, dict) else 0.0,
                "title": r.get("name", ""),
                "body": body,
                "author": (r.get("author") or {}).get("name", "") if isinstance(r.get("author"), dict) else str(r.get("author") or ""),
            })

    # Bullets/features — from JSON-LD additionalProperty or platform parsers.
    bullets = []
    ap = p.get("additionalProperty")
    if isinstance(ap, list):
        for a in ap[:10]:
            if isinstance(a, dict) and a.get("name") and a.get("value"):
                bullets.append(f"{a['name']}: {a['value']}")

    # Platform-specific enrichment (fills gaps from embedded state).
    enrich = PLATFORM_PARSERS.get(platform)
    data = {
        "platform": platform,
        "url": url,
        "title": title.strip(),
        "brand": brand.strip(),
        "description": description.strip(),
        "price": price,
        "listPrice": list_price,
        "currency": currency,
        "rating": rating,
        "reviewCount": review_count,
        "images": images,
        "bullets": bullets,
        "reviews": reviews,
    }
    if enrich:
        try:
            enrich(html, data)
        except Exception:
            pass
    return data


# ---------------- per-platform enrichment + URL builders ----------------
def _enrich_next(html, data, product_keys):
    nd = extract_next_data(html)
    if not nd:
        return
    node = _deep_find(nd.get("props", nd), product_keys)
    if not isinstance(node, dict):
        return
    if not data["title"]:
        data["title"] = str(node.get("name") or node.get("title") or node.get("product_title") or "").strip()
    if not data["brand"]:
        br = node.get("brand") or node.get("brand_code")
        data["brand"] = (br.get("name") if isinstance(br, dict) else str(br or "")).strip()
    if not data["images"]:
        imgs = node.get("image_keys") or node.get("images") or node.get("media") or []
        if isinstance(imgs, list):
            data["images"] = [i if isinstance(i, str) else (i.get("url") or i.get("src") or "") for i in imgs][:12]
    if not data["price"]:
        data["price"] = _num(node.get("price") or node.get("sale_price") or (node.get("offers") or {}).get("price"))


def enrich_noon(html, data):
    _enrich_next(html, data, ["product", "sku_config", "productData"])


def enrich_namshi(html, data):
    _enrich_next(html, data, ["product", "sku", "productData"])


def enrich_nykaa(html, data):
    _enrich_next(html, data, ["product", "productData", "pdp"])


def enrich_myntra(html, data):
    # Myntra embeds pdpData in a script (pdpData = {...}) rather than __NEXT_DATA__.
    m = re.search(r"pdpData['\"]?\s*[:=]\s*(\{.*?\})\s*[,;]\s*\n", html, re.S)
    if not m:
        return
    try:
        pdp = json.loads(m.group(1))
    except Exception:
        return
    if not data["title"]:
        data["title"] = (pdp.get("name") or "").strip()
    if not data["brand"]:
        data["brand"] = (pdp.get("brand") or {}).get("name", "") if isinstance(pdp.get("brand"), dict) else ""
    media = (pdp.get("media") or {}).get("albums") or []
    imgs = []
    for al in media:
        for ph in al.get("images", []):
            if ph.get("secureSrc") or ph.get("src"):
                imgs.append(ph.get("secureSrc") or ph.get("src"))
    if imgs and not data["images"]:
        data["images"] = imgs[:12]


def enrich_flipkart(html, data):
    # Flipkart: JSON-LD usually covers it; nothing extra needed for the baseline.
    pass


PLATFORM_PARSERS = {
    "noon": enrich_noon,
    "namshi": enrich_namshi,
    "nykaa": enrich_nykaa,
    "myntra": enrich_myntra,
    "flipkart": enrich_flipkart,
}


def build_url(platform, pid, region=None):
    """Build a product URL from the platform's native id.

    Flipkart : FSN  -> /product/p/itme?pid=<FSN>
    Myntra   : style id -> /<id>  (Myntra resolves the bare id)
    Nykaa    : product id -> /product/detail/<id>
    Noon     : sku  -> /<region>/<sku>/p/   (region e.g. uae-en, saudi-en)
    Namshi   : sku  -> /<region>/<sku>.html (region e.g. en-ae, en-sa)
    Full URLs are passed through unchanged.
    """
    if str(pid).startswith("http"):
        return pid
    pid = str(pid).strip()
    if platform == "flipkart":
        return f"https://www.flipkart.com/product/p/itme?pid={pid}"
    if platform == "myntra":
        return f"https://www.myntra.com/{pid}"
    if platform == "nykaa":
        return f"https://www.nykaa.com/product/detail/{pid}"
    if platform == "noon":
        reg = region or "uae-en"
        return f"https://www.noon.com/{reg}/{pid}/p/"
    if platform == "namshi":
        reg = region or "en-ae"
        return f"https://www.namshi.com/{reg}/{pid}.html"
    return pid
