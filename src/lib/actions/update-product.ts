'use server'
import { auth } from '@/lib/auth'
import { consumeRateLimit } from '@/lib/rate-limit'
import { type VariantEditRow } from '@/lib/validations/variant-rows'
import { updateProductFields } from '@/lib/validations/update-product'

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
