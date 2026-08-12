'use client'
import { useState } from 'react'
import { Platform } from '@/constants/enums'
import { ALL_PLATFORMS } from '@/data/templates'
import { generateBatchAction } from '@/lib/actions/generate-batch'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface BatchProduct {
  id: string
  title: string
  categorySlug: string
}

/*
 * BatchBar
 * Sticky footer: selected count, platform picker, format toggle.
 * Mixed categories block generation until the selection is one category.
 */
export function BatchBar({ products, selected }: { products: BatchProduct[]; selected: Set<string> }) {
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const picked = products.filter((p) => selected.has(p.id))
  const categories = [...new Set(picked.map((p) => p.categorySlug))]
  const blocked = categories.length !== 1 || platform === ''
  const categorySlug = categories.length === 1 ? categories[0] : ''

  async function run() {
    if (blocked || !categorySlug || !platform) return
    setPending(true)
    setError('')
    setUrl('')
    const res = await generateBatchAction({
      productIds: [...selected],
      platform,
      format,
      categorySlug,
    })
    setPending(false)
    if ('error' in res) setError(res.error)
    else setUrl(res.downloadUrl)
  }

  return (
    <Card className="sticky bottom-4 rounded-xl border border-brand-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">Batch ({picked.length})</span>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-brand-border px-2 py-1 text-sm"
        >
          <option value="">Platform…</option>
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as 'csv' | 'xlsx')}
          className="rounded-lg border border-brand-border px-2 py-1 text-sm"
        >
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
        </select>
        <Button onClick={run} disabled={blocked || pending}>
          {pending ? 'Generating…' : 'Generate batch file'}
        </Button>
        {url && (
          <a href={url} className="text-sm font-medium text-brand-primary hover:underline">
            Download file
          </a>
        )}
      </div>
      {blocked && picked.length > 0 && (
        <p className="mt-2 text-sm text-brand-danger">
          Same category required — selected: {categories.join(', ')}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-brand-danger">{error}</p>}
    </Card>
  )
}