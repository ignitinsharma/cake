import type { PlatformTemplate } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { validateForTemplate, type ValidationIssue } from './validate'
import { buildRows } from './build-rows'
import { toCSV, toXLSX } from './serialize'

/*
 * GenerationResult
 * Everything a download needs.
 */
export interface GenerationResult {
  rows: string[][]
  csv: string
  xlsx: Buffer
  issues: ValidationIssue[]
}

/*
 * generateFile
 * Validate then render then serialize.
 * @returns rows, csv, xlsx, and any validation issues
 */
export function generateFile(
  product: StandardProduct,
  variants: VariantInput[],
  template: PlatformTemplate,
): GenerationResult {
  const issues = validateForTemplate(product, variants, template)
  const rows = buildRows(product, variants, template)
  return { rows, csv: toCSV(rows), xlsx: toXLSX(rows), issues }
}