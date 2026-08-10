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
 * TemplateColumn
 * One output column of a platform template.
 */
export interface TemplateColumn {
  name: string
  source: TemplateSource
  required: boolean
  type: TemplateColumnType
  default?: string
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