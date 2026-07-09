# CLEANUP.md — removed/moved files and reasoning

Inventory by the Cleanup/Curator subagent (2026-07-09, read-only, verified by grep;
re-verified by the orchestrator before any move).

## Done — archived to misc/dead-code/ (recoverable via git)
- `src/components/site/logo-strip.tsx` — 0 component imports (superseded on the landing).
- `src/components/site/how-it-works.tsx` — 0 imports; `process.tsx` + `agent-flow.tsx` are live.
- `src/components/site/labs.tsx` — 0 imports (the 22 "labs" hits were the word, not the component).
- `src/lib/ai/gcp.ts` — 0 imports; unwired Google Veo/Imagen, which also violates the
  Sora-2-only constraint. Video is Azure Sora-2 only.
Gate: `npm run typecheck` = 0 errors and smoke green after the moves. `misc/` is excluded
from typecheck but kept tracked in git so nothing is lost.

## Done — untracked junk
- `workspace-*.tar` (9.2 MB) untracked and `*.tar` added to `.gitignore`. `dev.log` was
  already gitignored.

## Verified present, deliberately NOT touched
- `src/lib/engine/demand.ts` — built and documented, not yet consumed at runtime. It is
  the BSR-to-sales utility the best-seller provider (BACKLOG #5) will use. Wire, do not delete.
- 35 unused shadcn `ui/` primitives — standard install artifacts; a bundle-trim decision,
  not hygiene. Left as-is.

## Queued (added to BACKLOG)
- Two parallel orchestration stacks (legacy `lib/orchestrator` + `orchestrate`/`-raw`/`-bulk`
  routes and `lib/mcp/server.ts`, vs v2 `core`+`engine` + `orchestrate-v2`). Both are live;
  retiring the legacy stack after migrating MCP is a migration task, not a delete. (BACKLOG #3.)
- Asset consolidation: `public/generated` (57), `public/marketing` (25), `public/pitch` (19),
  `public/showcase` (18) into a purpose-grouped `public/assets/{ui,images,marketing,video,data}`,
  updating hard-coded paths in `lib/images.ts`, `lib/showcase.ts`, `components/site/*`. Two
  same-name-different-bytes asset collisions to rename. Touches the live site, so do it
  carefully with a build gate. (BACKLOG #2a.)
- Orphaned one-off scripts (`gen_*.mjs`, `parse_*.py`, `extract_text.py`, `prep_showcase.sh`):
  archive to misc/ with a provenance note (they generated committed assets). (BACKLOG #2b.)

Rule: verify truly unreferenced, move to `misc/` first, log here, delete only once confirmed
dead and committed (recoverable via git).
