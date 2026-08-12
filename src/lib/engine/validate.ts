import type { PlatformTemplate, TemplateColumn } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'

/*
 * ValidationIssue
 * One missing/blank required field or one rule violation.
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
 * checkRules
 * Evaluate one column's rules for one variant value.
 * @returns an issue message, or null when the value passes
 */
export function checkRules(column: TemplateColumn, value: string): string | null {
  const rules = column.rules
  if (!rules) return null
  if (value === '') return null
  if (rules.enum && rules.enum.length > 0 && !rules.enum.includes(value)) {
    return `${column.name} must be one of: ${rules.enum.join(', ')}`
  }
  if (rules.regex) {
    try {
      if (!new RegExp(rules.regex).test(value)) return `${column.name} is not in the required format`
    } catch {
      return `${column.name} has an invalid format rule`
    }
  }
  const n = Number(value)
  if (Number.isFinite(n)) {
    if (rules.min !== undefined && n < rules.min) {
      return `${column.name} must be at least ${rules.min}`
    }
    if (rules.max !== undefined && n > rules.max) {
      return `${column.name} must be at most ${rules.max}`
    }
  }
  if (rules.url) {
    try {
      const u = new URL(value)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return `${column.name} must be a valid URL`
    } catch {
      return `${column.name} must be a valid URL`
    }
  }
  return null
}

/*
 * validateForTemplate
 * @returns issues for required columns whose source value is blank,
 * plus rule violations (enum/regex/min/max/url) per column,
 * plus one issue per duplicate SKU when a unique SKU column exists.
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
  for (const column of template.columns) {
    if (!column.rules) continue
    if (column.rules.unique) {
      const seen = new Map<string, number>()
      for (let i = 0; i < variants.length; i++) {
        const value = fieldValue(column.source, product, variants[i], column.default)
        const firstRow = seen.get(value)
        if (firstRow !== undefined) {
          issues.push({
            column: column.name,
            message: `duplicate SKU in file: ${value} (rows ${firstRow} and ${i + 1})`,
          })
          continue
        }
        seen.set(value, i + 1)
      }
      continue
    }
    for (const variant of variants) {
      const value = fieldValue(column.source, product, variant, column.default)
      const msg = checkRules(column, value)
      if (msg) issues.push({ column: column.name, message: msg })
    }
  }
  return issues
}