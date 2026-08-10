import {
  FIELD_ALIASES,
  MATCH_THRESHOLD,
  STANDARD_FIELDS,
  normalizeHeader,
  tokenOverlap,
  type StandardField,
} from './aliases'

/*
 * autoMapHeader
 * Exact normalized match wins; otherwise best token-overlap ≥ threshold.
 * @returns the mapped standard field, or null ("Not mapped")
 */
export function autoMapHeader(header: string): StandardField | null {
  const norm = normalizeHeader(header)
  const raw = header.toLowerCase()
  let best: { field: StandardField; score: number } | null = null
  for (const field of STANDARD_FIELDS) {
    for (const alias of FIELD_ALIASES[field]) {
      const a = normalizeHeader(alias)
      if (a === norm) return field
      // ponytail: overlap on the lowercased raw strings, not `norm` — norm has
      // no separators left, so tokenization would yield one token and overlap 0
      const score = tokenOverlap(raw, alias.toLowerCase())
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { field, score }
    }
  }
  return best?.field ?? null
}

/*
 * autoMapHeaders
 * @returns per-header mapping in header order (null = not mapped)
 */
export function autoMapHeaders(headers: string[]): Map<string, StandardField | null> {
  return new Map(headers.map((h) => [h, autoMapHeader(h)]))
}

/*
 * suggestCategory
 * First non-empty value of the header mapped to 'category' (spec D5).
 * Fuzzy-match against the taxonomy happens in the wizard (Task 7).
 */
export function suggestCategory(
  rows: Record<string, string>[],
  mapping: Map<string, StandardField | null>,
): string {
  const header = [...mapping.entries()].find(([, f]) => f === 'category')?.[0]
  if (!header) return ''
  for (const row of rows) {
    const v = row[header]?.trim()
    if (v) return v
  }
  return ''
}
