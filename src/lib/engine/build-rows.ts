import type { PlatformTemplate } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { fieldValue } from './validate'

/*
 * buildRows
 * Renders the header row plus one row per variant.
 * Values are formatted per the column type (numbers stay numeric).
 * @returns string[][] — first row is headers
 */
export function buildRows(
  product: StandardProduct,
  variants: VariantInput[],
  template: PlatformTemplate,
): string[][] {
  const header = template.columns.map((c) => c.name)
  const rows = variants.map((variant) =>
    template.columns.map((c) => {
      const raw = fieldValue(c.source, product, variant, c.default)
      if (c.type === 'number' || c.type === 'int') return String(Number(raw) || 0)
      return raw
    }),
  )
  return [header, ...rows]
}

/*
 * BatchProduct
 * One product's render inputs (product + variants) for row assembly.
 */
export interface BatchProduct {
  product: StandardProduct
  variants: VariantInput[]
}

/*
 * findDuplicateSkus
 * Scans every product's variants in file order with one SKU->productTitle
 * map. Returns the first colliding pair (first-seen SKU), reporting the
 * SECOND occurrence: its product title and 1-based file row (header = row 1,
 * first data row = row 2). Null when every SKU in the file is unique.
 */
export function findDuplicateSkus(
  batch: BatchProduct[],
): { sku: string; productTitle: string; row: number } | null {
  const seen = new Map<string, string>()
  let row = 1
  for (const { product, variants } of batch) {
    for (const variant of variants) {
      row++
      if (seen.has(variant.sku)) {
        return { sku: variant.sku, productTitle: product.title, row }
      }
      seen.set(variant.sku, product.title)
    }
  }
  return null
}

/*
 * allInCategory
 * True when every product shares the selected categorySlug (design doc D4).
 */
export function allInCategory(products: { categorySlug: string }[], categorySlug: string): boolean {
  return products.every((p) => p.categorySlug === categorySlug)
}

/*
 * buildBatchRows
 * One header + each product's buildRows data rows concatenated, so batch
 * rows are byte-identical to single-product rows.
 */
export function buildBatchRows(products: BatchProduct[], template: PlatformTemplate): string[][] {
  return [
    template.columns.map((c) => c.name),
    ...products.flatMap(({ product, variants }) => buildRows(product, variants, template).slice(1)),
  ]
}