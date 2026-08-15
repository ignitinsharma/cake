import { beforeAll, describe, expect, it, vi } from 'vitest'
import { updateCompanyFields } from '@/lib/validations/update-company'
import { testPrisma } from '@/lib/test-db'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

/*
 * updateCompanyFields
 * Postgres client in the `test` schema mirroring the Company table (same
 * pattern as update-product.test.ts — the real database is never touched).
 */

const p = await testPrisma()

beforeAll(async () => {
  await p.$executeRawUnsafe('DROP TABLE IF EXISTS "test"."Company" CASCADE')
  await p.$executeRawUnsafe(
    `CREATE TABLE "test"."Company" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "businessName" TEXT NOT NULL,
      "gstin" TEXT NOT NULL,
      "brandName" TEXT NOT NULL,
      "returnAddress" TEXT,
      "warehousePin" TEXT,
      "platformSellerIds" JSONB
    )`,
  )
  await p.$executeRawUnsafe(`CREATE UNIQUE INDEX "Company_userId_key" ON "test"."Company"("userId")`)
})

function payload(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'u1',
    businessName: 'Cake Ltd',
    gstin: '27AAABC1234F1Z5',
    brandName: 'Cake',
    returnAddress: '1 Main St',
    warehousePin: '400001',
    platformSellerIds: {},
    ...overrides,
  }
}

describe('updateCompanyFields', () => {
  it('creates the company row when none exists', async () => {
    const res = await updateCompanyFields(payload(), p)
    expect(res).toEqual({ ok: true })
    const company = await p.company.findUnique({ where: { userId: 'u1' } })
    expect(company).not.toBeNull()
    expect(company?.businessName).toBe('Cake Ltd')
  })

  it('updates an existing company and preserves other fields', async () => {
    await updateCompanyFields(payload(), p)
    const res = await updateCompanyFields(
      payload({ businessName: 'Cake Pvt Ltd', brandName: 'CakeKids' }),
      p,
    )
    expect(res).toEqual({ ok: true })
    const company = await p.company.findUnique({ where: { userId: 'u1' } })
    expect(company?.businessName).toBe('Cake Pvt Ltd')
    expect(company?.brandName).toBe('CakeKids')
    expect(company?.gstin).toBe('27AAABC1234F1Z5')
    expect(company?.returnAddress).toBe('1 Main St')
    expect(company?.warehousePin).toBe('400001')
  })

  it('round-trips platformSellerIds', async () => {
    await updateCompanyFields(payload({ platformSellerIds: { FLIPKART: 'abc', MEESHO: 'xyz' } }), p)
    const company = await p.company.findUnique({ where: { userId: 'u1' } })
    expect(company?.platformSellerIds).toEqual({ FLIPKART: 'abc', MEESHO: 'xyz' })
  })

  it('rejects an empty businessName', async () => {
    const res = await updateCompanyFields(payload({ businessName: '   ' }), p)
    expect(res).toEqual({ error: 'Business name is required' })
  })

  it('never touches another user\'s company', async () => {
    await updateCompanyFields(payload({ userId: 'u2', businessName: 'Rival Ltd' }), p)
    const res = await updateCompanyFields(payload({ userId: 'u1' }), p)
    expect(res).toEqual({ ok: true })
    expect(await p.company.count()).toBe(2)
    const rival = await p.company.findUnique({ where: { userId: 'u2' } })
    expect(rival?.businessName).toBe('Rival Ltd')
    expect(rival?.returnAddress).toBe('1 Main St')
  })
})