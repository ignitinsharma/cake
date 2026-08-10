'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { deriveFormSchema } from '@/lib/forms/product-form-schema'

/*
 * createProductAction
 * Validates the dynamic form against the template, saves product + one variant.
 * ponytail: one variant per product for v1; multi-variant editing is a Phase 3 item.
 * @param data - form payload (template column names + platform + categorySlug)
 * @returns { ok: true, productId } or { error }
 */
export async function createProductAction(data: unknown) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const payload = data as Record<string, unknown>
  const platform = payload.platform as Platform
  const categorySlug = payload.categorySlug as string
  const template = getTemplate(platform, categorySlug)
  if (!template) return { error: 'Template not found' }
  const parsed = deriveFormSchema(template).safeParse(payload)
  if (!parsed.success) return { error: 'Please fill all required fields' }
  const v = parsed.data as Record<string, string>
  const category = await db.category.findUnique({ where: { slug: categorySlug } })
  const product = await db.product.create({
    data: {
      userId: session.user.id as string,
      title: v['Product Title'] || v['item_name'] || v['Product Name'] || '',
      description: v['Product Description'] || '',
      brand: v['Brand'] || v['brand_name'] || '',
      categorySlug,
      hsn: v['HSN'] || v['HSN_Code'] || category?.defaultHsn || '6109',
      gstRate:
        Number(String(v['Tax Code'] || v['GST %'] || v['Product_Tax_Code'] || '').replace(/[^\d.]/g, '')) ||
        category?.defaultGstRate ||
        5,
      variants: {
        create: {
          sku: v['Seller SKU'] || v['Style Code'] || v['part_number'] || '',
          size: v['Size'] || v['size_name'] || '',
          color: v['Color'] || v['color_name'] || '',
          mrp: Number(v['MRP'] || 0),
          price: Number(v['Selling Price'] || v['standard_price'] || 0),
          stock: Number(v['Stock'] || v['quantity'] || 0),
          weightGrams: Number(v['Weight (g)'] || v['item_weight'] || 0),
        },
      },
    },
  })
  return { ok: true as const, productId: product.id }
}