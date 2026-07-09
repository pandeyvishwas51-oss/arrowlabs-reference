# STANDARDS.md — target conventions (single source of truth)

The bar: a senior reviewer sees no sign the code was ever vibe-coded.

## (a) Architecture and structure

- Layering: HTTP (`src/app/api`) -> engine (`src/core`) -> adapters (`src/lib/engine`)
  -> platform libs (`src/lib/*`). Dependencies point inward. `src/core` imports nothing
  from `src/lib` or `src/app` (proven: it is framework-free and tsx-runnable).
- Single responsibility. No file over ~400 lines; god files get decomposed.
- No circular deps. Modules register through the registry; the pipeline never imports a
  concrete module.
- Consistent folder layout: contracts / registry / pipeline / modules / intelligence / idq.

## (b) Scalability for SaaS

- Statelessness in request handlers; heavy work runs as background jobs.
- Config and secrets via env only; never hard-coded. Multi-tenant: every row scoped by org.
- Idempotency keys on jobs; retries safe. Pagination on list endpoints. Rate limits on
  mutating routes. Caching where it pays (intelligence files, keyword lookups).
- Target data layer: Postgres (schema at `prisma/schema.v2.prisma`), durable queue,
  object storage + CDN. (Phase 0 infra item.)

## (c) Tests and reliability

- Real tests on critical paths. One-command run: `npm run verify` (typecheck + smoke).
- Typed, handled errors; no unhandled throws in the pipeline (validators/generators are
  wrapped so one failure never fails a campaign).
- Structured logging via the injected `Logger`; no raw console in engine modules.
- Graceful degradation: a missing service (vision, keyword volume) degrades, never blocks.

## (d) Code quality and consistency

- Types everywhere; `any` only at true boundaries with a comment.
- Zero dead code, no commented-out blocks. Small focused functions.
- Docs on public interfaces (every contract file has a header explaining its role).
- No em dashes or en dashes anywhere (product hard rule; enforced by a validator).
- README explains the architecture; a newcomer understands it in under 30 minutes.

## Asset hygiene

- Non-code assets consolidated under `assets/` (ui, images, marketing, video). No stray
  media in the source tree. Unused/duplicate/orphaned files archived to `misc/` with a
  CLEANUP.md entry before deletion.
