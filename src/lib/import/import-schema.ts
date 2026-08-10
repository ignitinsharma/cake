import { z } from 'zod'

/*
 * ImportRow
 * A CSV row mapped to standard fields (string values straight from the file).
 */
export interface ImportRow {
  fileRow: number
  title: string
  description?: string
  brand?: string
  sku: string
  mrp?: string
  price: string
  size: string
  color?: string
  stock?: string
  weightGrams?: string
  hsn?: string
  gstRate?: string
}

/*
 * toNumber
 * "1,299" → 1299, "GST18" → 18, "₹499" → 499.
 * Empty → undefined (missing); unparseable → null (invalid).
 */
export function toNumber(raw: string | undefined): number | null | undefined {
  if (raw == null || raw.trim() === '') return undefined
  const cleaned = raw.replace(/[^\d.\-]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

const num = (error: string) =>
  z.preprocess((v) => toNumber(v as string | undefined), z.number({ error }).nonnegative())

/*
 * importRowSchema
 * Per-row validation (spec §6.2). Required: title, sku, price (> 0), size.
 * hsn/gstRate stay optional — the category defaults backfill them at load.
 */
export const importRowSchema = z.object({
  fileRow: z.number(),
  title: z.string().min(1, { error: 'missing title' }),
  sku: z.string().min(1, { error: 'missing sku' }),
  size: z.string().min(1, { error: 'missing size' }),
  price: z.preprocess(
    (v) => toNumber(v as string | undefined),
    z.number({ error: 'invalid price' }).positive({ error: 'invalid price' }),
  ),
  mrp: num('invalid number: MRP').optional(),
  stock: z
    .preprocess(
      (v) => toNumber(v as string | undefined),
      z.number({ error: 'invalid number: Stock' }).nonnegative().int(),
    )
    .optional(),
  weightGrams: num('invalid number: Weight').optional(),
  gstRate: num('invalid number: GST rate').optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  hsn: z.string().optional(),
})

export type ValidImportRow = z.infer<typeof importRowSchema>
