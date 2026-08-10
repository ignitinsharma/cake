'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES } from '@/data/taxonomy/categories'
import { importProductsAction, type ImportResult } from '@/lib/actions/import-products'
import { autoMapHeaders, suggestCategory } from '@/lib/import/auto-map'
import { MATCH_THRESHOLD, STANDARD_FIELDS, tokenOverlap, type StandardField } from '@/lib/import/aliases'
import { parseFile, type ParsedFile } from '@/lib/import/parse'
import type { ImportRow } from '@/lib/import/import-schema'

const REQUIRED_FIELDS: StandardField[] = ['title', 'sku', 'price', 'size']
const OPTION_LABELS: Record<StandardField, string> = {
  title: 'Product title *',
  description: 'Description',
  brand: 'Brand',
  sku: 'SKU *',
  mrp: 'MRP',
  price: 'Selling price *',
  size: 'Size *',
  color: 'Color',
  stock: 'Stock',
  weightGrams: 'Weight (g)',
  hsn: 'HSN',
  gstRate: 'GST %',
  category: 'Category (file-level)',
}

/*
 * rowsToImport
 * Maps parsed rows → standard-field payload via the confirmed mapping.
 */
function rowsToImport(parsed: ParsedFile, mapping: Map<string, StandardField | null>): ImportRow[] {
  const pick = (row: Record<string, string>, field: StandardField): string | undefined => {
    for (const [h, f] of mapping) {
      if (f === field && row[h] !== undefined && row[h] !== '') return row[h]
    }
    return undefined
  }
  return parsed.rows.map((row, i) => ({
    fileRow: i + 2, // 1 = header row (spec §10: report uses original row numbers)
    title: pick(row, 'title') ?? '',
    sku: pick(row, 'sku') ?? '',
    price: pick(row, 'price') ?? '',
    size: pick(row, 'size') ?? '',
    description: pick(row, 'description'),
    brand: pick(row, 'brand'),
    mrp: pick(row, 'mrp'),
    stock: pick(row, 'stock'),
    weightGrams: pick(row, 'weightGrams'),
    color: pick(row, 'color'),
    hsn: pick(row, 'hsn'),
    gstRate: pick(row, 'gstRate'),
  }))
}

/*
 * matchCategory
 * Fuzzy-match a free-text category value against the taxonomy (spec D5).
 */
function matchCategory(text: string): string {
  const t = text.trim().toLowerCase()
  let best = ''
  let bestScore = 0
  for (const c of CATEGORIES) {
    const score = t === c.name.toLowerCase() ? 1 : tokenOverlap(t, c.name.toLowerCase())
    if (score > bestScore) {
      bestScore = score
      best = c.slug
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : ''
}

/*
 * ImportWizard
 * 4 steps: upload → mapping → category → preview + load (spec §5).
 * ponytail: one client file; preview shows 20 rows, full validation on the server.
 */
export function ImportWizard() {
  const [step, setStep] = useState(1)
  const [parseError, setParseError] = useState('')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<Map<string, StandardField | null>>(new Map())
  const [categorySlug, setCategorySlug] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function onFile(file: File) {
    setParseError('')
    setParsed(null)
    setResult(null)
    try {
      const p = await parseFile(file)
      setParsed(p)
      const m = autoMapHeaders(p.headers)
      setMapping(m)
      setCategorySlug(matchCategory(suggestCategory(p.rows, m)))
      setStep(2)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Could not parse the file')
    }
  }

  const missingRequired = REQUIRED_FIELDS.filter((f) => ![...mapping.values()].includes(f))
  const loadable = parsed !== null && categorySlug !== '' && missingRequired.length === 0

  async function load() {
    if (!parsed) return
    setParseError('')
    setPending(true)
    try {
      setResult(await importProductsAction({ categorySlug, rows: rowsToImport(parsed, mapping) }))
      setPending(false)
      setStep(4)
    } catch (e) {
      setPending(false)
      setParseError(e instanceof Error ? e.message : 'Could not load the products')
    }
  }

  const previewRows = parsed ? rowsToImport(parsed, mapping) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-foreground-muted">
        {['Upload', 'Mapping', 'Category', 'Done'].map((label, i) => (
          <span key={label} className={i + 1 === step ? 'text-brand-primary' : ''}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-brand-border p-10 text-center">
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <span className="text-brand-foreground-muted">
              Drop a <span className="font-medium text-brand-primary">.csv</span> or{' '}
              <span className="font-medium text-brand-primary">.xlsx</span> catalog here — or click to pick one.
            </span>
          </label>
          {parseError && <p className="mt-4 text-sm text-brand-danger">{parseError}</p>}
        </Card>
      )}

      {step === 2 && parsed && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">2. Confirm the header mapping</CardTitle>
            <p className="text-sm text-brand-foreground-muted">
              {parsed.rows.length} rows, {parsed.headers.length} columns. We guessed — override anything wrong.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsed.headers.map((h) => (
              <div key={h} className="flex items-center gap-4">
                <span className="w-56 truncate text-sm font-medium">{h}</span>
                <Select
                  value={mapping.get(h) ?? 'none'}
                  onValueChange={(v) => {
                    const next = new Map(mapping)
                    next.set(h, v === 'none' ? null : (v as StandardField))
                    setMapping(next)
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not mapped</SelectItem>
                    {STANDARD_FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {OPTION_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {missingRequired.length > 0 && (
              <p className="text-sm text-brand-danger">
                Map these required fields to continue: {missingRequired.map((f) => OPTION_LABELS[f]).join(', ')}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button disabled={missingRequired.length > 0} onClick={() => setStep(3)}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">3. Pick the category</CardTitle>
            <p className="text-sm text-brand-foreground-muted">
              One category per file — it drives the platform category paths and HSN/GST defaults.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={categorySlug} onValueChange={(v) => setCategorySlug(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.path}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
              {parseError && <p className="mt-4 text-sm text-brand-danger">{parseError}</p>}
              <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={!loadable || pending} onClick={load}>
                {pending ? 'Loading…' : 'Preview & load'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && result && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Imported {result.created} product{result.created === 1 ? '' : 's'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border text-left text-brand-foreground-muted">
                      <th className="py-2 pr-4">File row</th>
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">SKU</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 20).map((r) => (
                      <tr key={r.fileRow} className="border-b border-brand-border">
                        <td className="py-2 pr-4">{r.fileRow}</td>
                        <td className="py-2 pr-4">{r.title}</td>
                        <td className="py-2 pr-4">{r.sku}</td>
                        <td className="py-2 pr-4">{r.price}</td>
                        <td className="py-2 pr-4">{r.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                <p className="font-medium text-brand-danger">Skipped {result.errors.length} rows</p>
                <ul className="mt-2 space-y-1 text-sm text-brand-foreground-muted">
                  {result.errors.map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a href="/dashboard" className="inline-block">
              <Button>Go to products</Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
