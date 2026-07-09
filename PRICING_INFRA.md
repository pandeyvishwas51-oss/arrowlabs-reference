# ArrowLabs - Pricing & Infrastructure

> Working estimates as of Jul 2026. Exact numbers depend on your Azure AI Foundry
> contract (S0 vs higher tiers), Sora-2 rate, and residential-proxy vendor. Treat
> the per-unit costs as ranges, not invoices.

---

## 1. What one request produces

**One "Generate" = one SKU = one background campaign.** The standard kit:

| Deliverable | Default | Max per campaign |
|---|---|---|
| Main image | 1 | 1 |
| Lifestyle | 2 | 4 |
| Infographics | 2 | 4 |
| Dimension / size | 1 | 2 |
| Detail / macro shots | 2 | 4 |
| Product photos | 1 | 6 |
| **A+ modules** | **7** | 7 |
| **Product video** | **1** | 2 |
| Listing (title, 5 bullets, 5 features, description) | yes | - |
| Keywords, Brand DNA, ad angles | yes | - |

**Default kit = 9 images + 7 A+ + 1 video + full listing.**
Paste multiple ASINs (or upload the bulk Excel) to run many SKUs as parallel jobs.

---

## 2. Cost per SKU (standard kit)

| Item | Unit cost (est.) | Per SKU |
|---|---|---|
| Scraping (own curl_cffi service) | compute only | ~$0 |
| Residential proxy data (if used) | ~$3-8 / GB | ~$0.003-0.02 |
| Images - gpt-image-2 (high) | ~$0.03-0.06 / image | 16 imgs -> **~$0.70-1.00** |
| **Video - Sora-2 (12s)** | ~$1.5-4 / clip | **~$1.50-4.00** |
| Text - Claude Opus 4.8 (listing, keywords, brand DNA, angles, creative director) | ~5-8 calls | ~$0.10-0.15 |
| Voiceover - TTS (optional) | - | ~$0.01 |
| Image/video hosting + storage | ~$0.02 / GB / mo | fractions of a cent |
| **Total per SKU (with video)** | | **~$2.30-5.00** |
| **Total per SKU (no video)** | | **~$0.85-1.15** |

> **Video is 60-80% of the cost.** Turn off the video lab to cut per-SKU cost to under ~$1.

Platform (Amazon / Flipkart / Myntra / Noon / Namshi) does **not** change cost - only
the guidelines/sizes change; the generation work is the same.

---

## 2a. Cost by unit (building blocks)

| Unit | Qty (standard) | Unit cost | Notes |
|---|---|---|---|
| Scraping | 1 | ~$0 | own scraper (compute only) |
| Listing **content** (title, 5 bullets, 5 features, description, keywords, Brand DNA, ad angles) | 1 | **~$0.10-0.15** | all the Opus text calls together |
| **Product image** | 9 | ~$0.03-0.06 each | main + lifestyle + infographic + dimension + detail + product photo |
| **A+ image** | 7 | ~$0.03-0.06 each | same gpt-image-2 cost as any image |
| **Video** (Sora-2, 12s) | 1 | **~$1.50-4.00** | the single biggest line item |

Midpoint used below: image/A+ = **$0.045 each**, content = **$0.12**, video = **$2.50**.

---

## 2b. Bundle breakdown (per SKU)

| Bundle | Content | 9 images | 7 A+ | Video | **Cost range** | **≈ midpoint** |
|---|---|---|---|---|---|---|
| **Images + Content** | ✅ | ✅ | - | - | ~$0.40-0.70 | **~$0.53** |
| **Images + Content + A+** | ✅ | ✅ | ✅ | - | ~$0.60-1.10 | **~$0.85** |
| **Images + Content + A+ + Video** (full kit) | ✅ | ✅ | ✅ | ✅ | ~$2.30-5.00 | **~$3.35** |

**How the full kit adds up (midpoint):**
- Content: $0.12
- 9 images x $0.045 = $0.41
- 7 A+ x $0.045 = $0.32
- Video: $2.50
- Scraping + hosting: ~$0.02
- **= ~$3.35 per SKU**

> The video alone is ~$2.50 of that ~$3.35 (~75%). Drop the video and a full
> images + content + A+ SKU is **~$0.85**.

### Suggested sell price (illustrative, ~3-5x cost)
| Bundle | Cost | Sell (3x) | Sell (5x) |
|---|---|---|---|
| Images + Content | ~$0.53 | ~$1.6 | ~$2.7 |
| Images + Content + A+ | ~$0.85 | ~$2.6 | ~$4.3 |
| Full kit (+ video) | ~$3.35 | ~$10 | ~$17 |

(Set your own margin; these are just markup examples.)

---

## 3. Time per SKU

| Phase | Time |
|---|---|
| Analyze (scrape + listing + keywords + brand DNA + ad angles + creative director) | ~1-2 min |
| Images (16, pooled 4-wide, image-to-image ~20-40s each) | ~4-8 min |
| Video (Sora-2 render) | ~2-5 min |
| **Total per SKU** | **~7-13 min** |

Runs server-side in the background - safe to leave the page and come back; progress
persists and resumes.

---

## 4. Rate limits & throughput (the real constraint)

- gpt-image-2 runs on Azure **AIServices S0 tier** - a low per-minute call limit, per resource.
- We rotate a **pool of 4 gpt-image-2 resources** and **retry with backoff on 429**
  (wait out the per-minute window, up to ~6 rounds), so a campaign **never fails**
  on rate limits - it just paces itself.

**Throughput today (S0 x 4 resources):** roughly 4 images every ~10-15s under load.
- 16-image SKU: ~4-8 min.
- 20-SKU bulk: completes, but queues through the limit (slower).

### To go faster (levers - billing/infra, your decision)
1. **Upgrade the Azure gpt-image-2 tier** (S0 -> higher RPM). Biggest speedup, removes 429s.
2. **Add more pooled resources** (env `AZURE_IMAGE_ENDPOINT_2.._N`) - more parallel headroom.
3. **Upgrade the Sora-2 tier** to shorten video wait / allow parallel video jobs.

---

## 5. Bulk capacity

| Mode | Capacity | How |
|---|---|---|
| ASIN paste | ~10-25 ASINs / batch (practical) | comma/space/newline separated -> one background job each |
| Excel template | up to **30 rows** / upload | download template -> fill (SKU, brand, title, desc, bullets, features, L/W/H) -> upload with images |

Cost scales linearly (~$2-5/SKU with video). A 20-SKU bulk with video ≈ **$40-100**.
Higher volume = upgrade the Azure/Sora tier so it isn't rate-paced.

---

## 6. Infrastructure

| Component | What | Cost (est.) |
|---|---|---|
| App server | GCE VM `arrowlabs` (e2-standard-2, asia-south1), Next.js standalone + Caddy (HTTPS) | ~$50-70 / mo |
| Scraper service | Python (curl_cffi + Playwright) on the same VM, systemd `arrowlabs-scraper` | included |
| DB | SQLite + WAL on the VM disk (move to Cloud SQL Postgres at scale) | included / ~$10-25 mo at scale |
| Media storage | `/srv/arrowlabs/media` on VM, served by Caddy (swap to S3/R2/Azure Blob at scale) | ~$0.02/GB/mo + egress |
| Text model | Azure Foundry - Claude Opus 4.8 | pay per call (sec. 2) |
| Image model | Azure Foundry - gpt-image-2 x 4 pooled resources | pay per image + tier |
| Video model | Azure Foundry - Sora-2 | pay per clip |
| TTS | Azure gpt-4o-mini-tts | pay per call |

### Scraping IP strategy
- **Amazon** scrapes fine from the VM most of the time; some ASINs get served a
  bot-lite page from datacenter IPs.
- **Flipkart / Myntra / Noon / Namshi** are bot-walled on datacenter IPs.
- **Fix:** route scraping through a **residential IP**. Two options:
  1. **Residential proxy service** (recommended for production) - add proxies to
     `scraper-service/proxies.txt`. Cost ~$3-8/GB or ~$50-200/mo for a pool.
  2. **Residential tunnel** (demo) - `npm run demo:scraper` runs the scraper on a
     residential machine + cloudflared tunnel and points the site at it. Free, but
     needs that machine + terminal open.
- **GCC (Noon/Namshi)** additionally need a **GCC-region** residential IP.

---

## 7. Cost-control switches

- **No video** -> ~$0.85/SKU (drops the biggest cost).
- **Generate only what you need** - Listing / A+ / Images / Video are independent
  toggles, so you never pay for assets you don't want.
- **Regenerate** only the specific asset you dislike (with a comment) instead of
  re-running the whole SKU.
- **Trial** meters usage as free (charged: 0) so demos don't burn credits.

---

## 8. MCP (connect Claude / ChatGPT)

No extra infra - the MCP server is a route on the app (`/api/mcp/<api-key>`).
Users connect their own AI; tool calls run on the same pipeline and are metered to
their wallet exactly like the web app. See **Account -> API keys & AI connectors**.
