/*
 * StandardProduct
 * Platform-neutral product fields used by every template.
 */
export interface StandardProduct {
  title: string
  description: string
  brand: string
  hsn: string
  gstRate: number
  categoryPath: string
}

/*
 * VariantInput
 * One sellable unit (SKU) of a product.
 */
export interface VariantInput {
  sku: string
  size: string
  color: string
  mrp: number
  price: number
  stock: number
  weightGrams: number
}