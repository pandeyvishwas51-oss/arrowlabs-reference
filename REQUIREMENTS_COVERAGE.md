# Meeting Requirements Coverage

Every requirement and bug raised in the Hamleys/Hasbro review, mapped to its status.
Honest labels: DONE means built and verified in the v2 engine; BEHIND FLAG means built
but not yet the live default (studio still runs v1 until you flip it); NEEDS ACCESS means
blocked on an external subscription or data you control; PHASE 0 means it lands with the
infrastructure migration you sign off on.

## Quality and correctness

1. Self-validation loop, catch mistakes before the user sees them. DONE.
   Validators run on every asset and force a regenerate on failure. Verified by the smoke
   test: a bad caption and an em dash were both caught and fixed automatically.
   `src/core/pipeline/orchestrator.ts`, `src/core/modules/validators/`.

2. Mobile-first images, short readable on-image text. DONE.
   Each platform spec carries a text-density rule and the mobile validator fails an image
   whose baked text runs long, with a hint to cut it. `validators/mobile.ts`, platform specs.

3. Brand consistency, one logo, consistent colors and fonts. DONE.
   Brand identity is an input, captured in the new Brand Manager panel and stored on the org,
   then enforced by the brand validator and fed into every generator.
   `src/app/brand/page.tsx`, `src/lib/engine/brand-dna.ts`, `validators/brand.ts`.

4. Coffee-mug-on-book and other implausible images. DONE (when vision is configured).
   The vision sanity validator asks the model to list what is wrong and regenerates on a
   hit. Degrades to a skip when no vision model is set, so it never blocks. `validators/vision.ts`.

5. No em or en dashes, anywhere, ever. DONE.
   Enforced in prompts and caught by the compliance validator as a hard failure.
   `validators/compliance.ts`. Verified in the smoke test.

6. Product print, pattern, and color must stay identical. DONE.
   Every image generator uses product-lock (image-to-image from the real photo) and never
   falls back to inventing a product. `src/lib/engine/generators/image.ts`.

7. Video: about 12 seconds, on-screen feature text, no voiceover, Sora-2 only. DONE.
   `src/lib/engine/generators/video.ts`.

## Data and intelligence

8. Decouple into stages, build a Brand File and a Node File once and reuse them. DONE.
   The engine is a staged pipeline of pluggable modules; the intelligence builders produce the
   Brand File and Node File that the Listing File pins. Verified in the smoke test.
   Quarterly refresh and persistence land with the Phase 0 migration.

9. Brand DNA from the D2C site, product name, or images. DONE.
   The Brand Manager panel builds palette, voice, positioning, values, and target customer, and
   saves them so generation reads them. `src/app/brand/page.tsx`, `src/lib/engine/brand-dna.ts`.

10. Real keyword volume. PARTIAL, NEEDS ACCESS.
    The keyword provider port is live with an autocomplete adapter (terms and intent today).
    Volume-ranked keywords need a Helium 10 tier with volume or Amazon PI access (Belkin has PI
    via Sheshta). Adding that provider is a drop-in, no engine change. `src/lib/engine/adapters/keywords.ts`.

11. Best-sellers, not individual competitors. PENDING.
    The Node File has a best-seller slot; the best-seller-node scraper is the next ingestion module.

12. IDQ must match Amazon's real IDQ. PARTIAL, NEEDS ACCESS.
    The scorer is built and runs. It must be reconciled against a real Amazon IDQ number for a
    known ASIN (from the brand manager or Amazon PI) before we present it as authoritative. This
    caveat is written into the code. `src/core/idq/score.ts`.

## Product and process

13. Externalize, multi-tenant, brand-facing, in-app prompt box. PARTIAL.
    The engine is org-scoped end to end and the Brand Manager panel is the first brand-facing
    surface. The in-app free-text prompt box and full brand-tenant UX are the next UI additions.

14. Feedback loop, comment then regenerate. DONE at the engine level.
    A comment folds into the prompt and the validators' hints drive regeneration.
    `GenerateOptions.comment`, orchestrator regenerate loop.

## Scale and reliability

15. Not vibe-coded, must not break under load. DONE at the code level.
    Zero type errors across the project, a clean production build, and a runtime smoke test that
    proves a throwing generator or validator cannot take down a campaign. `npm run verify`.

16. Postgres, durable queue, object storage and CDN, residential proxies. PHASE 0.
    The v2 Postgres schema is written and validates (`prisma/schema.v2.prisma`). Provisioning and
    the live migration are the infrastructure step to plan together.

## Bugs fixed earlier this session (outside the engine)

- Generation error on a real ASIN: the scraper was captcha-walled on the chrome TLS fingerprint.
  Fixed by leading with Safari and chrome131 profiles plus retry-on-lite. Verified live.
- Dead residential tunnel that broke all scraping: restarted and the VM repointed. Verified.

## How to see it

- Run the tests: `npm run verify` (typecheck plus the 15-check runtime smoke test).
- Try the engine path: set `ENGINE_V2=1`, POST an ASIN to `/api/orchestrate-v2`.
- Build a brand: open `/brand`, paste a D2C URL or brand name, build the Brand DNA.
- The live studio is unchanged and still runs the v1 path until you flip the switch.
