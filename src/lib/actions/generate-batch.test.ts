import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { allInCategory, buildBatchRows, buildRows, type BatchProduct } from '@/lib/engine/build-rows'

/*
 * generateBatchAction
 * The action is a server action (auth + DB); unit-test the pure helpers it calls.
 */

const product = (title: string): StandardProduct => ({
  title,
  description: `Soft 100% cotton tee — ${title}`,
  brand: 'MyBrand',
  hsn: '61091000',
  gstRate: 5,
  categoryPath: "Clothing > Men's Wear > T-Shirts",
})

const variants = (skus: string[]): VariantInput[] =>
  skus.map((sku, i) => ({
    sku,
    size: ['S', 'M', 'L', 'XL'][i],
    color: 'Black',
    mrp: 999,
    price: 599,
    stock: 10,
    weightGrams: 150,
  }))

/*
 * buildBatchRows
 * One header + all products' variant rows concatenated (per-product buildRows output).
 */
describe('buildBatchRows', () => {
  const template = getTemplate(Platform.FLIPKART, 'mens-tshirts')!

  it('returns header + one row per variant across products', () => {
    const batch: BatchProduct[] = [
      { product: product('A'), variants: variants(['A1']) },
      { product: product('B'), variants: variants(['B1', 'B2']) },
    ]
    const rows = buildBatchRows(batch, template)
    expect(rows[0]).toEqual(template.columns.map((c) => c.name))
    expect(rows).toHaveLength(4) // header + 3 variant rows
    expect(rows.flat().join('\x00')).toContain('A1')
    expect(rows.flat().join('\x00')).toContain('B2')
  })

  it('returns just the header for zero variants', () => {
    const rows = buildBatchRows([{ product: product('A'), variants: [] }], template)
    expect(rows).toHaveLength(1)
  })

  it('matches the single-product buildRows path (batch rows == single rows)', () => {
    const one = { product: product('A'), variants: variants(['A1', 'A2']) }
    expect(buildBatchRows([one], template)).toEqual(buildRows(one.product, one.variants, template))
  })
})

/*
 * allInCategory
 * Mixed-category selections are rejected before any rendering.
 */
describe('allInCategory', () => {
  it('accepts a same-category selection', () => {
    expect(allInCategory([{ categorySlug: 'mens-tshirts' }, { categorySlug: 'mens-tshirts' }], 'mens-tshirts')).toBe(true)
  })
  it('rejects a mixed-category selection', () => {
    expect(allInCategory([{ categorySlug: 'mens-tshirts' }, { categorySlug: 'kids-tshirts' }], 'mens-tshirts')).toBe(false)
  })
})