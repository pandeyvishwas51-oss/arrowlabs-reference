# ArrowLabs — Deployment Guide

The creative operating system for commerce. Next.js 16 (standalone) + Prisma +
Azure AI Foundry (Claude Opus 4.8 · gpt-image-2 · sora-2 · gpt-4o-mini-tts).

## 1. Prerequisites

- Node 20+ (or Bun) and a persistent disk (SQLite + generated media) OR a hosted
  Postgres + object storage for multi-instance deploys.
- The Azure Foundry keys (text/image/video/tts), Resend (email), and — for paid
  top-ups — Razorpay keys.

## 2. Environment

Copy `.env.example` → `.env` and fill it in. **Required in production:**

| Var | Why |
|---|---|
| `NEXTAUTH_SECRET` | Session signing. `openssl rand -base64 32` |
| `NEXTAUTH_URL` / `APP_URL` | Your public URL (e.g. `https://app.arrowlabs.ai`) |
| `DATABASE_URL` | Persistent DB |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_AZURE_RESOURCE` | Opus 4.8 (listings, angles, scripts) |
| `AZURE_IMAGE_*` | gpt-image-2 (creatives) |
| `AZURE_VIDEO_*` | sora-2 (UGC video) |
| `AZURE_TTS_*` | voiceover |
| `RESEND_API_KEY` | magic-link + team invite emails |
| `ADMIN_EMAILS` | who gets `/admin` |
| `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | paid credit top-ups |

Everything degrades gracefully if a key is missing (that lane just shows as
unconfigured on `/api/health`).

## 3. Database

```bash
npm run db:generate      # prisma generate
npm run db:push          # create tables (dev) — or `prisma migrate deploy` in prod
```

For production scale, switch `prisma/schema.prisma` datasource to `postgresql`
and set `DATABASE_URL` accordingly, then `prisma migrate deploy`.

## 4. Build & run

```bash
npm run build            # next build (standalone) + copies static + public
npm run start            # NODE_ENV=production node .next/standalone/server.js
```

The build emits `.next/standalone/` — a self-contained server. Generated media is
written to `public/generated/` (git-ignored). On a single node/volume this works
as-is; for serverless/multi-instance, point `src/lib/storage.ts` at S3/R2/Azure Blob.

## 5. Razorpay

1. Set the three `RAZORPAY_*` vars.
2. In the Razorpay dashboard add a webhook → `https://<APP_URL>/api/webhook/razorpay`
   with event `payment.captured`, using `RAZORPAY_WEBHOOK_SECRET`.
3. Top-ups then use Razorpay Checkout; credits are granted on verified payment
   (client `/api/wallet/verify`) with the webhook as an idempotent backstop.

Without keys, top-up falls back to a **dev-only** instant grant (blocked in prod).

## 6. Account model (important)

- **Company-domain only.** Public/free/disposable email providers are rejected at
  sign-in. Users log in with a magic link.
- **One org per email domain.** The first user creates the org + starts the single
  15-day / 500-credit trial and becomes owner. Teammates auto-join the same org
  (shared wallet, no new trial). Owners/admins invite + manage roles in `/account`.

## 7. Health check

`GET /api/health` returns provider status:

```json
{ "llm":"azure","llmModel":"claude-opus-4-8","image":"azure","imageModel":"gpt-image-2",
  "video":"azure","videoModel":"sora-2","voice":"azure","razorpay":true }
```

## 8. Deploy on your Google Cloud VM (recommended - Veo/Imagen "just work")

A single GCE VM is the simplest host because the VM's **attached service account
provides ADC automatically** via the metadata server - so Veo-3 + Imagen-4
authenticate with NO key and NO `gcloud login`. Our token provider already reads it.

**One-time VM setup:**
1. Give the VM's service account the **Vertex AI User** role, and create the VM with
   the `cloud-platform` scope (or `https://www.googleapis.com/auth/cloud-platform`).
   Then Veo-3/Imagen-4 work in production with zero extra auth.
   (If not using the VM SA, run `gcloud auth application-default login` once as the
   service user - our provider falls back to that, then to `gcloud print-access-token`.)
2. Install Node 20+ and clone the repo. `cp .env.example .env` and fill it in.

### Database on the VM - two options
- **Simplest (launch):** keep **SQLite on the VM's persistent disk**. The file
  (`db/custom.db`) survives restarts and redeploys as long as you don't delete it.
  Zero extra services. Good for a single VM. Just `npm run db:push` once.
- **Scalable (recommended for growth):** **Cloud SQL (Postgres)**. In
  `prisma/schema.prisma` set `datasource db { provider = "postgresql" }`, point
  `DATABASE_URL` at the Cloud SQL instance (via the Cloud SQL Auth Proxy or private
  IP), then `npx prisma migrate deploy`. This lets you run multiple app instances.

### Media storage on the VM
- Generated images/videos are written to `public/generated/` on the VM disk -
  persists fine on a single VM. For multi-instance/CDN, swap `src/lib/storage.ts`
  to a **GCS bucket** (the same VM SA can write to it).

### Run it
```bash
npm ci
npm run db:generate && npm run db:push     # or: npx prisma migrate deploy (Postgres)
npm run build
npm run start                              # or run under PM2 / systemd for auto-restart
```
Put **Caddy** (there's a Caddyfile in the repo) or Nginx in front for HTTPS + your
domain. Set `APP_URL`/`NEXTAUTH_URL` to your domain, and a strong `NEXTAUTH_SECRET`.

### Keeping the DB updated
- SQLite: after a schema change, `npm run db:push` (dev) or ship a migration and run
  `npx prisma migrate deploy`.
- Postgres: always use migrations (`prisma migrate dev` locally -> `migrate deploy`
  in prod). Back up with `pg_dump` / Cloud SQL automated backups.

## 9. Deploy targets

- **Railway / Render / Fly / a VM:** run `npm run build` then `npm run start` with a
  persistent volume for `db/` + `public/generated/`. Standalone output keeps the
  image small.
- **Vercel:** works for the app, but move media storage off local disk and use a
  hosted Postgres (serverless filesystem is ephemeral).
