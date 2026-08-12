import { importRowSchema, type ImportRow } from '@/lib/import/import-schema'

/*
 * VariantEditRow
 * One variant row from the edit table.
 */
export interface VariantEditRow {
  sku: string
  size: string
  color: string
  mrp: number
  price: number
  stock: number
  weightGrams: number
}

/*
 * validateVariantRows
 * Reuses import-schema row validation on variant fields.
 * @returns issue messages (empty when valid)
 */
export function validateVariantRows(rows: VariantEditRow[]): string[] {
  if (rows.length === 0) return ['At least one variant is required']
  const issues: string[] = []
  for (const r of rows) {
    const row: ImportRow = {
      fileRow: 0,
      title: 'x',
      sku: r.sku,
      price: String(r.price),
      size: r.size,
      color: r.color,
      mrp: String(r.mrp),
      stock: String(r.stock),
      weightGrams: String(r.weightGrams),
    }
    const parsed = importRowSchema.safeParse(row)
    if (!parsed.success) issues.push(parsed.error.issues[0]?.message ?? 'invalid variant')
  }
  return issues
}
