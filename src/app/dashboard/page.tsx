import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ALL_PLATFORMS } from '@/data/templates'
import { GenerateButtons } from '@/components/dashboard/generate-buttons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/*
 * DashboardPage
 * Product list with per-platform generate actions.
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
        <Link href="/dashboard/new">
          <Button>Add product</Button>
        </Link>
      </div>
      {products.length === 0 && (
        <Card className="rounded-xl border border-brand-border bg-white p-6 text-center">
          <p className="text-brand-foreground-muted">No products yet — add your first one.</p>
        </Card>
      )}
      <div className="space-y-4">
        {products.map((p) => (
          <Card key={p.id} className="rounded-xl border border-brand-border bg-white p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <Link href={`/dashboard/products/${p.id}`} className="text-xl font-semibold tracking-tight hover:underline">
                  {p.title}
                </Link>
                <p className="mt-1 text-sm text-brand-foreground-muted">
                  {p.brand} · {p.variants.length} variant{p.variants.length === 1 ? '' : 's'} · {p.categorySlug}
                </p>
              </div>
              <GenerateButtons productId={p.id} platforms={ALL_PLATFORMS} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}