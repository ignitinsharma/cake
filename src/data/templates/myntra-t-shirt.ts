import type { TemplateColumn } from '@/lib/templates/types'

/*
 * myntraColumns
 * Best-effort Myntra T-shirt upload schema (public template knowledge).
 * ponytail: Myntra templates are category-specific; deepen per seller portal research.
 */
export const myntraColumns: TemplateColumn[] = [
  { name: 'Style Code', source: 'sku', required: true, type: 'string', rules: { unique: true } },
  { name: 'Product Name', source: 'title', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number', rules: { min: 1 } },
  { name: 'Size', source: 'size', required: true, type: 'string', rules: { enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] } },
  { name: 'Color', source: 'color', required: true, type: 'string' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string', rules: { regex: '^\\d{8}$' } },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string', rules: { min: 0, max: 28 } },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'Stock', source: 'stock', required: true, type: 'int' },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]