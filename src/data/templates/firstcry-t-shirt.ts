import type { TemplateColumn } from '@/lib/templates/types'

/*
 * firstcryColumns
 * Best-effort FirstCry upload schema (public template knowledge).
 * ponytail: shallow-but-valid; FirstCry docs are sparse — omit unknown columns.
 */
export const firstcryColumns: TemplateColumn[] = [
  { name: 'Product Name', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number', rules: { min: 1 } },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string', rules: { unique: true } },
  { name: 'Size', source: 'size', required: true, type: 'string', rules: { enum: ['S', 'M', 'L', 'XL', 'XXL'] } },
  { name: 'Colour', source: 'color', required: true, type: 'string' },
  { name: 'Quantity', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string', rules: { regex: '^\\d{8}$' } },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string', rules: { min: 0, max: 28 } },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]
