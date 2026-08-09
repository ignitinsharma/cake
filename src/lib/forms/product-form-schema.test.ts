import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { deriveFormSchema, type ProductFormData } from './product-form-schema'

/*
 * The dynamic form schema mirrors the template's required columns.
 */
describe('product form schema', () => {
  const template = getTemplate(Platform.FLIPKART, 'mens-tshirts')!

  function values(overrides: Partial<ProductFormData> = {}): ProductFormData {
    return {
      'Product Title': 'Tee',
      'Product Description': 'desc',
      Brand: 'B',
      MRP: '999',
      'Selling Price': '599',
      'Seller SKU': 'S1',
      Size: 'M',
      Color: 'Black',
      Stock: '10',
      'Weight (g)': '150',
      HSN: '6109',
      'Tax Code': '5',
      ...overrides,
    }
  }

  it('accepts a complete product', () => {
    const schema = deriveFormSchema(template)
    expect(schema.safeParse(values()).success).toBe(true)
  })
  it('rejects a missing required field', () => {
    const schema = deriveFormSchema(template)
    expect(schema.safeParse(values({ 'Product Description': '' })).success).toBe(false)
  })
})