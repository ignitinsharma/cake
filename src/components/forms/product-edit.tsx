'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProductAction } from '@/lib/actions/update-product'
import type { VariantEditRow } from '@/lib/validations/variant-rows'
import { VariantTable } from './variant-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/*
 * ProductEdit
 * Edit form with a live variant table; submits the whole product + variants.
 */
export function ProductEdit({ product }: { product: {
  id: string; title: string; description: string; brand: string; hsn: string; gstRate: number
  variants: VariantEditRow[]
} }) {
  const router = useRouter()
  const [title, setTitle] = useState(product.title)
  const [description, setDescription] = useState(product.description)
  const [brand, setBrand] = useState(product.brand)
  const [hsn, setHsn] = useState(product.hsn)
  const [gstRate, setGstRate] = useState(String(product.gstRate))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit() {
    setPending(true)
    setError('')
    const variants = JSON.parse(
      (document.querySelector('input[name="variants"]') as HTMLInputElement | null)?.value ?? '[]',
    ) as VariantEditRow[]
    const res = await updateProductAction({
      productId: product.id,
      title,
      description,
      brand,
      hsn,
      gstRate: Number(gstRate),
      variants,
    })
    setPending(false)
    if ('error' in res) setError(res.error)
    else {
      router.refresh()
    }
  }

  return (
    <Card className="rounded-xl border border-brand-border bg-white p-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-semibold tracking-tight">Edit product</CardTitle>
      </CardHeader>
      <CardContent className="mt-4 space-y-4 p-0">
        <div className="space-y-1">
          <Label htmlFor="edit-title">Title</Label>
          <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="edit-desc">Description</Label>
          <Input id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="edit-brand">Brand</Label>
            <Input id="edit-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-hsn">HSN</Label>
            <Input id="edit-hsn" value={hsn} onChange={(e) => setHsn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-gst">GST %</Label>
            <Input id="edit-gst" type="number" step="any" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
          </div>
        </div>
        <VariantTable initial={product.variants} />
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </CardContent>
    </Card>
  )
}
