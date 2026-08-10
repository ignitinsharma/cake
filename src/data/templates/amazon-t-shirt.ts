import type { TemplateColumn } from '@/lib/templates/types'

/*
 * amazonColumns
 * Best-effort Amazon India flat-file subset for T-shirts.
 * ponytail: full flat file has 100+ columns; ship the mandatory core set.
 */
export const amazonColumns: TemplateColumn[] = [
  { name: 'item_name', source: 'title', required: true, type: 'string' },
  { name: 'brand_name', source: 'brand', required: true, type: 'string' },
  { name: 'item_type_keyword', source: 'categoryPath', required: true, type: 'string' },
  { name: 'standard_price', source: 'price', required: true, type: 'number' },
  { name: 'part_number', source: 'sku', required: true, type: 'string' },
  { name: 'size_name', source: 'size', required: true, type: 'string' },
  { name: 'color_name', source: 'color', required: true, type: 'string' },
  { name: 'quantity', source: 'stock', required: true, type: 'int' },
  { name: 'item_weight', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN_Code', source: 'hsn', required: true, type: 'string' },
  { name: 'Product_Tax_Code', source: 'gstRate', required: true, type: 'string' },
  { name: 'main_image_url', source: 'images', required: false, type: 'string' },
]