// Bulk generation: a brand manager uploads the filled Excel template + the raw
// hero images. We parse each row, match it to an image (by SKU in the filename,
// else by order), and start a background campaign per SKU — so a whole catalog is
// generated in one shot, each product locked to its own uploaded image.

import { NextRequest } from 'next/server'
import { ok, fail, requireActor, wrapError } from '@/lib/api'
import { saveBuffer } from '@/lib/storage'
import { config } from '@/lib/config'
import { parseXlsx, rowField } from '@/lib/xlsx'
import { startOrchestration, type Lab } from '@/lib/orchestrator'

export const maxDuration = 120

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const MAX_ROWS = 30

export async function POST(req: NextRequest) {
  const res = await requireActor(req, { needGenerate: true })
  if ('error' in res) return res.error

  let form: FormData
  try { form = await req.formData() } catch { return fail('Expected multipart form-data (sheet + images).', 400) }

  const sheet = form.get('sheet')
  if (!(sheet instanceof Blob)) return fail('Attach the filled template as "sheet" (.xlsx).', 400)
  const images = form.getAll('images').filter((f): f is File => f instanceof File)

  const region = (form.get('region') as string) || undefined
  const platform = (form.get('platform') as string) || undefined
  const theme = (form.get('theme') as string) || undefined
  const wantVideo = String(form.get('generateVideo') || 'false') === 'true'

  let rows: Record<string, string>[]
  try {
    rows = await parseXlsx(Buffer.from(await sheet.arrayBuffer()))
  } catch (e: any) {
    return fail(`Could not read the Excel template: ${e?.message || 'parse error'}`, 400)
  }
  rows = rows.filter((r) => rowField(r, 'product title', 'product tile', 'title')).slice(0, MAX_ROWS)
  if (!rows.length) return fail('No product rows found in the sheet (need at least a Product Title).', 400)

  // Save each uploaded image once → absolute URL, keyed by filename for SKU match.
  const uploaded: { name: string; url: string }[] = []
  for (const f of images) {
    const ext = EXT[f.type]
    if (!ext) continue
    const path = await saveBuffer(Buffer.from(await f.arrayBuffer()), ext, 'bulk')
    uploaded.push({ name: (f.name || '').toLowerCase(), url: path.startsWith('http') ? path : `${config.app.url}${path}` })
  }

  const labs: Lab[] = ['ListingLab', 'AngleLab', 'PhotoLab']
  if (wantVideo) labs.push('VideoLab')

  const started: { sku: string; title: string; campaignId: string | null }[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const sku = rowField(row, 'sku')
    const title = rowField(row, 'product title', 'product tile', 'title')
    const brand = rowField(row, 'brand')
    const category = rowField(row, 'category')
    const desc = rowField(row, 'product description', 'description')
    const bullets = [1, 2, 3, 4, 5].map((n) => rowField(row, `bullet point ${n}`, `bullet ${n}`)).filter(Boolean)
    const features = [1, 2, 3, 4, 5].map((n) => rowField(row, `feature ${n}`)).filter(Boolean)
    const L = rowField(row, 'length'), W = rowField(row, 'width'), H = rowField(row, 'hight', 'height')
    const dims = [L, W, H].filter(Boolean).join(' x ')
    const fullDesc = [desc, bullets.join('. '), features.length ? `Features: ${features.join(', ')}` : ''].filter(Boolean).join('\n')

    // Match an image: filename contains the SKU, else by row order.
    const img = (sku && uploaded.find((u) => u.name.includes(sku.toLowerCase()))) || uploaded[i]
    if (!img) { started.push({ sku, title, campaignId: null }); continue }

    try {
      const { campaignId } = await startOrchestration({
        asin: `RAW-${sku || i}-${Date.now().toString(36)}`,
        marketplace: 'US',
        raw: { heroImageUrl: img.url, title, description: fullDesc, brand, category, dimensions: dims || undefined },
        theme,
        labs,
        generateImages: true,
        generateVideo: wantVideo,
        region: region as any,
        platform: platform as any,
        userId: res.actor.userId,
        orgId: res.actor.orgId,
      })
      started.push({ sku, title, campaignId })
    } catch {
      started.push({ sku, title, campaignId: null })
    }
  }

  return ok({ started, count: started.filter((s) => s.campaignId).length, rows: rows.length, images: uploaded.length })
}
