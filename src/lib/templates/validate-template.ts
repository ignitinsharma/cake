import { getAllTemplates } from '@/data/templates'
import type { TemplateSource } from './types'

/*
 * SOURCES
 * Every valid source name.
 */
export const SOURCES: readonly TemplateSource[] = [
  'title', 'description', 'brand', 'hsn', 'gstRate', 'categoryPath',
  'sku', 'size', 'color', 'mrp', 'price', 'stock', 'weightGrams', 'images',
]

/*
 * assertAllTemplatesValid
 * Structural checks over every template in the registry.
 * @returns array of problem strings (empty when valid)
 */
export function assertAllTemplatesValid(): string[] {
  const issues: string[] = []
  for (const t of getAllTemplates()) {
    const names = t.columns.map((c) => c.name)
    if (new Set(names).size !== names.length) issues.push(`${t.platform}/${t.categorySlug}: duplicate column names`)
    for (const c of t.columns) {
      if (!(SOURCES as readonly string[]).includes(c.source)) {
        issues.push(`${t.platform}/${t.categorySlug}: unknown source ${c.source}`)
      }
      if (c.required && !c.default && !(SOURCES as readonly string[]).includes(c.source)) {
        issues.push(`${t.platform}/${t.categorySlug}: required column ${c.name} has no usable source`)
      }
      const ALLOWED_RULE_KEYS = ['enum', 'regex', 'min', 'max', 'url', 'unique']
      if (c.rules) {
        for (const k of Object.keys(c.rules)) {
          if (!ALLOWED_RULE_KEYS.includes(k)) {
            issues.push(`${t.platform}/${t.categorySlug}: unknown rule key ${k} on ${c.name}`)
          }
        }
      }
    }
  }
  return issues
}