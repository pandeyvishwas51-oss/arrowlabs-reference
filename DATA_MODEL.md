# ArrowLabs — Data Model (v2)

> The intelligence layer as a real, normalized, versioned schema. Postgres (JSONB where
> the shape evolves, columns where we query/index). Every design choice here exists to
> make one promise true: **adding a feature later never forces a rewrite and never
> destabilizes what already works.**
>
> Companion to `ARCHITECTURE.md`. This is Prisma-flavored for readability; the real
> migration is `prisma migrate` against Postgres.

---

## Design principles (why this won't "blast" when you extend it)

1. **Module keys are strings backed by registries.** `moduleKey` / `validatorKey` /
   `publisherKey` are free-form strings (e.g. `image.hero`, `keywords.helium`,
   `validator.mobile`). A new module registers in code; **no schema migration** to add a
   generator, scraper, validator, marketplace, or publisher. Open/closed by construction.
2. **Versioned intelligence.** `BrandProfile`, `NodeSnapshot`, `ListingFile` each carry a
   `version`. Refreshing the quarterly node intelligence writes a **new** snapshot; it never
   mutates the old one. A listing **pins** the exact versions it consumed, so generation is
   reproducible and a refresh can never silently corrupt in-flight work.
3. **Tenant isolation everywhere.** Every tenant-owned row has `orgId`; ready for Postgres
   row-level security. One brand's data can never leak into another's (this already bit us
   once with an unscoped campaigns query).
4. **JSONB for evolving payloads, columns for query paths.** Fields we filter/sort/join on
   are real columns with indexes; fields that are "the generated blob" live in JSONB so the
   shape can evolve without a migration.
5. **Append-only ledgers + idempotent jobs.** Credits are an append-only ledger (auditable,
   no lost updates under concurrency). Jobs carry an `idempotencyKey` so retries at scale are
   safe. This is the difference between a script and a SaaS.

---

## 1. Tenancy

```prisma
model Organization {
  id           String   @id @default(cuid())
  name         String
  domain       String   @unique            // B2B: keyed by email domain
  plan         String   @default("trial")
  trialEndsAt  DateTime?
  createdAt    DateTime @default(now())

  users     User[]
  brands    Brand[]
  products  Product[]
  campaigns Campaign[]
  ledger    CreditEntry[]
  apiKeys   ApiKey[]
}

model User {
  id           String   @id @default(cuid())
  orgId        String
  email        String   @unique
  role         String   @default("member")  // owner | admin | member
  passwordHash String?
  createdAt    DateTime @default(now())

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([orgId])
}

// An org (agency or brand) can own many brands. Brand intelligence lives here.
model Brand {
  id        String   @id @default(cuid())
  orgId     String
  name      String
  slug      String
  createdAt DateTime @default(now())

  org       Organization   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  profiles  BrandProfile[]
  assets    BrandAsset[]
  products  Product[]
  @@unique([orgId, slug])
  @@index([orgId])
}
```

---

## 2. Brand intelligence (versioned; logo/colors/fonts are INPUTS)

```prisma
model BrandProfile {
  id           String   @id @default(cuid())
  brandId      String
  version      Int                              // bump on every edit; never overwrite
  status       String   @default("active")      // draft | active | archived
  colors       Json                             // { primary, secondary, accent, neutrals[] } hex
  fonts        Json                             // { display, body } family names / asset ids
  voice        String?                          // brand tone / language guidance
  compliance   Json     @default("{}")          // { forbidden: ["em-dash",...], toneRules }
  logoAssetId  String?
  createdAt    DateTime @default(now())

  brand Brand       @relation(fields: [brandId], references: [id], onDelete: Cascade)
  logo  BrandAsset? @relation("ProfileLogo", fields: [logoAssetId], references: [id])
  @@unique([brandId, version])
  @@index([brandId, status])
}

model BrandAsset {
  id        String   @id @default(cuid())
  brandId   String
  kind      String                              // logo | font | swatch | moodboard | reference
  url       String                              // object-storage URL
  meta      Json     @default("{}")             // dimensions, format, hex, etc.
  createdAt DateTime @default(now())

  brand    Brand          @relation(fields: [brandId], references: [id], onDelete: Cascade)
  usedAsLogo BrandProfile[] @relation("ProfileLogo")
  @@index([brandId, kind])
}
```

---

## 3. Marketplace + category intelligence (built ONCE per node, refreshed on schedule)

```prisma
// The category tree per marketplace (Cortina Curtains lives at a node).
model CategoryNode {
  id           String  @id @default(cuid())
  platformKey  String                           // amazon_in | flipkart | myntra | noon ...
  externalId   String                           // marketplace's browse-node id
  name         String
  parentId     String?

  parent    CategoryNode?  @relation("NodeTree", fields: [parentId], references: [id])
  children  CategoryNode[] @relation("NodeTree")
  snapshots NodeSnapshot[]
  products  Product[]
  @@unique([platformKey, externalId])
  @@index([platformKey])
}

// ONE snapshot = the intelligence generated for a node at a point in time. Reused by every
// ASIN in the node. Refresh = new snapshot; old one is retained for reproducibility.
model NodeSnapshot {
  id           String   @id @default(cuid())
  nodeId       String
  version      Int
  status       String   @default("building")    // building | active | stale | archived
  source       String                           // scrape | helium | amazon_pi
  summary      Json     @default("{}")           // aggregate stats, trend notes
  builtAt      DateTime @default(now())
  refreshDueAt DateTime?                          // e.g. builtAt + 90 days

  node      CategoryNode  @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  keywords  Keyword[]
  sellers   BestSeller[]
  insights  NodeInsight[]
  @@unique([nodeId, version])
  @@index([nodeId, status])
}

model Keyword {
  id             String  @id @default(cuid())
  nodeSnapshotId String
  term           String
  volume         Int?                            // from Helium 10 / Amazon PI (null if scrape-only)
  intent         String                          // transactional | commercial | informational
  source         String                          // scrape | helium | amazon_pi | reviews
  score          Float?                          // ranking weight for listing use

  snapshot NodeSnapshot @relation(fields: [nodeSnapshotId], references: [id], onDelete: Cascade)
  @@index([nodeSnapshotId, intent])
  @@index([nodeSnapshotId, volume])
}

model BestSeller {
  id             String  @id @default(cuid())
  nodeSnapshotId String
  asin           String
  bsr            Int?                            // best-seller rank
  title          String?
  brand          String?
  price          Float?
  signals        Json    @default("{}")           // trend cues: hero style, common claims, etc.

  snapshot NodeSnapshot @relation(fields: [nodeSnapshotId], references: [id], onDelete: Cascade)
  @@index([nodeSnapshotId, bsr])
}

model NodeInsight {
  id             String  @id @default(cuid())
  nodeSnapshotId String
  kind           String                          // pain_point | customer_love | improvement | trend
  text           String
  weight         Float   @default(0)             // how strongly it recurs across the node
  evidence       Json    @default("{}")           // sample reviews / asins backing it

  snapshot NodeSnapshot @relation(fields: [nodeSnapshotId], references: [id], onDelete: Cascade)
  @@index([nodeSnapshotId, kind])
}
```

---

## 4. Product + the Listing File (single source of truth for generation)

```prisma
model Product {
  id             String   @id @default(cuid())
  orgId          String
  brandId        String?
  nodeId         String?
  sourcePlatform String                          // where we scraped it
  externalId     String                          // ASIN / Flipkart id / etc.
  raw            Json                             // normalized scrape result
  scrapedAt      DateTime @default(now())

  org      Organization   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  brand    Brand?         @relation(fields: [brandId], references: [id])
  node     CategoryNode?  @relation(fields: [nodeId], references: [id])
  reviews  ReviewInsight[]
  listings ListingFile[]
  @@unique([sourcePlatform, externalId, orgId])
  @@index([orgId])
}

model ReviewInsight {
  id        String  @id @default(cuid())
  productId String
  kind      String                               // love | pain | image | video
  text      String?
  sentiment Float?
  media     Json    @default("[]")               // customer image/video urls
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@index([productId, kind])
}

// The Listing File PINS the exact intelligence versions it used -> reproducible generation.
model ListingFile {
  id              String   @id @default(cuid())
  orgId           String
  productId       String
  targetPlatform  String                         // generate FOR (may differ from source)
  brandProfileId  String?                        // pinned brand version
  nodeSnapshotId  String?                        // pinned node-intel version
  payload         Json                           // merged product + brand + node slice + overrides
  status          String   @default("draft")     // draft | ready | generating | complete
  version         Int      @default(1)
  createdAt       DateTime @default(now())

  product   Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  campaigns Campaign[]
  feedback  Feedback[]
  publishes PublishRecord[]
  @@index([orgId])
  @@index([productId])
}
```

---

## 5. Generation, jobs, assets (durable + idempotent)

```prisma
model Campaign {
  id            String   @id @default(cuid())
  orgId         String
  userId        String
  listingFileId String
  labs          Json                              // which stages requested (listing/aplus/photo/video)
  status        String   @default("queued")       // queued | running | complete | failed
  progress      Json     @default("{}")            // percent, stage, steps[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  listingFile ListingFile  @relation(fields: [listingFileId], references: [id], onDelete: Cascade)
  jobs        Job[]
  assets      Asset[]
  @@index([orgId, status])
}

// One durable queue record per unit of work. idempotencyKey makes retries safe under load.
model Job {
  id             String   @id @default(cuid())
  campaignId     String
  stage          String                           // ingest | intel | generate | validate | publish
  moduleKey      String                           // e.g. image.hero, keywords.helium
  status         String   @default("pending")     // pending | running | done | failed
  attempts       Int      @default(0)
  idempotencyKey String   @unique
  error          String?
  startedAt      DateTime?
  finishedAt     DateTime?

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  @@index([campaignId, status])
  @@index([status, stage])
}

model Asset {
  id               String   @id @default(cuid())
  campaignId       String
  kind             String                          // image.hero | image.lifestyle | aplus | video | banner
  moduleKey        String                          // which generator produced it
  storageKey       String                          // object-storage key
  url              String
  meta             Json     @default("{}")           // prompt, dims, platform, feedback applied
  validationStatus String   @default("pending")     // pending | passed | failed | needs_review
  version          Int      @default(1)             // regenerations bump this
  createdAt        DateTime @default(now())

  campaign    Campaign           @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  validations ValidationResult[]
  feedback    Feedback[]
  @@index([campaignId, kind])
  @@index([validationStatus])
}
```

---

## 6. Validation (the self-critique loop, as data)

```prisma
model ValidationResult {
  id           String   @id @default(cuid())
  assetId      String
  validatorKey String                             // vision.sanity | text.typo | brand.consistency | mobile.readability | idq | compliance.emdash
  pass         Boolean
  score        Float?
  issues       Json     @default("[]")             // [{severity, message, box?}]
  hint         String?                             // fed back into regeneration
  createdAt    DateTime @default(now())

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  @@index([assetId, validatorKey])
}
```

---

## 7. Feedback loop (captured for learning)

```prisma
model Feedback {
  id            String   @id @default(cuid())
  listingFileId String?
  assetId       String?
  userId        String
  comment       String
  appliedTo     Int?                               // asset version the comment produced
  createdAt     DateTime @default(now())

  listingFile ListingFile? @relation(fields: [listingFileId], references: [id], onDelete: Cascade)
  asset       Asset?       @relation(fields: [assetId], references: [id], onDelete: Cascade)
  @@index([listingFileId])
  @@index([assetId])
}
```

---

## 8. Publish (v1B and beyond)

```prisma
model PublishRecord {
  id            String   @id @default(cuid())
  listingFileId String
  publisherKey  String                             // spapi | zip | csv | webhook
  target        String?                            // seller-central account / destination
  status        String   @default("pending")       // pending | pushed | failed
  response      Json     @default("{}")
  createdAt     DateTime @default(now())

  listingFile ListingFile @relation(fields: [listingFileId], references: [id], onDelete: Cascade)
  @@index([listingFileId, status])
}
```

---

## 9. Metering + access (append-only, auditable)

```prisma
model CreditEntry {
  id           String   @id @default(cuid())
  orgId        String
  delta        Int                                 // +grant / -debit
  reason       String                              // topup | trial | debit:image | debit:video ...
  campaignId   String?
  balanceAfter Int
  createdAt    DateTime @default(now())

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([orgId, createdAt])
}

model ApiKey {
  id         String   @id @default(cuid())
  orgId      String
  userId     String
  prefix     String                                // al_live_...
  hashedKey  String   @unique
  lastUsedAt DateTime?
  createdAt  DateTime @default(now())

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([orgId])
}
```

---

## 10. How the pieces flow (read this to sanity-check the model)

```
Onboard brand      -> Brand + BrandProfile(v1) + BrandAsset(logo, fonts)         [once, editable]
Build node intel   -> CategoryNode + NodeSnapshot(v1) + Keyword/BestSeller/Insight [once per node, quarterly refresh]
Scrape a product   -> Product (+ ReviewInsight)                                    [per ASIN]
Assemble listing   -> ListingFile { pins BrandProfile.id + NodeSnapshot.id }       [per ASIN, the source of truth]
Generate           -> Campaign -> Job per (stage, moduleKey) -> Asset              [durable, idempotent, parallel]
Validate           -> ValidationResult per (asset, validatorKey); fail -> regen    [before user sees it]
Feedback           -> Feedback -> new Asset.version                                [self-learning loop]
Publish            -> PublishRecord (SP-API / export)                              [v1B+]
Meter              -> CreditEntry appended per debit                               [auditable]
```

**Extending it without a migration:** a new image type, a new marketplace, a new keyword
provider, a new validator, a banner generator, a pricing module — each is a new `moduleKey`
string + a registered module in code. The tables above do not change. That is the guarantee.
```
