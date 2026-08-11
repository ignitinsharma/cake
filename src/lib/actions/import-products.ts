'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { MAX_IMPORT_ROWS } from '@/lib/import/parse'
import { importRowSchema, type ImportRow } from '@/lib/import/import-schema'
import { consumeRateLimit } from '@/lib/rate-limit'

/*
 * ImportResult
 * created = valid rows persisted; errors = skipped rows with reasons (spec D4).
 */
export interface ImportResult {
  created: number
  errors: { row: number; reason: string }[]
}

/*
 * importProductsAction
 * Validates every row, backfills hsn/gstRate from the category defaults,
 * and bulk-creates each valid row as Product + one Variant in one transaction.
 */
export async function importProductsAction(data: {
  categorySlug: string
  rows: ImportRow[]
}): Promise<ImportResult> {
  const session = await auth()
  const failAll = (reason: string): ImportResult => ({
    created: 0,
    errors: data.rows.map((r) => ({ row: r.fileRow, reason })),
  })
  if (!session?.user) return failAll('unauthorized')
  if (data.rows.length > MAX_IMPORT_ROWS) {
    return failAll(`File exceeds the ${MAX_IMPORT_ROWS}-row limit`)
  }
  const userId = session.user.id as string
  const rl = await consumeRateLimit(`import:${userId}`, 30, 60_000)
  if (!rl.ok) return failAll(`Too many requests. Try again in ${rl.retryAfterSec}s.`)
  const category = await db.category.findUnique({ where: { slug: data.categorySlug } })
  if (!category) return failAll('unknown category')

  const errors: { row: number; reason: string }[] = []
  const valid: ReturnType<typeof importRowSchema.parse>[] = []
  for (const r of data.rows) {
    const parsed = importRowSchema.safeParse(r)
    if (!parsed.success) {
      errors.push({ row: r.fileRow, reason: parsed.error.issues[0]?.message ?? 'invalid row' })
      continue
    }
    valid.push(parsed.data)
  }

  await db.$transaction(
    valid.map((row) =>
      db.product.create({
        data: {
          userId,
          title: row.title,
          description: row.description ?? '',
          brand: row.brand ?? '',
          categorySlug: data.categorySlug,
          hsn: row.hsn && row.hsn.trim() ? row.hsn : category.defaultHsn,
          gstRate: row.gstRate ?? category.defaultGstRate,
          variants: {
            create: {
              sku: row.sku,
              size: row.size,
              color: row.color ?? '',
              mrp: row.mrp ?? 0,
              price: row.price,
              stock: row.stock ?? 0,
              weightGrams: row.weightGrams ?? 0,
            },
          },
        },
      }),
    ),
  )
  return { created: valid.length, errors }
}
