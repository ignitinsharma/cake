'use server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { RegisterSchema } from '@/lib/validations/auth.schema'
import { consumeRateLimit } from '@/lib/rate-limit'

/*
 * registerAction
 * Creates a User + Company from signup form data.
 * @param data - raw form payload
 * @returns { ok: true, userId } or { error: string }
 */
export async function registerAction(data: unknown) {
  const parsed = RegisterSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid form data' }
  const { email, password, businessName, gstin, brandName, returnAddress, warehousePin } = parsed.data
  const rl = await consumeRateLimit(`register:${email}`, 10, 300_000)
  if (!rl.ok) return { error: 'Too many signup attempts. Try again in a few minutes.' }
  const exists = await db.user.findUnique({ where: { email } })
  if (exists) return { error: 'Account already exists' }
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      company: {
        create: { businessName, gstin, brandName, returnAddress, warehousePin: warehousePin || null },
      },
    },
  })
  return { ok: true as const, userId: user.id }
}