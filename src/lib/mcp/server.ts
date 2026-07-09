// ArrowLabs MCP server core (Model Context Protocol over Streamable HTTP).
//
// Shared by two routes:
//   /api/mcp            — auth via header (Authorization: Bearer al_live_…) or ?key=
//   /api/mcp/<al_live_…> — auth via URL path (for clients like Claude's connector,
//                          whose UI accepts only a URL — no custom headers/OAuth)
//
// Stateless JSON-RPC 2.0: client POSTs a request, we answer with one JSON response.
// Every tool runs scoped to the key's org and generation is metered to the wallet.

import { NextResponse } from 'next/server'
import { resolveActor, actorFromApiKey, type Actor } from '@/lib/session'
import { orchestrate, startOrchestration, type Lab } from '@/lib/orchestrator'
import { scrapeAsin } from '@/lib/scraper/asin'
import { db } from '@/lib/db'
import { config } from '@/lib/config'

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'arrowlabs', title: 'ArrowLabs', version: '1.0.0' }

const abs = (u?: string) => (u && u.startsWith('/') ? `${config.app.url}${u}` : u)

// Fetch image URLs and return them as MCP image content items (base64) so clients
// like Claude render an inline PREVIEW in the chat. Capped to keep the payload sane.
async function toImageContent(urls: string[], cap = 6): Promise<any[]> {
  const items: any[] = []
  for (const u of urls.filter(Boolean).slice(0, cap)) {
    try {
      const res = await fetch(u as string, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) continue
      const mime = res.headers.get('content-type') || 'image/png'
      if (!mime.startsWith('image/')) continue
      const b64 = Buffer.from(await res.arrayBuffer()).toString('base64')
      items.push({ type: 'image', data: b64, mimeType: mime })
    } catch { /* skip */ }
  }
  return items
}

const PLATFORM_IDS = ['amazon_in', 'flipkart', 'myntra', 'noon', 'namshi']
const TOOLS = [
  {
    name: 'scrape_product',
    description:
      'Scrape a live product (title, brand, price, rating, bullets, images, and analyzed review insights) from Amazon by ASIN. Read-only, no credits used.',
    inputSchema: {
      type: 'object',
      properties: {
        asin: { type: 'string', description: '10-character Amazon ASIN, e.g. B0DJQQWBS4' },
        marketplace: { type: 'string', description: 'Country code (US, IN, AE…). Default US.' },
      },
      required: ['asin'],
    },
  },
  {
    name: 'optimize_listing',
    description:
      'Generate a platform-correct, conversion-optimized listing for an ASIN: SEO title, bullets, description, A+ content modules (including a comparison chart), ranked ad angles, keywords and Brand DNA. No images rendered (fast, low credit cost). Returns a campaignId.',
    inputSchema: {
      type: 'object',
      properties: {
        asin: { type: 'string', description: '10-character Amazon ASIN' },
        marketplace: { type: 'string', description: 'Country code. Default US.' },
        platform: { type: 'string', enum: PLATFORM_IDS, description: 'Target marketplace guidelines. Default amazon_in.' },
        targetAudience: { type: 'string', description: 'Optional target audience.' },
      },
      required: ['asin'],
    },
  },
  {
    name: 'generate_creatives',
    description:
      'Render creatives for a product (image-to-image product lock). IMPORTANT: only generate what the user asked for. If they want just ONE image, pass labs:["PhotoLab"] and counts with all types 0 except one (note: 1 main image is always included, so all-zero counts = exactly 1 image). By DEFAULT (no labs/counts given) it makes the full kit: 9 images + 7 A+ + 1 video. Uses credits, so respect the requested quantity.',
    inputSchema: {
      type: 'object',
      properties: {
        asin: { type: 'string' },
        marketplace: { type: 'string', description: 'Country code. Default US.' },
        platform: { type: 'string', enum: PLATFORM_IDS, description: 'Target marketplace. Default amazon_in.' },
        region: { type: 'string', enum: ['IN', 'GCC'], description: 'Localizes any people shown. Default IN.' },
        targetAudience: { type: 'string' },
        labs: {
          type: 'array',
          items: { type: 'string', enum: ['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab', 'VideoLab'] },
          description: 'Which categories to generate. PhotoLab = product images, APlusLab = A+ modules, VideoLab = video, ListingLab = text listing. Omit for the full kit; pass e.g. ["PhotoLab"] for images only.',
        },
        video: { type: 'boolean', description: 'Shortcut to also render a video (same as adding VideoLab). Default false.' },
        counts: {
          type: 'object',
          description: 'How many of each asset (clamped to safe maximums). Omit for the standard kit. Set a type to 0 to skip it. NOTE: 1 main image is always rendered when PhotoLab is on.',
          properties: {
            lifestyle: { type: 'number' }, infographic: { type: 'number' }, aPlus: { type: 'number' },
            productPhoto: { type: 'number' }, dimension: { type: 'number' }, detail: { type: 'number' }, video: { type: 'number' },
          },
        },
      },
      required: ['asin'],
    },
  },
  {
    name: 'get_campaign',
    description: 'Fetch a campaign by id right now: status, progress, listing, keywords, Brand DNA and every rendered image/video (with inline previews).',
    inputSchema: { type: 'object', properties: { campaignId: { type: 'string' } }, required: ['campaignId'] },
  },
  {
    name: 'wait_for_campaign',
    description: 'Poll a running campaign until it finishes (waits up to ~4 min server-side) and returns the final listing + image/video previews. If it returns status "generating", the job is still running — call wait_for_campaign again with the same campaignId to keep waiting.',
    inputSchema: { type: 'object', properties: { campaignId: { type: 'string' } }, required: ['campaignId'] },
  },
  {
    name: 'list_campaigns',
    description: 'List the most recent campaigns for your account (id, ASIN, product name, status, date).',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Max rows (default 15, max 50).' } } },
  },
]

// One campaign's current state as a readable snapshot (markdown + inline image
// previews). Shared by get_campaign and wait_for_campaign.
async function campaignSnapshot(id: string, actor: Actor) {
  const c = await db.campaign.findFirst({ where: { id, orgId: actor.orgId }, include: { assets: true, keywords: true } })
  if (!c) throw new Error('Campaign not found (or not owned by your account).')
  const assets = c.assets.map((a) => ({ type: a.type, status: a.status, url: abs(a.imageUrl || undefined), videoUrl: abs(a.videoUrl || undefined) }))
  const imgs = assets.filter((a) => a.url && a.type !== 'product_video')
  const vids = assets.filter((a) => a.videoUrl)
  const prog: any = c.progress || {}
  const L: any = c.listing || {}
  const md = [
    `## ${c.productName || c.asin} — ${c.status}${prog.percent != null && c.status !== 'completed' ? ` (${prog.percent}% · ${prog.stage || ''})` : ''}`,
    L.title ? `\n**Title:** ${L.title}` : '',
    (L.bullets || []).length ? `\n**Bullets**\n${(L.bullets || []).map((b: string) => `- ${b}`).join('\n')}` : '',
    (L.features || []).length ? `\n**Features:** ${(L.features || []).join(' · ')}` : '',
    imgs.length ? `\n### Images (${imgs.length})\n${imgs.map((a) => `![${a.type}](${a.url})`).join('\n')}` : '',
    vids.length ? `\n### Video\n${vids.map((v) => `[▶ product video](${v.videoUrl})`).join('\n')}` : '',
    c.status !== 'completed' && c.status !== 'failed' ? `\n_Still generating — call wait_for_campaign again to keep waiting._` : '',
  ].filter(Boolean).join('\n')
  return {
    id: c.id, asin: c.asin, productName: c.productName, status: c.status, createdAt: c.createdAt,
    progress: c.progress, listing: c.listing, angles: c.angles, brandDna: c.brandDna,
    keywords: c.keywords.map((k) => k.keyword),
    assets, markdown: md,
    previewImages: imgs.map((a) => a.url).filter(Boolean),
  }
}

async function callTool(name: string, args: any, actor: Actor): Promise<any> {
  const asin = typeof args?.asin === 'string' ? args.asin.trim().toUpperCase() : ''
  const needAsin = () => {
    if (asin.length !== 10) throw new Error('asin must be a 10-character Amazon ASIN (e.g. B0DJQQWBS4).')
  }

  switch (name) {
    case 'scrape_product': {
      needAsin()
      const s = await scrapeAsin(asin, (args.marketplace || 'US').toUpperCase())
      const p = s.product
      return {
        asin, provider: s.provider, title: p.title, brand: p.brand, category: p.category,
        price: p.price, currency: p.currency, rating: p.rating, reviewCount: p.reviewCount,
        bullets: p.bullets, images: p.images, reviewInsights: s.reviewInsights,
        previewImages: (p.images || []).filter((u: any) => typeof u === 'string').slice(0, 3),
      }
    }
    case 'optimize_listing': {
      needAsin()
      const r = await orchestrate({
        asin, marketplace: (args.marketplace || 'US').toUpperCase(),
        labs: ['ListingLab', 'AngleLab'], generateImages: false, generateVideo: false,
        platform: args.platform, targetAudience: args.targetAudience,
        userId: actor.userId, orgId: actor.orgId,
      })
      const L: any = r.listing || {}
      const md = [
        `## Optimized listing - ${r.scraped.product.brand || ''} ${r.scraped.product.title || ''}`.trim(),
        L.title ? `\n**Title** (${L.title.length} chars)\n${L.title}` : '',
        (L.bullets || []).length ? `\n**Bullets**\n${(L.bullets || []).map((b: string) => `- ${b}`).join('\n')}` : '',
        (L.features || []).length ? `\n**Features**\n${(L.features || []).map((f: string) => `- ${f}`).join('\n')}` : '',
        L.description ? `\n**Description**\n${L.description}` : '',
        (r.keywords || []).length ? `\n**Keywords:** ${r.keywords.map((k) => k.keyword).join('; ')}` : '',
      ].filter(Boolean).join('\n')
      return {
        campaignId: r.campaignId, status: r.status,
        product: { title: r.scraped.product.title, brand: r.scraped.product.brand },
        listing: r.listing, angles: r.angles,
        keywords: r.keywords?.map((k) => k.keyword), brandDna: r.brandDna,
        creditsCharged: r.creditsCharged, errors: r.errors, markdown: md,
      }
    }
    case 'generate_creatives': {
      needAsin()
      if (!actor.canGenerate) throw new Error('Your plan/credits do not allow generation. Top up credits or start a trial in the ArrowLabs dashboard.')
      // Respect exactly what the caller asked for; default to the full kit only if
      // no labs given. This is why "generate just one image" no longer over-generates.
      const validLabs = ['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab', 'VideoLab']
      let labs: Lab[] = Array.isArray(args.labs) && args.labs.length
        ? (args.labs.filter((l: string) => validLabs.includes(l)) as Lab[])
        : ['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab']
      if (args.video && !labs.includes('VideoLab')) labs.push('VideoLab')
      // Start as a BACKGROUND job and return immediately — full generation takes
      // ~7-13 min (longer than any request timeout). The caller polls get_campaign.
      const { campaignId } = await startOrchestration({
        asin, marketplace: (args.marketplace || 'US').toUpperCase(),
        labs, generateImages: labs.includes('PhotoLab') || labs.includes('APlusLab'), generateVideo: labs.includes('VideoLab'),
        platform: args.platform, region: args.region || 'IN', targetAudience: args.targetAudience,
        counts: args.counts, userId: actor.userId, orgId: actor.orgId,
      })
      return {
        campaignId, status: 'started',
        markdown: `Generation **started** for ${asin} (campaign \`${campaignId}\`). It runs in the background (~7-13 min).\n\nNow call **wait_for_campaign** with campaignId \`${campaignId}\` — it waits and returns the finished listing + image/video previews. If it says still generating, call wait_for_campaign again.`,
      }
    }
    case 'get_campaign': {
      const id = String(args?.campaignId || '')
      if (!id) throw new Error('campaignId is required.')
      return campaignSnapshot(id, actor)
    }
    case 'wait_for_campaign': {
      const id = String(args?.campaignId || '')
      if (!id) throw new Error('campaignId is required.')
      // Block server-side (under the 300s route budget) polling the DB until the
      // job finishes; return the moment it's done, else current progress.
      const deadline = Date.now() + 240_000
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const snap = await campaignSnapshot(id, actor)
        if (snap.status === 'completed' || snap.status === 'failed' || Date.now() > deadline) return snap
        await new Promise((r) => setTimeout(r, 6000))
      }
    }
    case 'list_campaigns': {
      const take = Math.max(1, Math.min(Number(args?.limit) || 15, 50))
      const rows = await db.campaign.findMany({
        where: { orgId: actor.orgId }, orderBy: { createdAt: 'desc' }, take,
        select: { id: true, asin: true, productName: true, status: true, createdAt: true },
      })
      return { campaigns: rows }
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

const rpcResult = (id: any, result: any) => NextResponse.json({ jsonrpc: '2.0', id, result })
const rpcError = (id: any, code: number, message: string, status = 200) =>
  NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status })

// Main entry — shared by both routes. keyFromPath, when present, is the API key
// taken from the URL path segment.
export async function handleMcp(req: Request, keyFromPath?: string): Promise<Response> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error: body is not valid JSON', 400)
  }
  const { id, method, params } = body || {}

  if (id === undefined || id === null) {
    return new NextResponse(null, { status: 202 }) // notification
  }

  // Auth: path key → query ?key= → header/session.
  const queryKey = (() => { try { return new URL(req.url).searchParams.get('key') || undefined } catch { return undefined } })()
  const rawKey = keyFromPath || queryKey
  const actor = rawKey ? await actorFromApiKey(rawKey) : await resolveActor(req)
  if (!actor) {
    return rpcError(id, -32001, 'Unauthorized: connect with your ArrowLabs API key. In Claude, paste the URL https://arrowlabs.art/api/mcp/<your-key> (get the key from ArrowLabs → Account → API keys).', 401)
  }

  try {
    switch (method) {
      case 'initialize':
        return rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: 'ArrowLabs turns an Amazon ASIN into a marketplace-ready listing + A+ content + creatives. Use scrape_product to inspect, optimize_listing for copy (fast), and generate_creatives to render images/video (uses credits).',
        })
      case 'ping':
        return rpcResult(id, {})
      case 'tools/list':
        return rpcResult(id, { tools: TOOLS })
      case 'tools/call': {
        const toolName = params?.name
        const toolArgs = params?.arguments || {}
        if (!toolName) return rpcError(id, -32602, 'Invalid params: missing tool name')
        try {
          const data = await callTool(toolName, toolArgs, actor)
          // Prefer a readable markdown summary when the tool provides one; keep the
          // full JSON as structuredContent for programmatic use.
          const text = data && typeof data.markdown === 'string' ? data.markdown : JSON.stringify(data, null, 2)
          const content: any[] = [{ type: 'text', text }]
          // Inline image PREVIEWS in the chat (base64 content items).
          if (Array.isArray(data?.previewImages) && data.previewImages.length) {
            content.push(...(await toImageContent(data.previewImages)))
          }
          return rpcResult(id, { content, structuredContent: data, isError: false })
        } catch (e: any) {
          return rpcResult(id, { content: [{ type: 'text', text: `Error: ${e?.message || 'tool failed'}` }], isError: true })
        }
      }
      default:
        return rpcError(id, -32601, `Method not found: ${method}`)
    }
  } catch (e: any) {
    return rpcError(id, -32603, `Internal error: ${e?.message || 'unknown'}`)
  }
}
