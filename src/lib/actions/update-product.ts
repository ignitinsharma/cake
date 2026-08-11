'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import type { PrismaClient } from '@/generated/prisma/client'
import { consumeRateLimit } from '@/lib/rate-limit'
import { validateVariantRows, type VariantEditRow } from '@/lib/validations/variant-rows'

/*
 * updateProductFields
 * Updates product fields and replaces all variants in one transaction.
 * Prisma is a param (defaulting to the app db) so tests can drive an
 * in-memory client — same pattern as consumeRateLimit.
 */
export async function updateProductFields(
  data: {
    productId: string
    userId: string
    title: string
    description: string
    brand: string
    hsn: string
    gstRate: number
    variants: VariantEditRow[]
  },
  prisma: PrismaClient = db,
): Promise<{ ok: true } | { error: string }> {
  if (!data.title.trim()) return { error: 'Title is required' }
  const variantIssues = validateVariantRows(data.variants)
  if (variantIssues.length > 0) return { error: variantIssues[0] }

  const product = await prisma.product.findFirst({ where: { id: data.productId, userId: data.userId } })
  if (!product) return { error: 'Product not found' }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: data.productId },
      data: { title: data.title, description: data.description, brand: data.brand, hsn: data.hsn, gstRate: data.gstRate },
    }),
    prisma.variant.deleteMany({ where: { productId: data.productId } }),
    prisma.variant.createMany({
      data: data.variants.map((v) => ({ ...v, productId: data.productId })),
    }),
  ])
  return { ok: true }
}

/*
 * updateProductAction
 * Auth + rate limit, then the transaction core.
 */
export async function updateProductAction(data: {
  productId: string
  title: string
  description: string
  brand: string
  hsn: string
  gstRate: number
  variants: VariantEditRow[]
}): Promise<{ ok: true } | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const userId = session.user.id as string
  const rl = await consumeRateLimit(`update:${userId}`, 60, 60_000)
  if (!rl.ok) return { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }
  return updateProductFields({ ...data, userId })
}
