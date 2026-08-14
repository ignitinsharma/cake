import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { GenerateButtons } from '@/components/dashboard/generate-buttons'
import { ALL_PLATFORMS } from '@/data/templates'
import { ProductEdit } from '@/components/forms/product-edit'
import { Card } from '@/components/ui/card'

/*
 * ProductDetailPage
 * Full product view with variants table and generate actions.
 */
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  const product = await db.product.findFirst({
    where: { id, userId: session?.user?.id as string },
    include: { variants: true },
  })
  if (!product) notFound()
  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm font-medium text-brand-foreground-muted hover:underline">
        ← Products
      </Link>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
          <p className="mt-1 text-brand-foreground-muted">{product.description}</p>
          <p className="mt-1 text-sm text-brand-foreground-muted">
            Brand: {product.brand} · HSN {product.hsn} · GST {product.gstRate}%
          </p>
        </div>
        <GenerateButtons productId={product.id} platforms={ALL_PLATFORMS} />
      </div>
      <ProductEdit product={product} />
      <Card className="rounded-xl border border-brand-border bg-white p-6">
        <h2 className="text-xl font-semibold tracking-tight">Variants</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-sm">
            <thead className="bg-brand-surface">
              <tr>
                {['SKU', 'Size', 'Color', 'MRP', 'Price', 'Stock', 'Weight (g)'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.id} className="border-t border-brand-border">
                  <td className="px-4 py-2">{v.sku}</td>
                  <td className="px-4 py-2">{v.size}</td>
                  <td className="px-4 py-2">{v.color}</td>
                  <td className="px-4 py-2">₹{v.mrp}</td>
                  <td className="px-4 py-2">₹{v.price}</td>
                  <td className="px-4 py-2">{v.stock}</td>
                  <td className="px-4 py-2">{v.weightGrams}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}