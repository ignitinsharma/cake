import { db } from '@/lib/db'
import type { PrismaClient } from '@/generated/prisma/client'

/*
 * Rate limit
 * DB-backed fixed-window counter keyed by string (e.g. `generate:<userId>`).
 * ponytail: fixed window, not sliding; swappable for Upstash behind this file.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  prisma: PrismaClient = db,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const now = Date.now()
  await prisma.rateLimit.updateMany({
    where: { key, windowStart: { lt: new Date(now - windowMs) } },
    data: { windowStart: new Date(now), count: 0 },
  })
  await prisma.rateLimit.upsert({
    where: { key },
    update: { count: { increment: 1 } },
    create: { key, windowStart: new Date(now), count: 1 },
  })
  const row = await prisma.rateLimit.findUniqueOrThrow({ where: { key } })
  if (row.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - row.windowStart.getTime())) / 1000))
    return { ok: false, retryAfterSec }
  }
  return { ok: true, retryAfterSec: 0 }
}
