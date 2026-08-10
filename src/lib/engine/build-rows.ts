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