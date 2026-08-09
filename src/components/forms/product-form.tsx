'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Platform } from '@/constants/enums'
import { getTemplatesForPlatform, getTemplate } from '@/data/templates'
import { deriveFormSchema, type ProductFormData } from '@/lib/forms/product-form-schema'
import { createProductAction } from '@/lib/actions/create-product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/*
 * ProductForm
 * Wizard: platform → category → dynamic fields for the chosen template.
 */
export function ProductForm() {
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [categorySlug, setCategorySlug] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const template = useMemo(
    () => (platform && categorySlug ? getTemplate(platform, categorySlug) : null),
    [platform, categorySlug],
  )
  const templateCategories = useMemo(
    () => (platform ? getTemplatesForPlatform(platform).map((t) => t.categorySlug) : []),
    [platform],
  )
  const schema = useMemo(() => (template ? deriveFormSchema(template) : null), [template])
  const form = useForm<ProductFormData>({
    resolver: schema ? zodResolver(schema as z.ZodType<ProductFormData>) : undefined,
    defaultValues: {},
  })

  async function onSubmit(values: ProductFormData) {
    if (!template) return
    setPending(true)
    setError('')
    const res = await createProductAction({ ...values, platform, categorySlug })
    setPending(false)
    if (!('ok' in res)) {
      setError(res.error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Card className="rounded-xl border border-brand-border bg-white p-6">
        <CardHeader className="p-0">
          <CardTitle className="text-xl font-semibold tracking-tight">1. Platform</CardTitle>
        </CardHeader>
        <CardContent className="mt-3 grid grid-cols-3 gap-3 p-0">
          {Object.values(Platform).map((p) => (
            <Button
              key={p}
              type="button"
              variant={platform === p ? 'default' : 'outline'}
              onClick={() => {
                setPlatform(p)
                setCategorySlug('')
              }}
            >
              {p}
            </Button>
          ))}
        </CardContent>
      </Card>
      {platform && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <CardHeader className="p-0">
            <CardTitle className="text-xl font-semibold tracking-tight">2. Category</CardTitle>
          </CardHeader>
          <CardContent className="mt-3 flex flex-wrap gap-3 p-0">
            {templateCategories.map((slug) => (
              <Button
                key={slug}
                type="button"
                variant={categorySlug === slug ? 'default' : 'outline'}
                onClick={() => setCategorySlug(slug)}
              >
                {slug.replace(/-/g, ' ')}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      {template && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <CardHeader className="p-0">
            <CardTitle className="text-xl font-semibold tracking-tight">3. Product details</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 p-0">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {template.columns.map((c) => (
                <div key={c.name} className="space-y-1">
                  <Label htmlFor={c.name}>
                    {c.name}
                    {c.required && <span className="text-brand-danger"> *</span>}
                  </Label>
                  <Input
                    id={c.name}
                    type={c.type === 'number' || c.type === 'int' ? 'number' : 'text'}
                    step="any"
                    {...form.register(c.name)}
                  />
                </div>
              ))}
              {error && <p className="text-sm text-brand-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Saving…' : 'Save product'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}