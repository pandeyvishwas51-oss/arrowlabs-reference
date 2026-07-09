// Demand estimation from free signals. This is the part of Helium 10 / Jungle Scout
// we can approximate for free: they turn Best Seller Rank into an estimated sales
// figure using category rank-to-sales curves, and we scrape BSR already.
//
// Honesty: absolute monthly-sales numbers are estimates, not truth. The real
// calibration is per category node and improves once we have any ground-truth point
// (one product's known sales, or the brand's Amazon Brand Analytics data). Kept in one
// file so that calibration later touches only here.

/** Rough rank-to-sales power law. a and b are per-category in reality; these are
 *  conservative generic defaults tuned to land in the right order of magnitude. */
const DEFAULT_CURVE = { a: 90000, b: 0.75 }

// A few category overrides can be added as we calibrate. Keys are loose category hints.
const CURVES: Record<string, { a: number; b: number }> = {
  default: DEFAULT_CURVE,
  home: { a: 70000, b: 0.72 },
  toys: { a: 60000, b: 0.7 },
  clothing: { a: 120000, b: 0.78 },
}

function curveFor(category?: string) {
  if (!category) return CURVES.default
  const c = category.toLowerCase()
  if (/home|kitchen|bed|furnish/.test(c)) return CURVES.home
  if (/toy|game|play/.test(c)) return CURVES.toys
  if (/cloth|apparel|fashion|wear/.test(c)) return CURVES.clothing
  return CURVES.default
}

/** Estimated monthly unit sales from a Best Seller Rank. 0 when unknown. */
export function estimateMonthlySales(bsr?: number, category?: string): number {
  if (!bsr || bsr <= 0) return 0
  const { a, b } = curveFor(category)
  return Math.max(0, Math.round(a * Math.pow(bsr, -b)))
}

/** A 0 to 100 demand score from BSR on a log scale (BSR 1 is ~100, BSR 100000 is ~0).
 *  Useful for ranking best-sellers and keywords without claiming absolute volume. */
export function bsrDemandScore(bsr?: number): number {
  if (!bsr || bsr <= 0) return 0
  const score = 100 - (Math.log10(bsr) / 5) * 100
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Parse a BSR integer out of the free-text rank Amazon shows (e.g. "#1,234 in Home"). */
export function parseBsr(raw?: string | number | null): number | undefined {
  if (typeof raw === 'number') return raw > 0 ? raw : undefined
  if (!raw) return undefined
  const m = String(raw).replace(/,/g, '').match(/#?(\d{1,8})/)
  return m ? Number(m[1]) : undefined
}
