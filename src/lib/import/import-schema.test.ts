import { describe, expect, it } from 'vitest'
import { importRowSchema, toNumber } from './import-schema'

const base = { fileRow: 1, title: 'Tee', sku: 'S1', price: '499', size: 'M' }

describe('toNumber', () => {
  it('strips commas, currency and letters', () => {
    expect(toNumber('1,299')).toBe(1299)
    expect(toNumber('₹499')).toBe(499)
    expect(toNumber('GST18')).toBe(18)
  })
  it('undefined for empty, null for garbage', () => {
    expect(toNumber('')).toBeUndefined()
    expect(toNumber('abc')).toBeNull()
  })
  it('toNumber tolerates non-string input without throwing', () => {
    expect(toNumber(undefined)).toBeUndefined()
    // @ts-expect-error crafted payload
    expect(toNumber(42)).toBeNull()
    // @ts-expect-error crafted payload
    expect(toNumber({})).toBeNull()
  })
})

describe('importRowSchema', () => {
  it('accepts a valid row', () => {
    expect(importRowSchema.parse(base).price).toBe(499)
  })
  it('flags missing title, sku and size', () => {
    expect(() => importRowSchema.parse({ ...base, title: '' })).toThrow('missing title')
    expect(() => importRowSchema.parse({ ...base, sku: '' })).toThrow('missing sku')
    expect(() => importRowSchema.parse({ ...base, size: '' })).toThrow('missing size')
  })
  it('flags invalid price', () => {
    expect(() => importRowSchema.parse({ ...base, price: 'free' })).toThrow('invalid price')
    expect(() => importRowSchema.parse({ ...base, price: '-5' })).toThrow('invalid price')
  })
  it('coerces numeric fields with commas', () => {
    const row = importRowSchema.parse({ ...base, mrp: '1,299', stock: '50', weightGrams: '200.5' })
    expect(row.mrp).toBe(1299)
    expect(row.stock).toBe(50)
    expect(row.weightGrams).toBe(200.5)
  })
})
