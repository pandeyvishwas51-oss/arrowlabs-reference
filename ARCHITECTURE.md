# ArrowLabs — Target Architecture (v2 foundation)

> Written from the Hamleys/Hasbro review meeting feedback (Vijay + Umar) + a read of
> the current codebase. This is the blueprint for turning the v1 demo (working, but
> vibe-coded and single-node) into a modular, scalable SaaS where **new features slot
> in without rewriting the pipeline**.
>
> Guiding rule from the meeting: **perfect each block for Cortina Curtains first.**
> Foundation before breadth. Modular so depth/brands are cheap to add later.

---

## 1. What the meeting actually asked for (problem inventory)

Distilled from the transcript, grouped so each maps to an architecture decision below.

### A. Quality / correctness (the loudest feedback)
1. **Self-validation loop.** The tool must catch its own mistakes *before* showing them
   (coffee mug on a book, wrong props, typos, gibberish text on video). "You should not
   have to tell it the image doesn't make sense." → **Generation → Validation loop.**
2. **Mobile-first images.** 90–95% of traffic is mobile; images are currently optimized
   for desktop (too verbose). Short impactful callouts ("Soft & Breathable"), readable on
   a phone. → **Platform spec includes a mobile-readability contract + validator.**
3. **Brand consistency.** Logo has 2–3 versions; fonts inconsistent; existing vs new
   catalog must look like the same brand. → **Brand Intelligence layer with logo/colors/
   fonts as first-class inputs.**
4. **IDQ must match Amazon's real IDQ.** We'll be held accountable for the number.
   Verify against a real ASIN (brand manager / Amazon PI / SBS); ideally pull from an API.
   → **IDQ becomes a pluggable scorer with a "source of truth" verification mode.**
5. **Typos / brand language.** Brand managers must validate that copy speaks the brand's
   language. → **Brand voice is part of the Brand File; validation checks against it.**

### B. Data / intelligence quality
6. **Real keyword volume.** Scraped metadata keywords aren't enough — need volume-ranked
   keywords by category/subcategory (Helium 10 or Amazon PI search-terms). → **Keyword
   provider abstraction** (scrape today, Helium/PI adapters tomorrow).
7. **Best-sellers, not individual competitors.** Scrape the category best-seller node for
   the strongest trends/keywords/conversion signals. → **Best-seller ingestion source.**

### C. Architecture / process (Vijay's core point)
8. **Decouple the workflow into independent stages**, each solvable on its own.
9. **A "Brand/Category Intelligence File" generated ONCE per subcategory node**, refreshed
   ~quarterly, and reused by every listing in that node — don't re-scrape everything per
   ASIN. This is the biggest structural change.
10. **A "Listing File" per ASIN** = the single source of truth handed to generation.
11. **Externalize the product.** Today it's built with Driti as the user. A brand's own
    seller must be able to use it — idiot-proof, end-user-ready, multi-tenant. The MCP-style
    "generate content for X" text box should live *in the tool*, not only in Claude.
12. **Feedback mechanism** — a clean loop for a user to comment and regenerate (partly
    built via regenerate-with-comment; needs to be first-class and captured for learning).

### D. Scale / reliability
13. **Not vibe-coded.** Must survive real concurrency without falling over.
14. **Modular** — adding a feature (banner, pricing, perf-marketing) shouldn't require
    rewriting existing code.

### E. Roadmap (their versioning)
- **v1A** — content + images + A+ + video (current). *Get this perfect for Cortina.*
- **v1B** — push listings to Seller Central (SP-API).
- **v2** — marketing video + banners.
- **v3** — performance marketing, pricing, catalog management (the "ecosystem").

---

## 2. Current state (honest read)

| Area | Today | Problem at scale |
|---|---|---|
| App | Next.js 16 standalone on **one GCE VM** | no horizontal scale; a spike blocks everyone |
| DB | **SQLite + WAL** on VM disk | single-writer; corrupts/locks under concurrency; no HA |
| Jobs | `startOrchestration` runs **in-process, detached** | dies with the process; no retry; no backpressure |
| Media | local disk served by Caddy | not durable; not CDN'd; lost if VM dies |
| Scraping | one **ephemeral residential tunnel** (this Mac) | single point of failure (this is what broke the demo) |
| Orchestration | `orchestrator/index.ts` (1023 lines) does scrape→listing→images→A+→video→progress | one file = every change risks everything; no validation stage |
| UI | `studio/page.tsx` (1221 lines) holds all state + all steps | built for one internal user; hard to re-skin per tenant |
| Good bones already | `platforms/`, `idq/`, `intelligence/`, `spapi/`, `brand.ts`, `creative/`, `keywords/` | these become the seams we build modules around |

**Verdict:** the domain logic is mostly there; it's the *boundaries*, the *job/data infra*,
and the *validation stage* that are missing. We refactor around the existing seams — we do
not throw it away.

---

## 3. Target architecture — a staged pipeline of pluggable modules

The whole system becomes **one pipeline of stages**, each stage a set of **modules behind a
stable interface**, wired by a **registry**. Adding a feature = write a module + register it.
No stage rewrites the next.

```
                          ┌─────────────────────────── control plane ───────────────────────────┐
                          │  Auth / Tenancy · Credits & Metering · Job Queue · Observability      │
                          └──────────────────────────────────────────────────────────────────────┘

 INGESTION            INTELLIGENCE                 SOURCE OF TRUTH        GENERATION            VALIDATION           PUBLISH
 (per request)        (per node, cached)           (per ASIN)            (per asset)           (per asset)          (per listing)

 ┌───────────┐        ┌──────────────────┐         ┌──────────────┐      ┌────────────┐        ┌────────────┐       ┌────────────┐
 │ Scrapers  │        │  Brand File      │         │ Listing File │      │ Generators │        │ Validators │       │ Publishers │
 │ (Amazon,  │──────▶ │  (logo,colors,   │────────▶│ = product    │────▶ │ (copy,     │──────▶ │ (vision,   │──────▶│ (SP-API,   │
 │  Flipkart,│        │   fonts, voice)  │         │   + brand    │      │  images,   │  fail  │  typo,     │  pass │  export,   │
 │  Myntra,  │        │  Category/Node   │         │   + node     │      │  A+, video,│ ◀────  │  brand,    │       │  webhook)  │
 │  reviews, │        │  File (keywords  │         │   intel)     │      │  banner)   │ regen  │  mobile,   │       │            │
 │  best-    │        │   +volume, best- │         │  = the ONLY  │      │  each a    │        │  IDQ)      │       │            │
 │  sellers) │        │   sellers, DNA,  │         │  thing gen   │      │  registered│        │  each a    │       │            │
 └───────────┘        │   pain/love)     │         │  reads       │      │  module    │        │  registered│       └────────────┘
   provider           │  cached, refresh │         └──────────────┘      └────────────┘        │  module    │
   registry           │  ~quarterly      │                                                     └────────────┘
                      └──────────────────┘
```

### 3.1 Stage contracts (the interfaces that make it modular)

Every module implements a tiny interface and self-registers. The pipeline only knows the
interface, never the concrete module — that's what kills the "rewrite everything" problem.

```ts
// Ingestion
interface ScrapeProvider {
  id: string;                       // 'amazon', 'flipkart', 'best_sellers', 'reviews'
  supports(source: SourceRef): boolean;
  fetch(source: SourceRef, ctx: Ctx): Promise<RawScrape>;
}

// Intelligence (produces the cached files)
interface IntelligenceBuilder {
  id: string;                       // 'brand', 'category_node', 'keywords', 'reviews'
  build(input, ctx): Promise<IntelSection>;   // merged into Brand/Node file
}

// Generation
interface Generator {
  id: string;                       // 'listing', 'image.hero', 'image.lifestyle', 'aplus', 'video', 'banner'
  kind: AssetKind;
  generate(listing: ListingFile, platform: PlatformSpec, ctx): Promise<Asset>;
}

// Validation (the self-critique loop)
interface Validator {
  id: string;                       // 'vision.sanity', 'text.typo', 'brand.consistency', 'mobile.readability', 'idq'
  appliesTo(kind: AssetKind): boolean;
  check(asset: Asset, listing: ListingFile, platform: PlatformSpec, ctx): Promise<Verdict>;
  // Verdict: { pass: boolean, score?: number, issues: Issue[], hint?: string }
}

// Publish
interface Publisher {
  id: string;                       // 'spapi', 'zip', 'csv', 'webhook'
  publish(listing: ListingFile, assets: Asset[], ctx): Promise<PublishResult>;
}

// Platform spec (Amazon/Flipkart/Myntra/Noon) — data, not code
interface PlatformSpec {
  id: string;
  image: { aspect: string; minPx: number; textDensity: 'low'|'med' };  // mobile-first defaults
  title: { max: number };
  bullets: { count: number; max: number };
  aplus: { modules: number };
  idqRules: IdqRule[];
}
```

**Registries** (`src/lib/registry/*`): `scrapers`, `intelligence`, `generators`,
`validators`, `publishers`, `platforms`. Each module file calls `register(...)` at import.
The orchestrator becomes ~100 lines that just walks the stages and asks the registries
what applies. This is the single most important change.

### 3.2 The two cached files (Vijay's "generate once, reuse")

**Brand File** — one per brand, keyed `brandId`. Refreshed on demand / quarterly.
```
{ brandId, name,
  identity: { logoUrl (uploaded input), colors:{primary,secondary,accent}, fonts:{display,body}, voice },
  compliance: { forbidden: ["em-dash", ...], toneRules },
  updatedAt }
```
Logo/colors/fonts are **inputs** (uploaded by brand manager), not guessed. This kills the
"3 logo versions / inconsistent fonts" problem and makes existing+new catalog consistent.

**Category/Node File** — one per marketplace category node, keyed `platform:nodeId`.
Refreshed ~quarterly.
```
{ node, platform,
  keywords: [{term, volume, intent, source}],   // volume from Helium/PI provider
  bestSellers: [{asin, title, price, signals}],  // trends/conversion cues
  dna: { painPoints[], customerLove[], improvementOps[] },  // aggregated across node
  updatedAt }
```
A new ASIN in a known node **skips re-scraping the node** — it just references this file.
This is the scale + cost win and the "break into stages" Vijay drew on the whiteboard.

**Listing File** — per ASIN, the source of truth handed to every generator:
```
{ asin, brandId, node, platform,
  product: { title, bullets, features, dims, images[], price },   // from scrape
  brand: <Brand File snapshot>,
  intel: <Node File snapshot slice>,
  overrides: { userComments[] } }                                 // feedback loop input
```
Generators read **only** the Listing File — so improving a generator never touches ingestion.

### 3.3 The validation loop (the #1 quality ask)

Every generated asset runs through the validators that apply to its kind. On fail, the
generator is re-invoked with the validator's `hint` appended, up to N times, **before the
user ever sees it**.

```
generate(asset) → run validators → all pass? ─yes→ persist + surface
                                      │no
                                      └→ append hints → regenerate (≤3) → re-validate
                                                                    │ still failing
                                                                    └→ surface w/ flag "needs review"
```

Validators to ship for Cortina first:
- `vision.sanity` — VLM asks "list what's wrong / implausible" (catches mug-on-book, floating product).
- `text.typo` — spell/grammar + brand-term whitelist (catches "micro fider", gibberish).
- `brand.consistency` — logo present & correct, colors within brand palette, font family.
- `mobile.readability` — render at phone width, check contrast + text-area ratio + word count.
- `idq` — score the generated listing; must clear a threshold.
- `compliance.emdash` — hard rule: no em/en dashes in copy or on images.

The loop is itself a module set, so adding a validator later (e.g. "size shown with human
scale reference" for the video feedback) is a one-file add.

---

## 4. Scalability & reliability layer (so it doesn't "blast" at load)

| Concern | Change | Why |
|---|---|---|
| **DB** | SQLite → **Postgres** (Cloud SQL / Neon) | concurrent writers, HA, real indexes, JSONB for files |
| **Jobs** | in-process → **durable queue + workers** (BullMQ+Redis, or Cloud Tasks/pg-boss) | survives restarts, retries, backpressure, parallelism knobs |
| **Workers** | fold generation into **stateless workers** scaled horizontally | image/video fan-out scales independently of the web tier |
| **Media** | local disk → **object storage + CDN** (R2/S3 + Cloudflare) | durable, fast, no VM coupling; solves the MCP jpeg-link need natively |
| **Scraping** | ephemeral tunnel → **residential proxy pool** (`proxies.txt`) as primary, tunnel only for dev | removes the single point of failure that broke the demo |
| **Rate limits** | keep pooled gpt-image-2 + backoff; **queue-level concurrency caps** per model | never fail on 429; pace instead |
| **Multi-tenant** | every row scoped by `orgId`; per-tenant credit metering (already started) | externalization; isolation; billing |
| **Idempotency** | job keys = `campaignId:stage:assetId` | safe retries, resume (already partly done via `Campaign.progress`) |
| **Observability** | structured logs + per-stage timings + failure reasons on the campaign | diagnose without SSHing (this session would've been 1 dashboard glance) |

Design for scale-**ready**, not scale-now: ship Postgres + queue + object storage now
(they're the load-bearing three); horizontal worker autoscaling can wait until real volume.

---

## 5. Externalization (brand-facing, multi-tenant UX)

- **Tenant model:** `Org` (brand/agency) → `Users` → `Brands` → `Campaigns`. Brand File and
  Node File live at the Org/Brand level.
- **In-app "prompt box":** bring the MCP experience *into* the tool — a text field
  "Generate an Amazon listing for ASIN X, images only" that drives the same pipeline. The MCP
  server stays as an *additional* entry point, not the only one.
- **Onboarding a brand = fill the Brand File** (upload logo, pick colors/fonts, set voice) +
  point at category nodes. Then any ASIN in that brand generates on-brand automatically.
- **Re-skinnable studio:** split `studio/page.tsx` into step components driven by a config so a
  brand sees only what their plan includes (Content / Images / A+ / Video / Publish toggles).

---

## 6. Concrete refactor plan (staged, low-risk, Cortina-first)

Each step is independently shippable and reversible. No big-bang rewrite.

**Phase 0 — Infra foundation (unblocks scale, no feature change)**
1. Prisma SQLite → Postgres; move `progress`/files to JSONB.
2. Object storage + CDN for media; generators write there, DB stores URLs.
3. Durable job queue + one worker; move `orchestrate` onto it.
4. Residential proxy pool as primary scrape path; tunnel demoted to dev.

**Phase 1 — Decouple the pipeline (kills the god-files)**
5. Extract stage interfaces + registries (`src/lib/registry/`).
6. Split `orchestrator/index.ts` into stage runners (ingest / intel / generate / validate / publish).
7. Turn existing scrapers, generators into registered modules (mechanical, behavior-preserving).
8. Split `studio/page.tsx` into per-step components + a config-driven stepper.

**Phase 2 — Intelligence files (Vijay's core ask)**
9. Introduce Brand File + Node File models + builders; cache + quarterly refresh.
10. Introduce Listing File as the single generator input; generators stop reading raw scrape.
11. Brand onboarding UI (logo upload, colors, fonts, voice).

**Phase 3 — Validation loop (the #1 quality ask)**
12. Validator interface + the six validators above; wire the regenerate-on-fail loop.
13. Feedback loop first-class: comments captured on the Listing File, replayed on regenerate.

**Phase 4 — Data quality**
14. Keyword provider abstraction; add Helium 10 / Amazon PI adapter (volume-ranked).
15. Best-seller ingestion for the category node.
16. IDQ verification mode — reconcile our score vs Amazon's real IDQ for a known ASIN.

**Phase 5 — Roadmap features (now cheap, because modular)**
17. v1B: SP-API publisher (push to Seller Central).
18. v2: banner generator + marketing video generator (just new Generator modules).
19. v3: pricing / performance-marketing modules.

**Do Phases 0–3 fully on Cortina Curtains before widening to other categories/brands.**

---

## 7. What we explicitly are NOT doing yet

- Not rewriting from scratch — refactoring around existing seams.
- Not building for 10k concurrent on day one — building scale-*ready* (Postgres/queue/storage)
  and leaving autoscaling for real volume.
- Not adding new categories/brands until Cortina is perfect end-to-end and BM-validated.
- Not switching video models — Sora-2 only, per constraint (no Google/Veo).

---

## 8. Open items to confirm (need brand/BM/access, not code)

- Amazon PI access for Hamleys/Hasbro (Belkin has it via Sheshta) — for real search terms.
- Helium 10 subscription tier **with search volume** — current sub may lack it.
- Real Amazon IDQ scores by ASIN from the brand manager — to validate our IDQ algorithm.
- Official brand assets (logo files, color codes, fonts) from the brand manager — Brand File inputs.
</content>
</invoke>
