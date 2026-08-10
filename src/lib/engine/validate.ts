import type { PlatformTemplate } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'

/*
 * ValidationIssue
 * One missing/blank required field.
 */
export interface ValidationIssue {
  column: string
  message: string
}

/*
 * fieldValue
 * Resolve a template source to the product/variant value.
 */
export function fieldValue(
  source: string,
  product: StandardProduct,
  variant: VariantInput,
  defaultValue?: string,
): string {
  const map: Record<string, string> = {
    title: product.title,
    description: product.description,
    brand: product.brand,
    hsn: product.hsn,
    gstRate: String(product.gstRate),
    categoryPath: product.categoryPath,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    mrp: String(variant.mrp),
    price: String(variant.price),
    stock: String(variant.stock),
    weightGrams: String(variant.weightGrams),
    images: '',
  }
  return map[source] ?? defaultValue ?? ''
}

/*
 * validateForTemplate
 * @returns issues for required columns whose source value is blank
 */
export function validateForTemplate(
  product: StandardProduct,
  variants: VariantInput[],
  template: PlatformTemplate,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const column of template.columns) {
    if (!column.required) continue
    for (const variant of variants) {
      const value = fieldValue(column.source, product, variant, column.default)
      if (value === '' || value == null) {
        issues.push({ column: column.name, message: `${column.name} is required` })
        break
      }
    }
  }
  return issues
}