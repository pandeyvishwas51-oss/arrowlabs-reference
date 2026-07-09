# ArrowLabs Engine (v2 core)

This is the modular engine that the v2 architecture is built on. Its one job is to
make the promise from `ARCHITECTURE.md` real: you add a marketplace, a generator, a
validator, or a whole new feature by writing a module and registering it, and the
pipeline never changes.

## The shape

A campaign walks six stages, in order:

```
ingest  ->  intelligence  ->  assemble  ->  generate  ->  validate  ->  publish
```

Each stage is defined by a contract (an interface) in `contracts/`. Concrete work
is done by modules that implement a contract and register themselves. The pipeline
in `pipeline/orchestrator.ts` only talks to the registries in `registry/`, never to
a concrete module.

- `contracts/` — the stable interfaces and the domain nouns (ScrapedProduct, BrandFile, NodeFile, ListingFile, Asset).
- `registry/` — a tiny generic registry plus one typed registry per stage.
- `pipeline/` — the orchestrator that walks the stages and runs the validate-and-regenerate loop.
- `modules/` — the actual implementations. `platforms/` ships first (platform specs are pure data).

## How to add things (no pipeline edits)

Add a marketplace: create `modules/platforms/<name>.ts`, call `registerPlatform({...})`,
re-export it from `modules/platforms/index.ts`.

Add a generator: implement `Generator`, call `registerGenerator(...)` at import,
import the module from `core/index.ts`. The orchestrator finds it by its `kind`.

Add a validator: implement `Validator` with an `appliesTo(kind)`, call
`registerValidator(...)`. It automatically joins the validation loop for every
asset kind it applies to.

## The validation loop

`generateAndValidate` in the orchestrator generates an asset, runs every validator
that applies to its kind, and if any fails it regenerates with the validators' hints
appended, up to `maxValidationRetries` times. An asset that still fails is returned
flagged `needs_review` rather than throwing, so one weak asset never fails the whole
campaign. This is the self-critique behavior the review meeting asked for.

## Usage

```ts
import { run } from '@/core'

const result = await run(
  {
    source: { platform: 'flipkart', externalId: 'ABC123' }, // scrape FROM
    targetPlatform: 'amazon_in',                              // generate FOR
    brandId: 'brand_cortina',
    labs: ['image.hero', 'aplus', 'video'],
  },
  ctx,
  () => crypto.randomUUID(),
  progress,
)
```

## Status

Phase 1 (this) is the foundation: contracts, registries, orchestrator, platform
specs. Phases 2 to 4 add the intelligence builders, the concrete validators, and
port the existing scrapers/generators into modules, then wire the app routes to
`run()`. The live app is untouched until that cutover, so the demo keeps working.
