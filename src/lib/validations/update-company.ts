import { db } from '@/lib/db'
import type { PrismaClient } from '@/generated/prisma/client'

/*
 * updateCompanyFields
 * Validates and upserts the caller's company row (keyed by userId).
 * Prisma is a param (defaulting to the app db) so tests can drive an
 * in-memory client — same pattern as updateProductFields.
 */
export async function updateCompanyFields(
  data: {
    userId: string
    businessName: string
    gstin: string
    brandName: string
    returnAddress?: string
    warehousePin?: string
    platformSellerIds: Record<string, string>
  },
  prisma: PrismaClient = db,
): Promise<{ ok: true } | { error: string }> {
  if (!data.businessName.trim()) return { error: 'Business name is required' }
  if (!data.gstin.trim()) return { error: 'GSTIN is required' }
  if (!data.brandName.trim()) return { error: 'Brand name is required' }

  // ponytail: drop blank/whitespace-only ids so the JSON stays clean
  const platformSellerIds = Object.fromEntries(
    Object.entries(data.platformSellerIds).filter(([, v]) => v.trim() !== ''),
  )

  await prisma.company.upsert({
    where: { userId: data.userId },
    create: {
      userId: data.userId,
      businessName: data.businessName,
      gstin: data.gstin,
      brandName: data.brandName,
      returnAddress: data.returnAddress || null,
      warehousePin: data.warehousePin || null,
      platformSellerIds,
    },
    update: {
      businessName: data.businessName,
      gstin: data.gstin,
      brandName: data.brandName,
      returnAddress: data.returnAddress || null,
      warehousePin: data.warehousePin || null,
      platformSellerIds,
    },
  })
  return { ok: true }
}