'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { allInCategory, type BatchProduct } from '@/lib/engine/build-rows'
import { validateForTemplate } from '@/lib/engine/validate'
import { resolveCategoryPath } from '@/lib/category-path'
import { consumeRateLimit } from '@/lib/rate-limit'

/*
 * generateBatchAction
 * Renders ONE platform file from N products (all same category).
 * Creates one Generation row per product sharing the same fileName;
 * the download route re-renders the whole batch from those siblings.
 */
export async function generateBatchAction(data: {
  productIds: string[]
  platform: Platform
  format: 'csv' | 'xlsx'
  categorySlug: string
}): Promise<{ downloadUrl: string } | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const userId = session.user.id as string
  const rl = await consumeRateLimit(`generate:${userId}`, 60, 60_000)
  if (!rl.ok) return { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }
  if (data.productIds.length === 0) return { error: 'No products selected' }

  const products = await db.product.findMany({
    where: { id: { in: data.productIds }, userId },
    include: { variants: true },
  })
  if (products.length !== data.productIds.length) return { error: 'One or more products not found' }
  if (!allInCategory(products, data.categorySlug)) {
    return { error: 'All products must be in the same category' }
  }
  const template = getTemplate(data.platform, data.categorySlug)
  if (!template) return { error: 'No template for this platform and category' }

  const batch: BatchProduct[] = []
  const issues: { product: string; message: string }[] = []
  for (const p of products) {
    const item: BatchProduct = {
      product: {
        title: p.title,
        description: p.description,
        brand: p.brand,
        hsn: p.hsn,
        gstRate: p.gstRate,
        categoryPath: await resolveCategoryPath(p.categorySlug, data.platform),
      },
      variants: p.variants.map((v) => ({
        sku: v.sku, size: v.size, color: v.color, mrp: v.mrp, price: v.price, stock: v.stock, weightGrams: v.weightGrams,
      })),
    }
    const found = validateForTemplate(item.product, item.variants, template)
    if (found.length > 0) issues.push({ product: p.title, message: found[0].message })
    batch.push(item)
  }
  if (issues.length > 0) {
    return { error: `${issues.length} product(s) failed validation — ${issues[0].product}: ${issues[0].message}` }
  }

  const fileName = `${data.platform.toLowerCase()}-${data.categorySlug}-batch.${data.format}`
  const generations = await db.$transaction(
    products.map((p) =>
      db.generation.create({
        data: {
          userId,
          productId: p.id,
          platform: data.platform,
          categorySlug: p.categorySlug,
          templateVersion: template.version,
          fileName,
        },
      }),
    ),
  )
  return { downloadUrl: `/api/generate/${generations[0].id}?format=${data.format}` }
}