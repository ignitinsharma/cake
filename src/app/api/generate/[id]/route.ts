import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { generateFile } from '@/lib/engine'
import { resolveCategoryPath } from '@/lib/category-path'

/*
 * GET /api/generate/[id]
 * Streams the generated file as an attachment. Re-renders from the
 * product + template version recorded on the Generation row.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { id } = await params
  const format = new URL(req.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv'
  const generation = await db.generation.findFirst({ where: { id, userId: session.user.id as string } })
  if (!generation) return new Response('Not found', { status: 404 })
  const product = await db.product.findFirst({
    where: { id: generation.productId },
    include: { variants: true },
  })
  if (!product) return new Response('Not found', { status: 404 })
  const template = getTemplate(generation.platform as Platform, generation.categorySlug)
  if (!template) return new Response('Not found', { status: 404 })
  const result = generateFile(
    {
      title: product.title,
      description: product.description,
      brand: product.brand,
      hsn: product.hsn,
      gstRate: product.gstRate,
      categoryPath: await resolveCategoryPath(product.categorySlug, generation.platform as Platform),
    },
    product.variants.map((v) => ({
      sku: v.sku, size: v.size, color: v.color, mrp: v.mrp, price: v.price, stock: v.stock, weightGrams: v.weightGrams,
    })),
    template,
  )
  const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
  const body: Uint8Array = format === 'xlsx' ? new Uint8Array(result.xlsx) : new TextEncoder().encode(result.csv)
  const ext = format === 'xlsx' ? 'xlsx' : 'csv'
  return new Response(body as unknown as BodyInit, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${product.title.replace(/[^a-z0-9]+/gi, '-')}-${ext}"`,
    },
  })
}