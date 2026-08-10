import type { TemplateColumn } from '@/lib/templates/types'

/*
 * flipkartColumns
 * Best-effort Flipkart T-shirt upload schema (public template knowledge).
 * ponytail: deepen per real seller-hub template in research pass.
 */
export const flipkartColumns: TemplateColumn[] = [
  { name: 'Category', source: 'categoryPath', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Product Title', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number', rules: { min: 1 } },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string', rules: { unique: true } },
  { name: 'Size', source: 'size', required: true, type: 'string', rules: { enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] } },
  { name: 'Color', source: 'color', required: true, type: 'string' },
  { name: 'Stock', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string', rules: { regex: '^\\d{8}$' } },
  { name: 'Tax Code', source: 'gstRate', required: true, type: 'string', rules: { min: 0, max: 28 } },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]