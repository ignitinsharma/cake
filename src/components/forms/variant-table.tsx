'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { VariantEditRow } from '@/lib/validations/variant-rows'

const FIELDS: { key: keyof VariantEditRow; label: string; type: string }[] = [
  { key: 'sku', label: 'SKU', type: 'text' },
  { key: 'size', label: 'Size', type: 'text' },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'mrp', label: 'MRP', type: 'number' },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'stock', label: 'Stock', type: 'number' },
  { key: 'weightGrams', label: 'Weight (g)', type: 'number' },
]

const emptyRow = (): VariantEditRow => ({ sku: '', size: '', color: '', mrp: 0, price: 0, stock: 0, weightGrams: 0 })

/*
 * VariantTable
 * Editable variant rows with add/remove.
 */
export function VariantTable({ initial }: { initial: VariantEditRow[] }) {
  const [rows, setRows] = useState<VariantEditRow[]>(initial.length ? initial : [emptyRow()])
  const set = (i: number, key: keyof VariantEditRow, value: string) => {
    const next = rows.map((r, j) => (j === i ? { ...r, [key]: FIELDS.find((f) => f.key === key)?.type === 'number' ? Number(value) : value } : r))
    setRows(next)
  }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface">
            <tr>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-2 py-2 text-left font-medium">{f.label}</th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-brand-border">
                {FIELDS.map((f) => (
                  <td key={f.key} className="px-2 py-2">
                    <Input
                      type={f.type}
                      step="any"
                      value={r[f.key]}
                      onChange={(e) => set(i, f.key, e.target.value)}
                      className="w-24"
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <Button variant="outline" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" onClick={() => setRows([...rows, emptyRow()])}>
        Add variant
      </Button>
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
    </div>
  )
}
