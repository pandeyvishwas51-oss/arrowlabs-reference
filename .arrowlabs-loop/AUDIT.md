# AUDIT.md — ground truth of the ArrowLabs codebase

Last updated: 2026-07-08. Authored by the orchestrator from direct knowledge gained
building the v2 engine, plus file-size and structure scans. Warts included.

## Stack

- Next.js 16 (App Router, standalone output, Turbopack), TypeScript (strict), Tailwind.
- Prisma + SQLite (WAL) on a single GCE VM. NextAuth. Razorpay. Resend.
- Python scraper microservice (curl_cffi + Playwright, Flask/waitress) on the same VM.
- AI via Azure AI Foundry: Claude Opus 4.8 (text), gpt-image-2 (image), Sora-2 (video), TTS.

## Layout (src)

- `src/app` — App Router pages + `api/*` route handlers (the HTTP layer).
- `src/lib` — mixed domain + services + data + utilities (no clear layering).
- `src/components` — UI (site + app shell + shadcn ui).
- `src/core` — NEW v2 engine (clean, layered, tested). The target pattern.

## The problems (why it reads as vibe-coded)

1. God files. `src/app/studio/page.tsx` ~1221 lines and `src/lib/orchestrator/index.ts`
   ~1023 lines each do far too much (state, steps, persistence, prompts, generation).
2. No layering in `src/lib`. api/domain/services/data are intermixed; imports point in
   all directions. Hard to reason about dependency direction.
3. SQLite single-node. No horizontal scale, single writer, in-process background jobs
   that die with the process, media on local disk, one ephemeral residential tunnel.
4. Inconsistent conventions across older files (naming, error handling, `any` usage).
5. Non-code assets scattered (public/marketing, public/pitch, public/showcase, scripts/*).
6. Tests: essentially none before v2. v2 has a runtime smoke (`npm run smoke:engine`).

## What is already good (build around these seams)

- `src/core` v2 engine: contracts + registry + orchestrator + validators + optimizer,
  0 type errors, 19-check smoke, clean prod build.
- Existing partitioned libs to fold into the layering: `platforms/`, `idq/`,
  `intelligence/`, `spapi/`, `brand.ts`, `creative/`, `keywords/`, `scraper/`, `ai/`.

## Commands

- Typecheck: `npm run typecheck`. Smoke: `npm run smoke:engine`. Both: `npm run verify`.
- Build: `npx next build`. Lint: `npm run lint`.
