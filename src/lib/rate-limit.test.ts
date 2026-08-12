import { beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { consumeRateLimit } from './rate-limit'

const p = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file::memory:' }) })

beforeAll(async () => {
  await p.$executeRawUnsafe(
    `CREATE TABLE "RateLimit" ("key" TEXT NOT NULL PRIMARY KEY, "windowStart" DATETIME NOT NULL, "count" INTEGER NOT NULL)`,
  )
})

describe('rate limit', () => {
  it('allows calls under the limit', async () => {
    const r = await consumeRateLimit('test-user-a', 3, 60_000, p)
    expect(r.ok).toBe(true)
  })
  it('blocks calls over the limit', async () => {
    const key = `test-user-b-${Date.now()}`
    await consumeRateLimit(key, 2, 60_000, p)
    await consumeRateLimit(key, 2, 60_000, p)
    const r = await consumeRateLimit(key, 2, 60_000, p)
    expect(r.ok).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThan(0)
  })
  it('resets after the window expires', async () => {
    const key = `test-user-c-${Date.now()}`
    await consumeRateLimit(key, 1, 10, p)
    await consumeRateLimit(key, 1, 10, p)
    const blocked = await consumeRateLimit(key, 1, 10, p)
    expect(blocked.ok).toBe(false)
    await new Promise((r) => setTimeout(r, 30))
    const after = await consumeRateLimit(key, 1, 10, p)
    expect(after.ok).toBe(true)
  })
  it('separates keys', async () => {
    const k1 = `sep-a-${Date.now()}`
    const k2 = `sep-b-${Date.now()}`
    await consumeRateLimit(k1, 1, 60_000, p)
    await consumeRateLimit(k1, 1, 60_000, p)
    const r2 = await consumeRateLimit(k2, 1, 60_000, p)
    expect(r2.ok).toBe(true)
  })
})
