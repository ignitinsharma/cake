/*
 * STANDARD_FIELDS
 * The neutral fields an imported CSV maps into. 'category' is a pseudo-field
 * that only drives the file-level category suggestion (spec D5).
 */
export const STANDARD_FIELDS = [
  'title', 'description', 'brand', 'sku', 'mrp', 'price', 'size', 'color',
  'stock', 'weightGrams', 'hsn', 'gstRate', 'category',
] as const

export type StandardField = (typeof STANDARD_FIELDS)[number]

/*
 * FIELD_ALIASES
 * Fuzzy-match sources per standard field (spec §6.1).
 */
export const FIELD_ALIASES: Record<StandardField, string[]> = {
  title: ['title', 'product title', 'product name', 'item title', 'name'],
  description: ['description', 'product description', 'long description', 'details'],
  brand: ['brand', 'brand name'],
  sku: ['sku', 'seller sku', 'style code', 'part number', 'item code', 'product code'],
  mrp: ['mrp', 'list price', 'maximum retail price', 'mrp price'],
  price: ['selling price', 'price', 'sale price', 'offer price', 'standard price'],
  size: ['size', 'size name'],
  color: ['color', 'colour', 'color name', 'colour name'],
  stock: ['stock', 'quantity', 'available quantity', 'stock quantity', 'qty'],
  weightGrams: ['weight', 'weight (g)', 'item weight', 'weight in grams', 'gross weight'],
  hsn: ['hsn', 'hsn code'],
  gstRate: ['gst %', 'gst rate', 'tax code', 'tax %', 'igst'],
  category: ['category', 'product category', 'category path', 'category name'],
}

/*
 * normalizeHeader
 * Lowercase; strip spaces/underscores/parens/dashes/dots; keep letters, digits, %.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s_()\-–—.]+/g, '')
    .replace(/[^a-z0-9%]/g, '')
}

/*
 * tokenOverlap
 * |shared tokens| / |max tokens| — 1 for identical sets, 0 for disjoint.
 */
export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.split(/[^a-z0-9]+/).filter(Boolean))
  const tb = new Set(b.split(/[^a-z0-9]+/).filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.max(ta.size, tb.size)
}

/*
 * MATCH_THRESHOLD
 * Minimum token-overlap score for an auto-map; below → "Not mapped" (spec §6.1).
 */
export const MATCH_THRESHOLD = 0.5
