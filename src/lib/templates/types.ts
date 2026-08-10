import { Platform } from '@/constants/enums'

/*
 * TemplateSource
 * Standard product model fields a template column can read from.
 */
export type TemplateSource =
  | 'title' | 'description' | 'brand' | 'hsn' | 'gstRate' | 'categoryPath'
  | 'sku' | 'size' | 'color' | 'mrp' | 'price' | 'stock' | 'weightGrams'
  | 'images'

export type TemplateColumnType = 'string' | 'number' | 'int'

/*
 * ColumnRule
 * Optional per-column validation rules (spec §4.1).
 * enum: allowed values; regex: format check; min/max: numeric range;
 * url: must parse as http(s) URL; unique: no duplicates within the file.
 */
export interface ColumnRule {
  enum?: string[]
  regex?: string
  min?: number
  max?: number
  url?: boolean
  unique?: boolean
}

/*
 * TemplateColumn
 * One output column of a platform template.
 */
export interface TemplateColumn {
  name: string
  source: TemplateSource
  required: boolean
  type: TemplateColumnType
  default?: string
  rules?: ColumnRule
}

/*
 * PlatformTemplate
 * The full schema for one (platform, category) upload file.
 */
export interface PlatformTemplate {
  platform: Platform
  version: string
  categorySlug: string
  columns: TemplateColumn[]
}