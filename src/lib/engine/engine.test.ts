import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { validateForTemplate } from './validate'
import { buildRows } from './build-rows'
import { toCSV, toXLSX } from './serialize'
import { generateFile } from './index'
import * as XLSX from 'xlsx'

const product: StandardProduct = {
  title: 'Men Cotton T-Shirt',
  description: 'Soft 100% cotton tee',
  brand: 'MyBrand',
  hsn: '6109',
  gstRate: 5,
  categoryPath: "Clothing > Men's Wear > T-Shirts",
}
const variants: VariantInput[] = [
  { sku: 'TS-BLK-M', size: 'M', color: 'Black', mrp: 999, price: 599, stock: 10, weightGrams: 150 },
]

/*
 * Engine behavior: validation, one row per variant, exact CSV/XLSX output.
 */
describe('engine', () => {
  const template = getTemplate(Platform.FLIPKART, 'mens-tshirts')!

  it('validates complete product with no issues', () => {
    expect(validateForTemplate(product, variants, template)).toEqual([])
  })
  it('flags a missing required source (no description)', () => {
    const issues = validateForTemplate({ ...product, description: '' }, variants, template)
    expect(issues.some((i) => i.column === 'Product Description')).toBe(true)
  })
  it('builds header row + one row per variant with correct values', () => {
    const rows = buildRows(product, variants, template)
    expect(rows[0]).toEqual(template.columns.map((c) => c.name))
    expect(rows).toHaveLength(2)
    expect(rows[1]).toContain('TS-BLK-M')
    expect(rows[1]).toContain('599')
  })
  it('builds a row per variant', () => {
    const rows = buildRows(product, [...variants, { ...variants[0], sku: 'TS-BLK-L', size: 'L' }], template)
    expect(rows).toHaveLength(3)
  })
  it('CSV quotes commas, quotes, and newlines (RFC 4180)', () => {
    const csv = toCSV([['a', 'b'], ['x,y', 'say "hi"', 'line\nbreak']])
    expect(csv).toBe('a,b\r\n"x,y","say ""hi""","line\nbreak"\r\n')
  })
  it('XLSX round-trips with header row preserved', () => {
    const rows = buildRows(product, variants, template)
    const buf = toXLSX(rows)
    const wb = XLSX.read(buf, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
    expect(data[0]).toEqual(template.columns.map((c) => c.name))
    expect(data).toHaveLength(2)
  })
  it('generateFile returns rows, csv, and xlsx', () => {
    const out = generateFile(product, variants, template)
    expect(out.csv).toContain('TS-BLK-M')
    expect(out.xlsx.length).toBeGreaterThan(0)
  })
})