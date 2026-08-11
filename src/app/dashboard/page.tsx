import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProductList } from '@/components/dashboard/product-list'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/*
 * DashboardPage
 * Product list with per-product generate actions and batch selection.
 * Server component: auth + data only; interaction lives in ProductList.
 */
export default async function DashboardPage() {
  const session = await auth()
  const products = await db.product.findMany({
    where: { userId: session?.user?.id as string },
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
  })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-brand-foreground-muted">
            {products.length} product{products.length === 1 ? '' : 's'} — generate a file for any platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/import">
            <Button variant="outline">Import products</Button>
          </Link>
          <Link href="/dashboard/new">
            <Button>Add product</Button>
          </Link>
        </div>
      </div>
      {products.length === 0 && (
        <Card className="rounded-xl border border-brand-border bg-white p-6 text-center">
          <p className="text-brand-foreground-muted">No products yet — add your first one.</p>
        </Card>
      )}
      <ProductList
        products={products.map((p) => ({
          id: p.id,
          title: p.title,
          brand: p.brand,
          categorySlug: p.categorySlug,
          variantCount: p.variants.length,
        }))}
      />
    </div>
  )
}