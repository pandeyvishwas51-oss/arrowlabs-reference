# RESEARCH.md — findings with sources

## R-001: Marketplace listing rules (2026)

### Amazon (IN + US)
- Title up to 200 chars general (150 apparel/jewelry); mobile shows ~70-80; forbidden
  chars ! $ ? _ { } ^ ¬ ¦; no promo words. Enforced since 21 Jan 2025.
- Bullets up to 255-500 chars each, but only first ~1000 bytes across all five indexed.
- Backend search terms in BYTES: 249 US/UK/EU, **200 India**, 500 Japan; no commas; no
  repeats of title/bullets; add synonyms and misspellings. Over-limit silently de-indexes.
- Description 2000 chars plain text. A+ 5 modules standard, 7 premium. Image text not indexed.
- Sources: keywords.am/blog/amazon-character-limits, listing-forge.com/blog/amazon-backend-keywords,
  amalytix.com/en/knowledge/seo/amazon-product-title, sellercentral.amazon.com (Jan 2025 title policy).

### Flipkart
- Title is attribute-driven (brand + product type + attributes), not free text; front-load.
- Images 1:1, min 500x500, recommended 1000x1000+, product ~90% of frame, white bg, up to 13.
- Description ~1000 chars; must match images (mismatch is the top rejection reason).
- Backend keywords: only 3 words, no brand name.
- Sources: loharstudio.com/blog/flipkart-listing-guidelines, arvian.in/blog/flipkart-product-listing-guidelines.

### Myntra
- Images strict 3:4 portrait, min 1080x1440 (rec 1500x2000), pure white bg, JPEG 500KB-1MB,
  5-7 images, real gender-matched full-length MODEL (flat lays rejected).
- Title must NOT contain brand name, extra keywords, or special chars; state fit/fabric/
  pattern/sleeve/category. Fabric composition + care mandatory.
- Sources: ecom-hub.in/learn/myntra-catalog-requirements-2026, kraftr.studio, documentation.fynd.com (Myntra).

### Noon
- Images JPG/JPEG, aspect ratio 0.73 (portrait ~3:4); pure white bg all categories except
  fashion (light grey); min 3 images from angles; main image high-res product shot.
- Title keyword-heavy, Title Case; rich feature-led description. UAE/KSA (Arabic + English).
- Sources: helpcenter.noon.partners (content guidelines), support.noon.partners (picture requirements).

### Namshi (verified 2026-07-09 by Researcher subagent)
- Namshi-CONFIRMED (ChannelEngine Namshi guide): main image aspect ratio 0.73 (portrait),
  JPEG format, EAN mandatory (empty EAN fails export), bilingual title (Product title +
  Product title ar), 2/3-level parent-child structure.
- noon-parent PROXY (same platform, owned by noon; strong but not Namshi-branded): white
  bg except fashion (light grey); apparel shot on a real model except swimwear/underwear;
  min 1000px longest side; product fills 70-80% of frame; title 5-200 chars, Title Case,
  no special characters (@ ^ * # &).
- COULD NOT verify Namshi-specifically: exact pixel min/max, max file size, exact image
  count for fashion, description length. Confidence: image ratio/JPEG/EAN/bilingual HIGH;
  bg/model/title MEDIUM (noon proxy). Authoritative source = Namshi Seller Lab post-onboarding.
- Sources: support.channelengine.com/hc/en-us/articles/24568693376669-Namshi-marketplace-guide;
  support.noon.partners (picture + title requirements, home-category content guidelines).
- Applied to `noon.ts` + `namshi.ts` (2026-07-09). Namshi no longer flagged unverified for
  the confirmed fields.

## R-003: Amazon ranking + Brand Analytics (verified 2026-07-09 by Researcher subagent)
- "A9" is Amazon's real algorithm; "A10" is community/SEO terminology, not Amazon-confirmed.
- Ranking = relevance x conversion/performance. Top signals: conversion rate (highest),
  sales velocity, CTR, review quality/volume, return rate, availability, seller health;
  FBA advantage; external traffic now rewarded (~15-20%, unofficial).
- COSMO/Rufus = semantic intent graph; reduces keyword-density value, penalizes stuffing.
- Field weight: title > bullets > backend terms. Description + A+ NOT indexed for search;
  A+ lifts conversion (basic ~+8%, Premium up to ~+20%), which indirectly helps ranking.
- Backend terms: 249 bytes (US), no repeats/competitor brands/punctuation, use synonyms +
  misspellings; commas ignored, separate with spaces.
- Brand Analytics Search Query Performance: FREE to Brand-Registry brands (Brand Rep role),
  full-funnel (impressions->clicks->cart->purchase) for top ~1000 queries, Search Query
  Score (importance rank, not volume) + Search Query Volume (approx real counts, organic +
  sponsored combined), brand + ASIN views, weekly/monthly/quarterly, CSV export. Classic
  Search Frequency Rank is the separate Top Search Terms report.
- CONCLUSION: this confirms ADR-005. The SP-API Brand Analytics provider (BACKLOG #6) is
  the highest-value REAL free volume source; Helium/PI only for out-of-catalog research.
- Sources: sell.amazon.com/blog/brand-analytics; kapoq.com/search-query-performance-report-explained;
  myrealprofit.com/blog/amazon-search-query-performance-report-guide; sellerapp.com/blog/amazon-backend-keywords-guide;
  feedvisor.com/university/a9-search-engine; novadata.io/resources/blog/listing-optimization;
  sellersprite.com/en/blog/Amazon-SEO-How-the-A10-Algorithm-Works-in-2026.

## R-002: Helium-parity for free (see INTELLIGENCE_SOURCES.md for full write-up)
- Exact market-wide search volume is not scrapeable; Helium derives it from Amazon Brand
  Analytics + private panels.
- FREE proxies that work (verified live): Google Suggest returned 57 scored keywords from
  one seed across 6 modifiers; Amazon autocomplete; BSR-to-sales estimate; review velocity.
- The real free source is the brand's own Amazon Brand Analytics (Brand Registry). SP-API
  provider is the highest-value next build.
