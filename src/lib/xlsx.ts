// Minimal .xlsx reader (no new dependency — reuses jszip). Enough to parse the
// ArrowLabs bulk template: shared strings + the first worksheet → an array of
// row objects keyed by the detected header row. Used by the bulk-upload flow.

import JSZip from 'jszip'

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
}

// Excel column letters (A, B, …, Z, AA…) → 0-based index.
function colIndex(letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function cellsOf(rowXml: string, shared: string[]): string[] {
  const out: string[] = []
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
  let m: RegExpExecArray | null
  while ((m = cellRe.exec(rowXml))) {
    const attrs = m[1] || ''
    const inner = m[2] || ''
    const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1]
    const col = ref ? colIndex(ref) : out.length
    const t = /t="([^"]+)"/.exec(attrs)?.[1]
    const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]
    const inlineT = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1]
    let val = ''
    if (t === 's' && v != null) val = shared[parseInt(v, 10)] ?? ''
    else if (v != null) val = v
    else if (inlineT != null) val = inlineT
    out[col] = decodeXml(val).trim()
  }
  return out
}

export async function parseXlsx(buf: Buffer): Promise<Record<string, string>[]> {
  const zip = await JSZip.loadAsync(buf)

  // Shared strings.
  const sharedXml = (await zip.file('xl/sharedStrings.xml')?.async('string')) || ''
  const shared: string[] = []
  for (const si of sharedXml.match(/<si>[\s\S]*?<\/si>/g) || []) {
    const texts = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => decodeXml(x[1]))
    shared.push(texts.join(''))
  }

  // First worksheet.
  const sheetPath =
    Object.keys(zip.files).find((f) => /^xl\/worksheets\/sheet1\.xml$/i.test(f)) ||
    Object.keys(zip.files).find((f) => /^xl\/worksheets\/.*\.xml$/i.test(f))
  if (!sheetPath) return []
  const sheetXml = (await zip.file(sheetPath)!.async('string')) || ''

  const rows = (sheetXml.match(/<row\b[\s\S]*?<\/row>/g) || []).map((r) => cellsOf(r, shared))
  const nonEmpty = rows.filter((r) => r.some((c) => c && c.trim()))
  if (!nonEmpty.length) return []

  // Header row = the one that looks like field names (has SKU/Brand/Title/Product).
  const looksLikeHeader = (r: string[]) => {
    const joined = r.join(' ').toLowerCase()
    return /\bsku\b/.test(joined) || (/brand/.test(joined) && /(title|tile|product)/.test(joined))
  }
  const headerIdx = nonEmpty.findIndex(looksLikeHeader)
  const hIdx = headerIdx >= 0 ? headerIdx : 0
  const headers = nonEmpty[hIdx].map((h) => (h || '').trim())
  const dataRows = nonEmpty.slice(hIdx + 1)

  return dataRows.map((r) => {
    const o: Record<string, string> = {}
    headers.forEach((h, i) => { if (h) o[h] = (r[i] || '').trim() })
    return o
  })
}

// Pull a field from a row by fuzzy header match (headers vary/have trailing spaces
// and a "Product Tile" typo in the template).
export function rowField(row: Record<string, string>, ...needles: string[]): string {
  const keys = Object.keys(row)
  for (const needle of needles) {
    const k = keys.find((x) => x.toLowerCase().replace(/\s+/g, ' ').trim().includes(needle.toLowerCase()))
    if (k && row[k]) return row[k]
  }
  return ''
}
