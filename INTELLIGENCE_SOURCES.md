# Intelligence Sources: how close to Helium 10 can we get for free

Straight answer first, then the evidence and the plan.

## The honest verdict

We cannot get Amazon's exact, market-wide search VOLUME for free by scraping, because
that number does not exist on any public page. Helium 10 and Jungle Scout do not scrape
it either; they estimate it from Amazon Brand Analytics data plus their own large buyer
panels. What we CAN do is two things that cover most of the practical value:

1. Build strong FREE proxies from data that is public or that we already scrape.
2. Plug in the REAL numbers from Amazon Brand Analytics, which your brands already have
   for free through Brand Registry. That is the same well Helium drinks from.

So the realistic target is: free proxies now, real brand-owned volume next, and a paid
tool only if you want whole-market data beyond your own catalog.

## What Helium actually sells, and where it comes from

Helium's headline numbers are search volume per keyword, estimated monthly sales per
product, and keyword rank tracking. Search volume is derived largely from Amazon Brand
Analytics (the Search Query Performance and Brand Analytics search-frequency-rank
reports). Sales estimates are BSR run through category-specific rank-to-sales curves,
calibrated against a panel of known sales. Rank tracking is repeated scraping of search
results. Only the first genuinely needs privileged data.

## What we can get FREE right now (verified)

- Keyword universe and popularity ordering, from Google Suggest. Verified live: one seed
  ("bedsheet king size") across six modifiers returned 57 unique real keywords, which we
  score 0 to 100 by how often and how early each surfaces. This is wired in
  `src/lib/engine/adapters/keywords.ts`. It is a popularity PROXY, not absolute volume,
  and it is honest about that.
- Amazon autocomplete and related searches, richest through the residential path we
  already run.
- Estimated monthly sales from BSR, which we already scrape. This is exactly Helium's
  sales method, done free, in `src/core/intelligence/demand.ts` (rank-to-sales power law plus a
  0 to 100 demand score). It is an estimate and says so; one ground-truth point per
  category sharpens it a lot.
- Review count and, across two scrapes over time, review velocity, which is a solid
  demand and momentum signal.
- Best-seller structure of a category node (titles, prices, BSR, badges), from scraping
  the best-seller pages, which then feeds the sales estimator per competitor.

## What is FREE but needs the brand's own access (the real prize)

- Amazon Brand Analytics, Search Query Performance and the search-frequency-rank report.
  This is the closest thing to Helium's search volume, it is REAL Amazon data, and it is
  free for a Brand Registry brand on its own catalog. Hamleys, Hasbro, and Belkin qualify.
  Pulled via SP-API reports or exported from Seller Central. This is the single highest-
  value source and it costs nothing but the brand's credentials.
- Amazon PI, if the brand has it (Belkin does via Sheshta), gives search-term data too.

## What is genuinely paid only

- Whole-market search volume for keywords across every seller, not just your catalog.
  That is Helium's and Jungle Scout's proprietary panel data. Buy it only if you need to
  research categories you do not sell in.
- Keepa, for deep historical BSR and price. Cheap, not free, and only needed for history.

## How much richer we can make it: the composite demand score

Instead of one fake "volume" number, we compute an honest composite per keyword and per
product, blending the free signals:

- keyword popularity proxy (Google Suggest frequency and rank), 0 to 100
- BSR-derived demand score for the products ranking on that keyword, 0 to 100
- review count and velocity of those products
- buyer intent (transactional, commercial, informational), which we already classify

Ranked by that composite, the keyword list is genuinely useful for deciding what goes in
the title and bullets, which was the whole point in the meeting. When the brand connects
Brand Analytics, the real search-frequency rank drops into the `volume` field and the
composite becomes the tiebreaker rather than the headline. No engine change needed, because
the keyword provider is a pluggable port.

## Recommendation

1. Ship the free composite now (keyword proxy plus BSR sales estimate). Mostly done.
2. Add a Brand Analytics provider that reads the brand's own Search Query Performance via
   SP-API. Free, real, and the biggest single upgrade. Needs the brand's Seller Central
   connection, which the SP-API push scaffold already anticipates.
3. Treat Helium or PI as an optional paid add-on for out-of-catalog market research only.

## Where this lives in code

- Free keyword composite: `src/lib/engine/adapters/keywords.ts`
- BSR to sales and demand score: `src/core/intelligence/demand.ts`
- Keyword and best-seller slots on the Node File: `src/core/contracts/domain.ts`
- The provider is a port, so a Brand Analytics or Helium adapter is a drop-in later.
