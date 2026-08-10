import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { CATEGORIES, getCategory } from './categories'

describe('taxonomy', () => {
  it('has at least 50 categories with unique slugs', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(50)
    const slugs = CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('keeps the 3 Phase 1 t-shirt categories with their exact mappings', () => {
    const mens = getCategory('mens-tshirts')!
    expect(mens.platformPaths?.[Platform.FLIPKART]).toBe("Men's T-Shirts")
    expect(mens.platformPaths?.[Platform.MYNTRA]).toBe("Men's Wear > T-Shirts")
    expect(mens.platformPaths?.[Platform.AMAZON]).toBe('Apparel > Men > T-Shirts')
    for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
      expect(getCategory(slug)).toBeDefined()
    }
  })
  it('gives every t-shirt category a path for all 8 platforms', () => {
    for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
      for (const p of Object.values(Platform)) {
        expect(getCategory(slug)!.platformPaths?.[p], `${slug} → ${p}`).toBeTruthy()
      }
    }
  })
  it('gives every category HSN and GST defaults', () => {
    for (const c of CATEGORIES) {
      expect(c.defaultHsn, c.slug).toMatch(/^\d{4}$/)
      expect(c.defaultGstRate, c.slug).toBeGreaterThan(0)
    }
  })
})
