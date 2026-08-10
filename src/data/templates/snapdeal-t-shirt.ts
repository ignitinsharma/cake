import type { TemplateColumn } from '@/lib/templates/types'

/*
 * snapdealColumns
 * Best-effort Snapdeal upload template (public template knowledge).
 * ponytail: shallow-but-valid; deepen per seller-portal research.
 */
export const snapdealColumns: TemplateColumn[] = [
  { name: 'Product Name', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number' },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string' },
  { name: 'Size', source: 'size', required: true, type: 'string' },
  { name: 'Colour', source: 'color', required: true, type: 'string' },
  { name: 'Quantity', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string' },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string' },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]
