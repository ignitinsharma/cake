import { describe, expect, it } from 'vitest'
import { autoMapHeader, autoMapHeaders, suggestCategory } from './auto-map'
import { normalizeHeader, tokenOverlap } from './aliases'

describe('aliases', () => {
  it('normalizes case, spaces, underscores and parentheses', () => {
    expect(normalizeHeader('GST %')).toBe('gst%')
    expect(normalizeHeader('Product_Title (English)')).toBe('producttitleenglish')
  })
  it('scores identical token sets as 1', () => {
    expect(tokenOverlap('selling price', 'price selling')).toBe(1)
  })
})

describe('auto-map', () => {
  it('exact-matches headers to standard fields', () => {
    expect(autoMapHeader('Product Title')).toBe('title')
    expect(autoMapHeader('Seller SKU')).toBe('sku')
    expect(autoMapHeader('GST %')).toBe('gstRate')
  })
  it('matches via token overlap (extra words ok)', () => {
    expect(autoMapHeader('Product Title (English)')).toBe('title')
  })
  it('returns null for unmappable headers', () => {
    expect(autoMapHeader('Random Column Xyz')).toBeNull()
  })
  it('maps every header in a list', () => {
    const m = autoMapHeaders(['Product Name', 'Price', 'Nonsense'])
    expect(m.get('Product Name')).toBe('title')
    expect(m.get('Price')).toBe('price')
    expect(m.get('Nonsense')).toBeNull()
  })
  it('suggests category from the category column', () => {
    const rows = [
      { Category: '', Other: 'x' },
      { Category: '  T-Shirts  ', Other: 'y' },
    ]
    const m = new Map<string, 'category' | null>([
      ['Category', 'category'],
      ['Other', null],
    ])
    expect(suggestCategory(rows, m)).toBe('T-Shirts')
  })
})
