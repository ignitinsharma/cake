'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ALL_PLATFORMS } from '@/data/templates'
import { GenerateButtons } from './generate-buttons'
import { BatchBar } from './batch-bar'
import { Card } from '@/components/ui/card'

interface ListProduct {
  id: string
  title: string
  brand: string
  categorySlug: string
  variantCount: number
}

/*
 * ProductList
 * Product cards with a batch checkbox each; selection feeds the sticky BatchBar.
 */
export function ProductList({ products }: { products: ListProduct[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  return (
    <div className="space-y-4">
      {products.map((p) => (
        <Card key={p.id} className="rounded-xl border border-brand-border bg-white p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="mt-1 h-4 w-4 accent-amber-500"
                aria-label={`Select ${p.title}`}
              />
              <div className="min-w-0">
                <Link href={`/dashboard/products/${p.id}`} className="text-xl font-semibold tracking-tight hover:underline">
                  {p.title}
                </Link>
                <p className="mt-1 text-sm text-brand-foreground-muted">
                  {p.brand} · {p.variantCount} variant{p.variantCount === 1 ? '' : 's'} · {p.categorySlug}
                </p>
              </div>
            </div>
            <GenerateButtons productId={p.id} platforms={ALL_PLATFORMS} />
          </div>
        </Card>
      ))}
      {products.length > 0 && <BatchBar products={products} selected={selected} />}
    </div>
  )
}