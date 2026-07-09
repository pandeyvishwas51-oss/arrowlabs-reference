# BACKLOG.md — ordered by value and risk

Status: TODO / DOING / DONE / BLOCKED

## DONE (v2 engine foundation — committed e344371)
- [DONE] Modular engine: contracts, registry, orchestrator, validate-and-regenerate loop.
- [DONE] Per-marketplace specs + IDQ (Amazon/Flipkart/Myntra/Noon/Namshi), 2026-sourced.
- [DONE] Listing-quality rubric + agentic optimizer (marketplace-aware, self-improving).
- [DONE] Free keyword enrichment (Google Suggest + autocomplete), BSR sales estimator,
  best-seller keyword mining.
- [DONE] Brand DNA builder + /brand panel; flag-gated /api/orchestrate-v2; /generate prompt box.
- [DONE] One-command verify (typecheck + 19-check smoke); clean production build.

## TODO (highest value first)
1. [DONE] Verify Namshi exact specs (Researcher subagent). ChannelEngine-confirmed ratio
   0.73/JPEG/EAN/bilingual + noon-proxy bg/model/title applied to noon.ts + namshi.ts. R-001, R-003.
2. [DOING] Repo hygiene. [DONE] inventory + archived 4 dead files to misc/, untracked junk
   tarball. Remaining sub-items:
   2a. [TODO] Asset consolidation into public/assets/{ui,images,marketing,video,data} +
       update hard-coded paths + rename 2 colliding asset names. Build-gated (touches site).
   2b. [TODO] Archive orphaned one-off scripts (gen_*.mjs, parse_*.py, prep_showcase.sh) to
       misc/ with provenance notes.
   2c. [TODO] Decide shadcn ui/ primitive trim (bundle size) — deliberate, not hygiene.
3. [TODO] Decompose god file `src/lib/orchestrator/index.ts` (~1023 lines) toward the v2
   engine, or wrap it; remove duplicated logic now living in `src/core`.
4. [TODO] Decompose god file `src/app/studio/page.tsx` (~1221 lines) into step components.
5. [DONE] Best-seller intelligence: BestSellerProvider port + node builder integration
   (demand estimate from BSR + mined winning keywords), adapter reusing the existing
   scraper-service /search (no duplicate endpoint). Follow-ups:
   5a. [TODO] BSR-per-product enrichment (individual product fetches) for real sales estimates.
   5b. [TODO] Marketplace-native best-sellers for Flipkart/Myntra (currently Amazon proxy).
6. [TODO] Amazon Brand Analytics (SP-API) keyword provider for REAL free search volume.
7. [DONE] README rewrite explaining the architecture (30-min newcomer test). -> README.md
8. [TODO] Lint clean pass across `src/core` + `src/lib/engine`; add eslint to `verify`.
9. [TODO] Establish `src/lib` layering (api/domain/services/data) incrementally.

## BLOCKED / needs external
- [BLOCKED] Phase 0 infra (Postgres/queue/object storage/proxies): needs infra provisioning
  decisions + live DB migration. Schema ready at prisma/schema.v2.prisma. Plan, do not
  provision blind. (Irreversible/destructive class -> flagged, not auto-executed.)
- [BLOCKED] Studio cutover to v2 (flip ENGINE_V2 + point UI): touches live demo; do behind
  flag, one route at a time, after the god-file decomposition.
