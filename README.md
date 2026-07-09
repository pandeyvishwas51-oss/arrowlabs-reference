> Proprietary and confidential. Full codebase for review only; secrets, database, and history removed. See NOTICE.md.

# ArrowLabs

AI listing-optimization SaaS: give it a product (an ASIN, a marketplace product ID, or a
raw photo), and it produces a best-seller-grade listing for the target marketplace, that is
optimized copy, images, A+ content, and video, all on-brand and self-validated.

This README orients a new engineer in under 30 minutes. Deeper docs are linked at the end.

## The mental model

A request flows through one pipeline of six stages, and every stage is a set of pluggable
modules wired by a registry. Adding a marketplace, a generator, or a validator is a new
module plus one registration; the pipeline never changes.

```
ingest  ->  intelligence  ->  assemble  ->  generate  ->  validate  ->  publish
```

- Ingest: scrape the product (Amazon / Flipkart / Myntra / Noon / Namshi) or accept a raw upload.
- Intelligence: build the Brand File (colors, fonts, voice) and the Node File (keywords,
  best-sellers, insights), which are built once and reused.
- Assemble: merge product + brand + node intelligence into a Listing File, the single
  source of truth handed to generation.
- Generate: listing copy, images (product-locked), A+ modules, and video.
- Validate: a self-critique loop scores each asset and regenerates it on failure before
  anyone sees it (mobile readability, no-dash compliance, brand consistency, vision sanity).
- Publish: SP-API push or export.

## Where things live

- `src/core` — the engine. Framework-free, dependency-inward, unit-testable.
  - `contracts/` — the stage interfaces and domain types (the stable seams).
  - `registry/` — the generic registry and one typed registry per stage.
  - `pipeline/orchestrator.ts` — the thin stage-walker + validate-and-regenerate loop.
  - `modules/platforms/` — per-marketplace specs and IDQ rules, as data (sourced, see RESEARCH.md).
  - `idq/` — the IDQ scorer and the listing-quality rubric (the fitness function).
  - `intelligence/` — the agentic listing optimizer and best-seller keyword mining.
- `src/lib/engine` — the composition root: adapters that wrap the existing AI and scraper
  code (`@/lib/ai`, `@/lib/scraper`, `@/lib/keywords`) behind the engine's ports.
- `src/app/api` — HTTP routes. `orchestrate-v2` runs the engine (flag-gated by `ENGINE_V2`).
- `src/lib` — the existing platform libraries (being folded into clean layering over time).

## The two ideas that make it scalable

1. Registry-driven modules: the orchestrator only talks to registries, so features slot in
   without touching it.
2. Ports and adapters: engine modules depend on small service interfaces (`AiText`,
   `AiVision`, `BrandStore`, `KeywordProvider`), so providers are swappable and everything
   is testable with fakes. Services that are absent degrade gracefully, never block.

## Run it

```
npm run typecheck     # zero type errors
npm run smoke:engine  # 19-check runtime test (resilience, intelligence, optimizer)
npm run verify        # both of the above, the one-command gate
npx next build        # production build
```

To try the v2 engine end to end, set `ENGINE_V2=1` and POST an ASIN to
`/api/orchestrate-v2`, or open `/generate` and type a plain request. Build a brand's DNA at
`/brand`. The live studio still runs the v1 path until the flag is flipped.

## Deeper docs

- Architecture blueprint: [ARCHITECTURE.md](ARCHITECTURE.md)
- Data model (Postgres target): [DATA_MODEL.md](DATA_MODEL.md)
- Marketplace rules and sources: `.arrowlabs-loop/RESEARCH.md`
- Free keyword/volume strategy vs Helium: [INTELLIGENCE_SOURCES.md](INTELLIGENCE_SOURCES.md)
- Meeting requirements coverage: [REQUIREMENTS_COVERAGE.md](REQUIREMENTS_COVERAGE.md)
- The autonomous transformation log: `.arrowlabs-loop/` (AUDIT, STANDARDS, BACKLOG, DECISIONS).
