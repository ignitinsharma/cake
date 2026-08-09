'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { generateFile } from '@/lib/engine'
import { resolveCategoryPath } from '@/lib/category-path'

/*
 * generateFileAction
 * Validates and renders the platform file, records a Generation row,
 * and returns a download URL (file re-rendered on demand by the route).
 * ponytail: no file storage yet — deterministic re-render from product data.
 */
export async function generateFileAction(
  productId: string,
  platform: Platform,
  format: 'csv' | 'xlsx',
): Promise<{ downloadUrl: string } | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const product = await db.product.findFirst({
    where: { id: productId, userId: session.user.id as string },
    include: { variants: true },
  })
  if (!product) return { error: 'Product not found' }
  const template = getTemplate(platform, product.categorySlug)
  if (!template) return { error: 'No template for this platform' }
  const result = generateFile(
    {
      title: product.title,
      description: product.description,
      brand: product.brand,
      hsn: product.hsn,
      gstRate: product.gstRate,
      categoryPath: await resolveCategoryPath(product.categorySlug, platform),
    },
    product.variants.map((v) => ({
      sku: v.sku, size: v.size, color: v.color, mrp: v.mrp, price: v.price, stock: v.stock, weightGrams: v.weightGrams,
    })),
    template,
  )
  if (result.issues.length > 0) return { error: result.issues[0].message }
  const fileName = `${platform.toLowerCase()}-${product.categorySlug}.${format}`
  const generation = await db.generation.create({
    data: {
      userId: session.user.id as string,
      productId,
      platform,
      categorySlug: product.categorySlug,
      templateVersion: template.version,
      fileName,
    },
  })
  return { downloadUrl: `/api/generate/${generation.id}?format=${format}` }
}