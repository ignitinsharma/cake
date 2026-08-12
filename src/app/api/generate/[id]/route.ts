import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { toCSV, toXLSX } from '@/lib/engine/serialize'
import { buildBatchRows, type BatchProduct } from '@/lib/engine/build-rows'
import { resolveCategoryPath } from '@/lib/category-path'

/*
 * GET /api/generate/[id]
 * Streams the generated file as an attachment. Re-renders from the
 * product + template version recorded on the Generation row.
 * Batch: a generation whose fileName is a batch name (`-batch.`) re-renders
 * ALL siblings sharing that fileName (one file, all products' rows).
 * ponytail: batch names are distinguished by the `-batch.` marker because
 * single generations legitimately share fileNames across products.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { id } = await params
  const format = new URL(req.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv'
  const generation = await db.generation.findFirst({ where: { id, userId: session.user.id as string } })
  if (!generation) return new Response('Not found', { status: 404 })
  const isBatch = generation.fileName.includes('-batch.')
  const siblings = isBatch
    ? await db.generation.findMany({
        where: { fileName: generation.fileName, userId: session.user.id as string },
        include: { product: { include: { variants: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : null
  const single = isBatch
    ? null
    : await db.product.findFirst({ where: { id: generation.productId }, include: { variants: true } })
  if (!isBatch && !single) return new Response('Not found', { status: 404 })
  const products = siblings ? siblings.map((g) => g.product) : [single!]
  const template = getTemplate(generation.platform as Platform, generation.categorySlug)
  if (!template) return new Response('Not found', { status: 404 })
  const batch: BatchProduct[] = await Promise.all(
    products.map(async (product) => ({
      product: {
        title: product.title,
        description: product.description,
        brand: product.brand,
        hsn: product.hsn,
        gstRate: product.gstRate,
        categoryPath: await resolveCategoryPath(product.categorySlug, generation.platform as Platform),
      },
      variants: product.variants.map((v) => ({
        sku: v.sku, size: v.size, color: v.color, mrp: v.mrp, price: v.price, stock: v.stock, weightGrams: v.weightGrams,
      })),
    })),
  )
  const rows = buildBatchRows(batch, template)
  const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
  const body: Uint8Array = format === 'xlsx' ? new Uint8Array(toXLSX(rows)) : new TextEncoder().encode(toCSV(rows))
  const ext = format === 'xlsx' ? 'xlsx' : 'csv'
  const fileName = isBatch
    ? `${generation.fileName.replace(/\.(csv|xlsx)$/, '')}.${ext}`
    : `${products[0].title.replace(/[^a-z0-9]+/gi, '-')}-${ext}`
  return new Response(body as unknown as BodyInit, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}