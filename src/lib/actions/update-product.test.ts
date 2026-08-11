import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { validateVariantRows, type VariantEditRow } from '@/lib/validations/variant-rows'
import { updateProductFields } from '@/lib/validations/update-product'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

/*
 * updateProductAction
 * Pure validation helper + DB core tested against an in-memory SQLite client
 * (same pattern as rate-limit.test.ts — the real dev.db is never touched).
 */

const p = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file::memory:' }) })

beforeAll(async () => {
  await p.$executeRawUnsafe(
    `CREATE TABLE "Product" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "brand" TEXT NOT NULL, "categorySlug" TEXT NOT NULL, "hsn" TEXT NOT NULL, "gstRate" REAL NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  )
  await p.$executeRawUnsafe(
    `CREATE TABLE "Variant" ("id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL, "sku" TEXT NOT NULL, "size" TEXT NOT NULL, "color" TEXT NOT NULL, "mrp" REAL NOT NULL, "price" REAL NOT NULL, "stock" INTEGER NOT NULL, "weightGrams" REAL NOT NULL)`,
  )
})

const row = (sku: string, overrides: Partial<VariantEditRow> = {}): VariantEditRow => ({
  sku,
  size: 'M',
  color: 'Black',
  mrp: 999,
  price: 599,
  stock: 10,
  weightGrams: 150,
  ...overrides,
})

async function seedProduct(variants: VariantEditRow[]): Promise<string> {
  const product = await p.product.create({
    data: {
      userId: 'u1',
      title: 'Tee',
      description: 'Soft cotton',
      brand: 'MyBrand',
      categorySlug: 'mens-tshirts',
      hsn: '61091000',
      gstRate: 5,
      variants: { create: variants },
    },
  })
  return product.id
}

describe('validateVariantRows', () => {
  const good = [row('TS-1')]
  it('passes valid rows', () => {
    expect(validateVariantRows(good)).toEqual([])
  })
  it('rejects a row missing sku', () => {
    const issues = validateVariantRows([{ ...good[0], sku: '' }])
    expect(issues.length).toBeGreaterThan(0)
  })
  it('rejects a non-positive price', () => {
    const issues = validateVariantRows([{ ...good[0], price: 0 }])
    expect(issues.some((i) => i.includes('price'))).toBe(true)
  })
  it('rejects an empty variant list', () => {
    const issues = validateVariantRows([])
    expect(issues.length).toBeGreaterThan(0)
  })
})

describe('updateProductFields', () => {
  it('adds variants to a product', async () => {
    const id = await seedProduct([row('A')])
    const res = await updateProductFields({
      productId: id,
      userId: 'u1',
      title: 'Tee',
      description: 'Soft cotton',
      brand: 'MyBrand',
      hsn: '61091000',
      gstRate: 5,
      variants: [row('A'), row('B')],
    }, p)
    expect(res).toEqual({ ok: true })
    const skus = (await p.variant.findMany({ where: { productId: id } })).map((v) => v.sku).sort()
    expect(skus).toEqual(['A', 'B'])
  })

  it('removes variants', async () => {
    const id = await seedProduct([row('A'), row('B')])
    const res = await updateProductFields({
      productId: id,
      userId: 'u1',
      title: 'Tee',
      description: 'Soft cotton',
      brand: 'MyBrand',
      hsn: '61091000',
      gstRate: 5,
      variants: [row('A')],
    }, p)
    expect(res).toEqual({ ok: true })
    const skus = (await p.variant.findMany({ where: { productId: id } })).map((v) => v.sku)
    expect(skus).toEqual(['A'])
  })

  it('updates variant and product fields', async () => {
    const id = await seedProduct([row('A')])
    const res = await updateProductFields({
      productId: id,
      userId: 'u1',
      title: 'New title',
      description: 'New desc',
      brand: 'NewBrand',
      hsn: '61112000',
      gstRate: 12,
      variants: [row('A', { price: 499, stock: 3 })],
    }, p)
    expect(res).toEqual({ ok: true })
    const product = await p.product.findUnique({ where: { id } })
    expect(product?.title).toBe('New title')
    expect(product?.gstRate).toBe(12)
    const vs = await p.variant.findMany({ where: { productId: id } })
    expect(vs).toHaveLength(1)
    expect(vs[0].price).toBe(499)
    expect(vs[0].stock).toBe(3)
  })

  it('rejects another user\'s product without changing it', async () => {
    const id = await seedProduct([row('A')])
    const res = await updateProductFields({
      productId: id,
      userId: 'other-user',
      title: 'Tee',
      description: 'Soft cotton',
      brand: 'MyBrand',
      hsn: '61091000',
      gstRate: 5,
      variants: [row('A')],
    }, p)
    expect(res).toEqual({ error: 'Product not found' })
    expect(await p.variant.count({ where: { productId: id } })).toBe(1)
  })

  it('rejects an unknown product', async () => {
    const res = await updateProductFields({
      productId: 'missing',
      userId: 'u1',
      title: 'Tee',
      description: 'Soft cotton',
      brand: 'MyBrand',
      hsn: '61091000',
      gstRate: 5,
      variants: [row('A')],
    }, p)
    expect(res).toEqual({ error: 'Product not found' })
  })

  it('rejects an empty title', async () => {
    const id = await seedProduct([row('A')])
    const res = await updateProductFields({
      productId: id,
      userId: 'u1',
      title: '   ',
      description: 'Soft cotton',
      brand: 'MyBrand',
      hsn: '61091000',
      gstRate: 5,
      variants: [row('A')],
    }, p)
    expect(res).toEqual({ error: 'Title is required' })
  })

  it('rejects invalid variants', async () => {
    const id = await seedProduct([row('A')])
    const res = await updateProductFields({
      productId: id,
      userId: 'u1',
      title: 'Tee',
      description: 'Soft cotton',
      brand: 'MyBrand',
      hsn: '61091000',
      gstRate: 5,
      variants: [row('B', { price: 0 })],
    }, p)
    if ('ok' in res) throw new Error('expected failure')
    expect(res.error).toContain('price')
  })
})
