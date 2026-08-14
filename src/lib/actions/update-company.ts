'use server'
import { auth } from '@/lib/auth'
import { consumeRateLimit } from '@/lib/rate-limit'
import { updateCompanyFields } from '@/lib/validations/update-company'

/*
 * updateCompanyAction
 * Auth + rate limit, then the upsert core.
 */
export async function updateCompanyAction(data: {
  businessName: string
  gstin: string
  brandName: string
  returnAddress?: string
  warehousePin?: string
  platformSellerIds: Record<string, string>
}): Promise<{ ok: true } | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const userId = session.user.id as string
  const rl = await consumeRateLimit(`update:${userId}`, 60, 60_000)
  if (!rl.ok) return { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }
  return updateCompanyFields({ ...data, userId })
}