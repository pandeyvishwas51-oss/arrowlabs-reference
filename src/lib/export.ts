// Client-side campaign export - a single CSV with the full listing + a ZIP of
// all generated images/videos. Used by the "Download campaign" button.

import JSZip from 'jszip'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvCell(v: any): string {
  const s = Array.isArray(v) ? v.join(' | ') : String(v ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

// COLUMN-WISE CSV (Amazon flat-file style): a header row across the top and one
// data row per product — opens cleanly in Excel with every field as its own column.
export function exportCampaignCsv(result: any) {
  const p = result?.scraped?.product || {}
  const L = result?.listing || {}
  const bullets: string[] = L.bullets || []
  const features: string[] = L.features || []
  const aplus: any[] = L.aPlusContent || []
  const keywords: string[] = (result?.keywords || []).map((k: any) => k.keyword)
  const assets: any[] = result?.assets || []

  const headers: string[] = ['ASIN', 'Product', 'Brand', 'Optimized Title', 'Item Highlight']
  const values: any[] = [p.asin || result?.asin, p.title, p.brand, L.title, L.itemHighlight || '']
  for (let i = 0; i < 5; i++) { headers.push(`Bullet ${i + 1}`); values.push(bullets[i] || '') }
  for (let i = 0; i < 5; i++) { headers.push(`Feature ${i + 1}`); values.push(features[i] || '') }
  headers.push('Description'); values.push(L.description || '')
  // Backend search terms: single semicolons only (no commas / double semicolons).
  headers.push('Backend Keywords'); values.push(keywords.join('; '))
  aplus.forEach((m: any, i: number) => { headers.push(`A+ Module ${i + 1}`); values.push(`${m.heading}: ${m.body}`) })
  assets.filter((a) => a.imageUrl || a.videoUrl).forEach((a: any, i: number) => {
    headers.push(`${a.type || 'asset'} ${i + 1}`); values.push(a.imageUrl || a.videoUrl || '')
  })

  const csv = [headers, values].map((r) => r.map(csvCell).join(',')).join('\r\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `arrowlabs-${p.asin || 'campaign'}.csv`)
}

// ZIP: the CSV + every rendered image/video, named by asset type.
export async function exportCampaignZip(result: any) {
  const zip = new JSZip()
  const p = result?.scraped?.product || {}
  const L = result?.listing || {}

  // listing.txt
  const listingTxt = [
    `ASIN: ${p.asin || result?.asin}`,
    `Product: ${p.title}`,
    '',
    `TITLE:\n${L.title || ''}`,
    '',
    'ITEM HIGHLIGHTS:',
    ...((L.bullets || []).map((b: string) => `- ${b}`)),
    '',
    'A+ CONTENT:',
    ...((L.aPlusContent || []).map((m: any) => `## ${m.heading}\n${m.body}`)),
    '',
    `KEYWORDS:\n${(result?.keywords || []).map((k: any) => k.keyword).join(', ')}`,
    '',
    'AD ANGLES:',
    ...((result?.angles || []).map((a: any) => `[${a.predictedScore ?? ''}] ${a.angleType}: ${a.headline}`)),
  ].join('\n')
  zip.file('listing.txt', listingTxt)

  // media
  const media = zip.folder('images')!
  const assets = (result?.assets || []).filter((a: any) => a.imageUrl || a.videoUrl)
  let idx = 0
  for (const a of assets) {
    const url = a.videoUrl || a.imageUrl
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const ext = a.videoUrl ? 'mp4' : 'png'
      media.file(`${String(++idx).padStart(2, '0')}-${a.type}.${ext}`, blob)
    } catch {
      /* skip unreachable media */
    }
  }
  if (result?.video?.url) {
    try {
      const res = await fetch(result.video.url)
      media.file('ugc-video.mp4', await res.blob())
    } catch {}
  }

  const out = await zip.generateAsync({ type: 'blob' })
  downloadBlob(out, `arrowlabs-${p.asin || 'campaign'}.zip`)
}
