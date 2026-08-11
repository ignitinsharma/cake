import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { validateForTemplate } from './validate'
import { buildRows } from './build-rows'
import { toCSV, toXLSX } from './serialize'
import { generateFile } from './index'
import type { ColumnRule, TemplateColumn } from '@/lib/templates/types'
import * as XLSX from 'xlsx'

const product: StandardProduct = {
  title: 'Men Cotton T-Shirt',
  description: 'Soft 100% cotton tee',
  brand: 'MyBrand',
  hsn: '61091000',
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
  it('CSV neutralizes formula-injection cells (= + - @)', () => {
    const csv = toCSV([['=SUM(A1)', '+123', '-cmd', '@ref', 'safe']])
    expect(csv).toBe("\"'=SUM(A1)\",\"'+123\",\"'-cmd\",\"'@ref\",safe\r\n")
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
  it('renders a valid file for every platform and t-shirt category', () => {
    for (const platform of ['FLIPKART', 'MYNTRA', 'AMAZON', 'MEESHO', 'SNAPDEAL', 'NYKAA', 'AJIO', 'FIRSTCRY']) {
      for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
        const t = getTemplate(platform as never, slug)!
        const out = generateFile(product, variants, t)
        expect(out.csv).toContain('TS-BLK-M')
        expect(out.xlsx.length).toBeGreaterThan(0)
        expect(out.issues).toEqual([])
      }
    }
  })
})

/*
 * Rule engine: enum, regex, min/max, url, unique-SKU.
 */
describe('rules', () => {
  const template = getTemplate(Platform.FLIPKART, 'mens-tshirts')!
  const ruleTemplate = (rules: Record<string, ColumnRule | undefined>) => ({
    ...template,
    columns: [
      { name: 'Size', source: 'size', required: true, type: 'string' as const, rules: rules.size },
      { name: 'Selling Price', source: 'price', required: true, type: 'number' as const, rules: rules.price },
      { name: 'Image URLs', source: 'images', required: false, type: 'string' as const, rules: rules.images },
      { name: 'Seller SKU', source: 'sku', required: true, type: 'string' as const, rules: rules.sku },
    ] satisfies TemplateColumn[],
  })

  it('flags a value outside an enum', () => {
    const t = ruleTemplate({ size: { enum: ['S', 'M', 'L'] } })
    const issues = validateForTemplate(product, [{ ...variants[0], size: 'XL' }], t)
    expect(issues.some((i) => i.message.includes('Size') && i.message.includes('S, M, L'))).toBe(true)
  })
  it('passes a value inside an enum', () => {
    const t = ruleTemplate({ size: { enum: ['S', 'M', 'L'] } })
    expect(validateForTemplate(product, [{ ...variants[0], size: 'M' }], t)).toEqual([])
  })
  it('flags a value failing a regex (HSN not 8 digits)', () => {
    const t = ruleTemplate({ size: { regex: '^\\d{8}$' } })
    const issues = validateForTemplate(product, variants, t)
    expect(issues.some((i) => i.message.includes('Size'))).toBe(true)
  })
  it('flags a price below min (0 allowed, negative rejected)', () => {
    const t = ruleTemplate({ price: { min: 1 } })
    const issues = validateForTemplate(product, [{ ...variants[0], price: 0 }], t)
    expect(issues.some((i) => i.column === 'Selling Price')).toBe(true)
  })
  it('flags a price above max', () => {
    const t = ruleTemplate({ price: { max: 1000 } })
    const issues = validateForTemplate(product, [{ ...variants[0], price: 9999 }], t)
    expect(issues.some((i) => i.column === 'Selling Price')).toBe(true)
  })
  it('flags a non-URL when url: true', () => {
    const t = ruleTemplate({ images: { url: true } })
    const issues = validateForTemplate(product, [...variants], t)
    expect(issues.some((i) => i.column === 'Image URLs')).toBe(true)
  })
  it('passes a valid URL when url: true', () => {
    const t = ruleTemplate({ images: { url: true } })
    const issues = validateForTemplate(
      { ...product },
      [{ ...variants[0], sku: 'X' }],
      { ...t, columns: [{ name: 'Image URLs', source: 'images', required: false, type: 'string', default: 'https://cdn.example.com/a.jpg' }] },
    )
    expect(issues).toEqual([])
  })
  it('flags duplicate SKUs within one file (unique: true)', () => {
    const t = ruleTemplate({ sku: { unique: true } })
    const issues = validateForTemplate(
      product,
      [variants[0], { ...variants[0], sku: 'TS-BLK-M', size: 'L' }],
      t,
    )
    expect(issues.some((i) => i.message.includes('duplicate SKU'))).toBe(true)
  })
  it('reports the actual row numbers when duplicates interleave (A, A, B, A)', () => {
    const t = ruleTemplate({ sku: { unique: true } })
    const issues = validateForTemplate(
      product,
      [
        { ...variants[0], sku: 'A' },
        { ...variants[0], sku: 'A', size: 'L' },
        { ...variants[0], sku: 'B', size: 'XL' },
        { ...variants[0], sku: 'A', size: 'XXL' },
      ],
      t,
    )
    const dups = issues.filter((i) => i.message.includes('duplicate SKU'))
    expect(dups).toHaveLength(2)
    expect(dups[0].message).toContain('rows 1 and 2')
    expect(dups[1].message).toContain('rows 1 and 4')
  })
  it('flags a malformed regex rule instead of throwing', () => {
    const t = ruleTemplate({ size: { regex: '(' } })
    const issues = validateForTemplate(product, variants, t)
    expect(issues.some((i) => i.message.includes('invalid format rule'))).toBe(true)
  })
  it('passes distinct SKUs (unique: true)', () => {
    const t = ruleTemplate({ sku: { unique: true } })
    const issues = validateForTemplate(
      product,
      [variants[0], { ...variants[0], sku: 'TS-BLK-L', size: 'L' }],
      t,
    )
    expect(issues).toEqual([])
  })
})

/*
 * Shared rule defaults present on every platform template.
 */
describe('shared rules', () => {
  for (const p of [Platform.FLIPKART, Platform.MYNTRA, Platform.AMAZON, Platform.MEESHO, Platform.SNAPDEAL, Platform.NYKAA, Platform.AJIO, Platform.FIRSTCRY]) {
    const t = getTemplate(p, 'mens-tshirts')!
    it(`${p}: GST 0-28, positive price, 8-digit HSN rules exist`, () => {
      const gst = t.columns.find((c) => c.source === 'gstRate')
      const price = t.columns.find((c) => c.source === 'price')
      const hsn = t.columns.find((c) => c.source === 'hsn')
      expect(gst?.rules?.min).toBe(0)
      expect(gst?.rules?.max).toBe(28)
      expect(price?.rules?.min).toBe(1)
      expect(hsn?.rules?.regex).toBe('^\\d{8}$')
    })
  }
})