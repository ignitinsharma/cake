# Phase 2 — Import + Breadth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-step CSV/XLSX import wizard, 5 more platform templates (Meesho, Snapdeal, Nykaa, Ajio, FirstCry), and expand the category taxonomy to ~50 categories.

**Architecture:** Client-side wizard (file parsed in the browser, mapping confirmed, one server action bulk-creates valid rows in a transaction). New platforms are pure data (template files + registry entry + enum values); the engine stays generic. Taxonomy becomes a typed data file consumed by the seed.

**Tech Stack:** Next.js 16 App Router + server actions, papaparse (CSV) + SheetJS xlsx (XLSX, already installed), zod v4, vitest, Prisma 7 (SQLite), Tailwind v4 + shadcn Base UI, DESIGN.md amber theme.

**Spec:** `docs/superpowers/specs/2026-08-10-phase2-import-breadth-design.md`

## Global Constraints

- No schema/migration changes — Product + Variant already fit row = product + variant (spec §6)
- Row cap: `MAX_IMPORT_ROWS = 2000`; reject files above it (spec §10)
- Required import fields per row: title, sku, price (> 0), size (spec §6.2)
- Auto-map threshold: token overlap ≥ 0.5, exact normalized match wins (spec §6.1)
- Skip-bad-rows policy: valid rows import, invalid rows listed with reason + original file row number (spec D4)
- One category per file, fuzzy-suggested (spec D5)
- New platforms get t-shirt templates ONLY (mens/womens/kids tshirts), like Phase 1 (spec D6)
- The 3 Phase 1 t-shirt categories keep their existing mappings EXACTLY — regression-guarded by test (spec §8)
- `.env` already has `AUTH_SECRET` + `AUTH_TRUST_HOST=true`; dev server on port 3101 (port 3000 is an unrelated app — never use it)
- Tests: `pnpm test` (vitest, `src/**/*.test.ts`, passWithNoTests); lint: `pnpm lint`; build: `pnpm build`
- Commits on branch `feature/phase2-import-breadth` (branch off `feature/phase1-core-loop`)

---

### Task 1: Import aliases + header auto-map

**Files:**
- Create: `src/lib/import/aliases.ts`
- Create: `src/lib/import/auto-map.ts`
- Test: `src/lib/import/auto-map.test.ts`

**Interfaces:**
- Consumes: nothing (pure)
- Produces:
  - `STANDARD_FIELDS` / `StandardField` (13 fields incl. pseudo-field `category`)
  - `normalizeHeader(header: string): string`
  - `tokenOverlap(a: string, b: string): number`
  - `MATCH_THRESHOLD` (= 0.5)
  - `autoMapHeader(header: string): StandardField | null`
  - `autoMapHeaders(headers: string[]): Map<string, StandardField | null>`
  - `suggestCategory(rows, mapping): string` — first non-empty value of the header mapped to `category`

- [ ] **Step 1: Write the failing test**

`src/lib/import/auto-map.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { autoMapHeader, autoMapHeaders, suggestCategory } from './auto-map'
import { normalizeHeader, tokenOverlap } from './aliases'

describe('aliases', () => {
  it('normalizes case, spaces, underscores and parentheses', () => {
    expect(normalizeHeader('GST %')).toBe('gst%')
    expect(normalizeHeader('Product_Title (English)')).toBe('producttitleenglish')
  })
  it('scores identical token sets as 1', () => {
    expect(tokenOverlap('selling price', 'price selling')).toBe(1)
  })
})

describe('auto-map', () => {
  it('exact-matches headers to standard fields', () => {
    expect(autoMapHeader('Product Title')).toBe('title')
    expect(autoMapHeader('Seller SKU')).toBe('sku')
    expect(autoMapHeader('GST %')).toBe('gstRate')
  })
  it('matches via token overlap (extra words ok)', () => {
    expect(autoMapHeader('Product Title (English)')).toBe('title')
  })
  it('returns null for unmappable headers', () => {
    expect(autoMapHeader('Random Column Xyz')).toBeNull()
  })
  it('maps every header in a list', () => {
    const m = autoMapHeaders(['Product Name', 'Price', 'Nonsense'])
    expect(m.get('Product Name')).toBe('title')
    expect(m.get('Price')).toBe('price')
    expect(m.get('Nonsense')).toBeNull()
  })
  it('suggests category from the category column', () => {
    const rows = [
      { Category: '', Other: 'x' },
      { Category: '  T-Shirts  ', Other: 'y' },
    ]
    const m = new Map<string, 'category' | null>([
      ['Category', 'category'],
      ['Other', null],
    ])
    expect(suggestCategory(rows, m)).toBe('T-Shirts')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/import/auto-map.test.ts`
Expected: FAIL — "Cannot find module './aliases'"

- [ ] **Step 3: Write `src/lib/import/aliases.ts`**

```ts
/*
 * STANDARD_FIELDS
 * The neutral fields an imported CSV maps into. 'category' is a pseudo-field
 * that only drives the file-level category suggestion (spec D5).
 */
export const STANDARD_FIELDS = [
  'title', 'description', 'brand', 'sku', 'mrp', 'price', 'size', 'color',
  'stock', 'weightGrams', 'hsn', 'gstRate', 'category',
] as const

export type StandardField = (typeof STANDARD_FIELDS)[number]

/*
 * FIELD_ALIASES
 * Fuzzy-match sources per standard field (spec §6.1).
 */
export const FIELD_ALIASES: Record<StandardField, string[]> = {
  title: ['title', 'product title', 'product name', 'item title', 'name'],
  description: ['description', 'product description', 'long description', 'details'],
  brand: ['brand', 'brand name'],
  sku: ['sku', 'seller sku', 'style code', 'part number', 'item code', 'product code'],
  mrp: ['mrp', 'list price', 'maximum retail price', 'mrp price'],
  price: ['selling price', 'price', 'sale price', 'offer price', 'standard price'],
  size: ['size', 'size name'],
  color: ['color', 'colour', 'color name', 'colour name'],
  stock: ['stock', 'quantity', 'available quantity', 'stock quantity', 'qty'],
  weightGrams: ['weight', 'weight (g)', 'item weight', 'weight in grams', 'gross weight'],
  hsn: ['hsn', 'hsn code'],
  gstRate: ['gst %', 'gst rate', 'tax code', 'tax %', 'igst'],
  category: ['category', 'product category', 'category path', 'category name'],
}

/*
 * normalizeHeader
 * Lowercase; strip spaces/underscores/parens/dashes/dots; keep letters, digits, %.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s_()\-–—.]+/g, '')
    .replace(/[^a-z0-9%]/g, '')
}

/*
 * tokenOverlap
 * |shared tokens| / |max tokens| — 1 for identical sets, 0 for disjoint.
 */
export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.split(/[^a-z0-9]+/).filter(Boolean))
  const tb = new Set(b.split(/[^a-z0-9]+/).filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.max(ta.size, tb.size)
}

/*
 * MATCH_THRESHOLD
 * Minimum token-overlap score for an auto-map; below → "Not mapped" (spec §6.1).
 */
export const MATCH_THRESHOLD = 0.5
```

- [ ] **Step 4: Write `src/lib/import/auto-map.ts`**

```ts
import {
  FIELD_ALIASES,
  MATCH_THRESHOLD,
  STANDARD_FIELDS,
  normalizeHeader,
  tokenOverlap,
  type StandardField,
} from './aliases'

/*
 * autoMapHeader
 * Exact normalized match wins; otherwise best token-overlap ≥ threshold.
 * @returns the mapped standard field, or null ("Not mapped")
 */
export function autoMapHeader(header: string): StandardField | null {
  const norm = normalizeHeader(header)
  let best: { field: StandardField; score: number } | null = null
  for (const field of STANDARD_FIELDS) {
    for (const alias of FIELD_ALIASES[field]) {
      const a = normalizeHeader(alias)
      if (a === norm) return field
      const score = tokenOverlap(norm, a)
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { field, score }
    }
  }
  return best?.field ?? null
}

/*
 * autoMapHeaders
 * @returns per-header mapping in header order (null = not mapped)
 */
export function autoMapHeaders(headers: string[]): Map<string, StandardField | null> {
  return new Map(headers.map((h) => [h, autoMapHeader(h)]))
}

/*
 * suggestCategory
 * First non-empty value of the header mapped to 'category' (spec D5).
 * Fuzzy-match against the taxonomy happens in the wizard (Task 7).
 */
export function suggestCategory(
  rows: Record<string, string>[],
  mapping: Map<string, StandardField | null>,
): string {
  const header = [...mapping.entries()].find(([, f]) => f === 'category')?.[0]
  if (!header) return ''
  for (const row of rows) {
    const v = row[header]?.trim()
    if (v) return v
  }
  return ''
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/lib/import/auto-map.test.ts`
Expected: PASS — 11 tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/import/
git commit -m "feat: import header alias table and fuzzy auto-map"
```

---

### Task 2: File parsing (CSV + XLSX)

**Files:**
- Modify: `package.json` (add `papaparse`, dev `@types/papaparse`)
- Create: `src/lib/import/parse.ts`
- Test: `src/lib/import/parse.test.ts`

**Interfaces:**
- Consumes: nothing (pure)
- Produces:
  - `interface ParsedFile { headers: string[]; rows: Record<string, string>[] }`
  - `MAX_IMPORT_ROWS = 2000`
  - `parseCsv(text: string): ParsedFile` — throws Error('No data rows found — is the file empty or headerless?') / Error(`Too many rows: N (max 2000)`)
  - `parseXlsx(buf: ArrayBuffer): ParsedFile` — same error contract
  - `parseFile(file: File): Promise<ParsedFile>` — browser entry, sniffs `.xlsx`

- [ ] **Step 1: Add the dependency**

```bash
pnpm add papaparse && pnpm add -D @types/papaparse
```

Verify: `grep papaparse package.json` shows both entries.

- [ ] **Step 2: Write the failing test**

`src/lib/import/parse.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { MAX_IMPORT_ROWS, parseCsv, parseXlsx } from './parse'

describe('parseCsv', () => {
  it('parses headers and quoted commas', () => {
    const f = parseCsv('Title,Description\nTee,"Soft, 100% cotton"\n')
    expect(f.headers).toEqual(['Title', 'Description'])
    expect(f.rows[0]).toEqual({ Title: 'Tee', Description: 'Soft, 100% cotton' })
  })
  it('rejects empty files', () => {
    expect(() => parseCsv('')).toThrow('No data rows')
  })
  it('rejects files over the row cap', () => {
    const text = 'Sku\n' + Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `s${i}`).join('\n') + '\n'
    expect(() => parseCsv(text)).toThrow('Too many rows')
  })
})

describe('parseXlsx', () => {
  it('reads the first sheet to headers + rows', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sku', 'Price'], ['s1', '499']]), 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const f = parseXlsx(buf)
    expect(f.headers).toEqual(['Sku', 'Price'])
    expect(f.rows[0]).toEqual({ Sku: 's1', Price: '499' })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/import/parse.test.ts`
Expected: FAIL — "Cannot find module './parse'"

- [ ] **Step 4: Write `src/lib/import/parse.ts`**

```ts
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/*
 * ParsedFile
 * Headers plus data rows; every cell is a string.
 */
export interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
}

/*
 * MAX_IMPORT_ROWS
 * Browser-side safety cap (spec §10): big files go through a tool instead.
 */
export const MAX_IMPORT_ROWS = 2000

/*
 * parseCsv
 * RFC 4180 CSV → headers + rows. Empty/headerless files and >2000-row files throw.
 */
export function parseCsv(text: string): ParsedFile {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (v) => (v == null ? '' : String(v)),
  })
  const rows = result.data.filter((r) => Object.values(r).some((v) => String(v).trim() !== ''))
  if (rows.length === 0) throw new Error('No data rows found — is the file empty or headerless?')
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Too many rows: ${rows.length} (max ${MAX_IMPORT_ROWS})`)
  return { headers: Object.keys(rows[0]), rows: rows as Record<string, string>[] }
}

/*
 * parseXlsx
 * First worksheet → headers + rows (all cells stringified).
 */
export function parseXlsx(buf: ArrayBuffer): ParsedFile {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('No sheets found in the workbook')
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const rows = data.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? '' : String(v)])),
  )
  if (rows.length === 0) throw new Error('No data rows found — is the file empty or headerless?')
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Too many rows: ${rows.length} (max ${MAX_IMPORT_ROWS})`)
  return { headers: Object.keys(rows[0]), rows }
}

/*
 * parseFile
 * Browser entry point: sniff by extension (spec D3: CSV + XLSX).
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    return parseXlsx(await file.arrayBuffer())
  }
  return parseCsv(await file.text())
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/lib/import/parse.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/import/parse.ts src/lib/import/parse.test.ts
git commit -m "feat: CSV and XLSX file parsing for imports"
```

---

### Task 3: Per-row import validation

**Files:**
- Create: `src/lib/import/import-schema.ts`
- Test: `src/lib/import/import-schema.test.ts`

**Interfaces:**
- Consumes: nothing (pure)
- Produces:
  - `interface ImportRow` — standard-field payload: `{ fileRow: number; title: string; description?: string; brand?: string; sku: string; mrp?: string; price: string; size: string; color?: string; stock?: string; weightGrams?: string; hsn?: string; gstRate?: string }`
  - `toNumber(raw: string | undefined): number | null | undefined` — "1,299" → 1299, "GST18" → 18, "" → undefined, "abc" → null
  - `importRowSchema` (zod) — row errors are exact strings: "missing title", "missing sku", "missing size", "invalid price", "invalid number: MRP/Stock/Weight/GST rate"
  - `type ValidImportRow = z.infer<typeof importRowSchema>`

- [ ] **Step 1: Write the failing test**

`src/lib/import/import-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { importRowSchema, toNumber } from './import-schema'

const base = { fileRow: 1, title: 'Tee', sku: 'S1', price: '499', size: 'M' }

describe('toNumber', () => {
  it('strips commas, currency and letters', () => {
    expect(toNumber('1,299')).toBe(1299)
    expect(toNumber('₹499')).toBe(499)
    expect(toNumber('GST18')).toBe(18)
  })
  it('undefined for empty, null for garbage', () => {
    expect(toNumber('')).toBeUndefined()
    expect(toNumber('abc')).toBeNull()
  })
})

describe('importRowSchema', () => {
  it('accepts a valid row', () => {
    expect(importRowSchema.parse(base).price).toBe(499)
  })
  it('flags missing title, sku and size', () => {
    expect(() => importRowSchema.parse({ ...base, title: '' })).toThrow('missing title')
    expect(() => importRowSchema.parse({ ...base, sku: '' })).toThrow('missing sku')
    expect(() => importRowSchema.parse({ ...base, size: '' })).toThrow('missing size')
  })
  it('flags invalid price', () => {
    expect(() => importRowSchema.parse({ ...base, price: 'free' })).toThrow('invalid price')
    expect(() => importRowSchema.parse({ ...base, price: '-5' })).toThrow('invalid price')
  })
  it('coerces numeric fields with commas', () => {
    const row = importRowSchema.parse({ ...base, mrp: '1,299', stock: '50', weightGrams: '200.5' })
    expect(row.mrp).toBe(1299)
    expect(row.stock).toBe(50)
    expect(row.weightGrams).toBe(200.5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/import/import-schema.test.ts`
Expected: FAIL — "Cannot find module './import-schema'"

- [ ] **Step 3: Write `src/lib/import/import-schema.ts`**

```ts
import { z } from 'zod'

/*
 * ImportRow
 * A CSV row mapped to standard fields (string values straight from the file).
 */
export interface ImportRow {
  fileRow: number
  title: string
  description?: string
  brand?: string
  sku: string
  mrp?: string
  price: string
  size: string
  color?: string
  stock?: string
  weightGrams?: string
  hsn?: string
  gstRate?: string
}

/*
 * toNumber
 * "1,299" → 1299, "GST18" → 18, "₹499" → 499.
 * Empty → undefined (missing); unparseable → null (invalid).
 */
export function toNumber(raw: string | undefined): number | null | undefined {
  if (raw == null || raw.trim() === '') return undefined
  const cleaned = raw.replace(/[^\d.\-]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

const num = (error: string) =>
  z.preprocess((v) => toNumber(v as string | undefined), z.number({ error }).nonnegative())

/*
 * importRowSchema
 * Per-row validation (spec §6.2). Required: title, sku, price (> 0), size.
 * hsn/gstRate stay optional — the category defaults backfill them at load.
 */
export const importRowSchema = z.object({
  fileRow: z.number(),
  title: z.string().min(1, { error: 'missing title' }),
  sku: z.string().min(1, { error: 'missing sku' }),
  size: z.string().min(1, { error: 'missing size' }),
  price: z.preprocess(
    (v) => toNumber(v as string | undefined),
    z.number({ error: 'invalid price' }).positive(),
  ),
  mrp: num('invalid number: MRP').optional(),
  stock: num('invalid number: Stock').int().optional(),
  weightGrams: num('invalid number: Weight').optional(),
  gstRate: num('invalid number: GST rate').optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  hsn: z.string().optional(),
})

export type ValidImportRow = z.infer<typeof importRowSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/import/import-schema.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/import-schema.ts src/lib/import/import-schema.test.ts
git commit -m "feat: per-row import validation with skip-bad-rows reasons"
```

---

### Task 4: Taxonomy — ~50 categories as data + seed

**Files:**
- Create: `src/data/taxonomy/categories.ts`
- Modify: `prisma/seed.ts` (import CATEGORIES, upsert categories + mappings)
- Test: `src/data/taxonomy/taxonomy.test.ts`

**Interfaces:**
- Consumes: `Platform` enum from `src/constants/enums.ts` (relative import — seed runs under tsx)
- Produces:
  - `interface TaxonomyCategory { slug; name; path; parent?; defaultHsn; defaultGstRate; platformPaths?: Partial<Record<Platform, string>> }`
  - `CATEGORIES: TaxonomyCategory[]` (≥ 50 entries, unique slugs)
  - `getCategory(slug: string): TaxonomyCategory | undefined`

- [ ] **Step 1: Write the failing test**

`src/data/taxonomy/taxonomy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { CATEGORIES, getCategory } from './categories'

describe('taxonomy', () => {
  it('has at least 50 categories with unique slugs', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(50)
    const slugs = CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('keeps the 3 Phase 1 t-shirt categories with their exact mappings', () => {
    const mens = getCategory('mens-tshirts')!
    expect(mens.platformPaths?.[Platform.FLIPKART]).toBe("Men's T-Shirts")
    expect(mens.platformPaths?.[Platform.MYNTRA]).toBe("Men's Wear > T-Shirts")
    expect(mens.platformPaths?.[Platform.AMAZON]).toBe('Apparel > Men > T-Shirts')
    for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
      expect(getCategory(slug)).toBeDefined()
    }
  })
  it('gives every t-shirt category a path for all 8 platforms', () => {
    for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
      for (const p of Object.values(Platform)) {
        expect(getCategory(slug)!.platformPaths?.[p], `${slug} → ${p}`).toBeTruthy()
      }
    }
  })
  it('gives every category HSN and GST defaults', () => {
    for (const c of CATEGORIES) {
      expect(c.defaultHsn, c.slug).toMatch(/^\d{4}$/)
      expect(c.defaultGstRate, c.slug).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/data/taxonomy/taxonomy.test.ts`
Expected: FAIL — "Cannot find module './categories'"

- [ ] **Step 3: Write `src/data/taxonomy/categories.ts`**

```ts
import { Platform } from '../../constants/enums'

/*
 * TaxonomyCategory
 * One node of the seller-facing category tree (spec §8).
 * platformPaths: paths known from public docs; absent combos simply lack a
 * mapping (generation for that combo shows the existing clear error).
 */
export interface TaxonomyCategory {
  slug: string
  name: string
  path: string
  parent?: string
  defaultHsn: string
  defaultGstRate: number
  platformPaths?: Partial<Record<Platform, string>>
}

const T = Platform

/*
 * CATEGORIES
 * ponytail: apparel-led top ~50; non-tshirt categories carry only confident
 * FLIPKART/MYNTRA/AMAZON paths — extend per public-doc research later.
 */
export const CATEGORIES: TaxonomyCategory[] = [
  { slug: 'mens-tshirts', name: 'T-Shirts', path: "Clothing > Men's Wear > T-Shirts", defaultHsn: '6109', defaultGstRate: 5,
    platformPaths: { [T.FLIPKART]: "Men's T-Shirts", [T.MYNTRA]: "Men's Wear > T-Shirts", [T.AMAZON]: 'Apparel > Men > T-Shirts', [T.MEESHO]: "Men's Wear > T-Shirts", [T.SNAPDEAL]: "Men's Clothing > T-Shirts", [T.NYKAA]: 'Men > T-Shirts', [T.AJIO]: "Men's Wear > T-Shirts", [T.FIRSTCRY]: "Boys > Clothing > T-Shirts" } },
  { slug: 'womens-tshirts', name: 'T-Shirts', path: "Clothing > Women's Wear > T-Shirts", defaultHsn: '6109', defaultGstRate: 5,
    platformPaths: { [T.FLIPKART]: "Women's T-Shirts", [T.MYNTRA]: "Women's Wear > T-Shirts", [T.AMAZON]: 'Apparel > Women > T-Shirts', [T.MEESHO]: "Women's Wear > T-Shirts", [T.SNAPDEAL]: "Women's Clothing > T-Shirts", [T.NYKAA]: 'Women > T-Shirts', [T.AJIO]: "Women's Wear > T-Shirts", [T.FIRSTCRY]: "Girls > Clothing > T-Shirts" } },
  { slug: 'kids-tshirts', name: 'T-Shirts', path: 'Clothing > Kids > T-Shirts', defaultHsn: '6109', defaultGstRate: 5,
    platformPaths: { [T.FLIPKART]: "Men's T-Shirts", [T.MYNTRA]: 'Kids > T-Shirts', [T.AMAZON]: 'Apparel > Kids > T-Shirts', [T.MEESHO]: 'Kids > T-Shirts', [T.SNAPDEAL]: 'Kids Clothing > T-Shirts', [T.NYKAA]: 'Kids > T-Shirts', [T.AJIO]: 'Kids > T-Shirts', [T.FIRSTCRY]: "Boys > Clothing > T-Shirts" } },
  { slug: 'mens-shirts', name: 'Shirts', path: "Clothing > Men's Wear > Shirts", defaultHsn: '6205', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Men's Shirts", [T.MYNTRA]: "Men's Wear > Shirts", [T.AMAZON]: 'Apparel > Men > Shirts' } },
  { slug: 'mens-jeans', name: 'Jeans', path: "Clothing > Men's Wear > Jeans", defaultHsn: '6203', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Men's Jeans", [T.MYNTRA]: "Men's Wear > Jeans", [T.AMAZON]: 'Apparel > Men > Jeans' } },
  { slug: 'mens-trousers', name: 'Trousers & Chinos', path: "Clothing > Men's Wear > Trousers", defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'mens-kurtas', name: 'Kurtas', path: "Clothing > Men's Wear > Kurtas", defaultHsn: '6205', defaultGstRate: 5, platformPaths: { [T.MYNTRA]: "Men's Wear > Kurtas", [T.AMAZON]: 'Apparel > Men > Kurtas' } },
  { slug: 'mens-blazers', name: 'Blazers & Suits', path: "Clothing > Men's Wear > Blazers", defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'mens-sweatshirts', name: 'Sweatshirts & Hoodies', path: "Clothing > Men's Wear > Sweatshirts", defaultHsn: '6110', defaultGstRate: 5 },
  { slug: 'mens-jackets', name: 'Jackets & Coats', path: "Clothing > Men's Wear > Jackets", defaultHsn: '6201', defaultGstRate: 5 },
  { slug: 'mens-shorts', name: 'Shorts', path: "Clothing > Men's Wear > Shorts", defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'mens-socks', name: 'Socks', path: "Clothing > Men's Wear > Socks", defaultHsn: '6115', defaultGstRate: 5 },
  { slug: 'mens-underwear', name: 'Innerwear', path: "Clothing > Men's Wear > Innerwear", defaultHsn: '6107', defaultGstRate: 5 },
  { slug: 'mens-formal-shoes', name: 'Formal Shoes', path: "Footwear > Men > Formal Shoes", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'mens-casual-shoes', name: 'Casual Shoes', path: "Footwear > Men > Casual Shoes", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'womens-dresses', name: 'Dresses', path: "Clothing > Women's Wear > Dresses", defaultHsn: '6204', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Women's Dresses", [T.MYNTRA]: "Women's Wear > Dresses", [T.AMAZON]: 'Apparel > Women > Dresses' } },
  { slug: 'womens-kurtas', name: 'Kurtas & Kurtis', path: "Clothing > Women's Wear > Kurtas", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-sarees', name: 'Sarees', path: "Clothing > Women's Wear > Sarees", defaultHsn: '5407', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Women's Sarees", [T.MYNTRA]: "Women's Wear > Sarees", [T.AMAZON]: 'Apparel > Women > Sarees' } },
  { slug: 'womens-jeans', name: 'Jeans', path: "Clothing > Women's Wear > Jeans", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-tops', name: 'Tops & Tees', path: "Clothing > Women's Wear > Tops", defaultHsn: '6109', defaultGstRate: 5 },
  { slug: 'womens-skirts', name: 'Skirts', path: "Clothing > Women's Wear > Skirts", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-leggings', name: 'Leggings & Jeggings', path: "Clothing > Women's Wear > Leggings", defaultHsn: '6104', defaultGstRate: 5 },
  { slug: 'womens-nightwear', name: 'Nightwear', path: "Clothing > Women's Wear > Nightwear", defaultHsn: '6108', defaultGstRate: 5 },
  { slug: 'womens-ethnic-dresses', name: 'Ethnic Dresses', path: "Clothing > Women's Wear > Ethnic Dresses", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-heels', name: 'Heels & Wedges', path: "Footwear > Women > Heels", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'womens-flats', name: 'Flats & Sandals', path: "Footwear > Women > Flats", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'kids-dresses', name: 'Dresses', path: 'Clothing > Kids > Dresses', defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'kids-shirts', name: 'Shirts', path: 'Clothing > Kids > Shirts', defaultHsn: '6205', defaultGstRate: 5 },
  { slug: 'kids-jeans', name: 'Jeans', path: 'Clothing > Kids > Jeans', defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'kids-shoes', name: 'Shoes', path: 'Footwear > Kids > Shoes', defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'kids-socks', name: 'Socks', path: 'Clothing > Kids > Socks', defaultHsn: '6115', defaultGstRate: 5 },
  { slug: 'kids-pyjamas', name: 'Pyjamas & Sets', path: 'Clothing > Kids > Pyjamas', defaultHsn: '6108', defaultGstRate: 5 },
  { slug: 'kids-sweatshirts', name: 'Sweatshirts & Hoodies', path: 'Clothing > Kids > Sweatshirts', defaultHsn: '6110', defaultGstRate: 5 },
  { slug: 'home-bed-sheets', name: 'Bed Sheets', path: 'Home > Bedding > Bed Sheets', defaultHsn: '6302', defaultGstRate: 12 },
  { slug: 'home-towels', name: 'Towels', path: 'Home > Bath > Towels', defaultHsn: '6302', defaultGstRate: 12 },
  { slug: 'home-curtains', name: 'Curtains', path: 'Home > Furnishing > Curtains', defaultHsn: '6303', defaultGstRate: 12 },
  { slug: 'home-cushions', name: 'Cushions & Covers', path: 'Home > Furnishing > Cushions', defaultHsn: '9404', defaultGstRate: 12 },
  { slug: 'home-blankets', name: 'Blankets & Throws', path: 'Home > Bedding > Blankets', defaultHsn: '6301', defaultGstRate: 12 },
  { slug: 'bags-backpacks', name: 'Backpacks', path: 'Bags > Backpacks', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'bags-handbags', name: 'Handbags', path: 'Bags > Handbags', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'bags-laptop-bags', name: 'Laptop Bags', path: 'Bags > Laptop Bags', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'shoes-sandals', name: 'Sandals', path: 'Footwear > Sandals', defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'shoes-sneakers', name: 'Sneakers', path: 'Footwear > Sneakers', defaultHsn: '6404', defaultGstRate: 5 },
  { slug: 'shoes-sports-shoes', name: 'Sports Shoes', path: 'Footwear > Sports Shoes', defaultHsn: '6404', defaultGstRate: 5 },
  { slug: 'accessories-belts', name: 'Belts', path: 'Accessories > Belts', defaultHsn: '4203', defaultGstRate: 18 },
  { slug: 'accessories-wallets', name: 'Wallets', path: 'Accessories > Wallets', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'accessories-caps', name: 'Caps & Hats', path: 'Accessories > Caps', defaultHsn: '6505', defaultGstRate: 5 },
  { slug: 'accessories-sunglasses', name: 'Sunglasses', path: 'Accessories > Sunglasses', defaultHsn: '9004', defaultGstRate: 18 },
  { slug: 'accessories-scarves', name: 'Scarves & Stoles', path: 'Accessories > Scarves', defaultHsn: '6214', defaultGstRate: 5 },
  { slug: 'jewellery-necklaces', name: 'Necklaces', path: 'Jewellery > Necklaces', defaultHsn: '7113', defaultGstRate: 3 },
  { slug: 'jewellery-earrings', name: 'Earrings', path: 'Jewellery > Earrings', defaultHsn: '7113', defaultGstRate: 3 },
  { slug: 'watches-mens-watches', name: "Men's Watches", path: 'Watches > Men', defaultHsn: '9101', defaultGstRate: 18 },
  { slug: 'watches-womens-watches', name: "Women's Watches", path: 'Watches > Women', defaultHsn: '9101', defaultGstRate: 18 },
  { slug: 'sports-yoga-mats', name: 'Yoga Mats', path: 'Sports > Fitness > Yoga Mats', defaultHsn: '9506', defaultGstRate: 18 },
]

/*
 * getCategory
 * @param slug - category slug
 * @returns the taxonomy category or undefined
 */
export function getCategory(slug: string): TaxonomyCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}
```

- [ ] **Step 4: Rewrite `prisma/seed.ts`**

```ts
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { CATEGORIES } from '../src/data/taxonomy/categories'

/*
 * seed
 * Creates the category taxonomy and platform mappings from the taxonomy
 * data file. Mapping count depends on how many paths are documented.
 */
async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
  let mappings = 0
  for (const c of CATEGORIES) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        name: c.name,
        path: c.path,
        defaultHsn: c.defaultHsn,
        defaultGstRate: c.defaultGstRate,
      },
    })
    for (const [platform, path] of Object.entries(c.platformPaths ?? {})) {
      await db.categoryPlatformMapping.upsert({
        where: { id: `map-${c.slug}-${platform}` },
        update: {},
        create: {
          id: `map-${c.slug}-${platform}`,
          categorySlug: c.slug,
          platform,
          platformCategoryId: null,
          platformCategoryPath: path,
        },
      })
      mappings++
    }
  }
  console.log(`seeded ${CATEGORIES.length} categories × ${mappings} mappings`)
  await db.$disconnect()
}

main()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/data/taxonomy/taxonomy.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 6: Re-run the full suite + re-seed, verify counts**

```bash
pnpm test
npx prisma db seed
```

Expected: full suite passes; seed prints `seeded 53 categories × N mappings` (N ≥ 24: 3 t-shirt categories × 8 platforms).

- [ ] **Step 7: Commit**

```bash
git add src/data/taxonomy/ prisma/seed.ts
git commit -m "feat: 50+ category taxonomy with platform path mappings"
```

---

### Task 5: Five new platform templates

**Files:**
- Modify: `src/constants/enums.ts` (add 5 enum values)
- Create: `src/data/templates/meesho-t-shirt.ts`, `snapdeal-t-shirt.ts`, `nykaa-t-shirt.ts`, `ajio-t-shirt.ts`, `firstcry-t-shirt.ts`
- Modify: `src/data/templates/index.ts` (registry + `ALL_PLATFORMS` export)
- Modify: `src/app/dashboard/page.tsx` (8-platform GenerateButtons)
- Modify: `src/lib/templates/validate-template.test.ts` (8 platforms)
- Test: `src/lib/engine/engine.test.ts` (self-check per new platform)

**Interfaces:**
- Consumes: `TemplateColumn` from `src/lib/templates/types.ts` (unchanged)
- Produces: `ALL_PLATFORMS: Platform[]` (all 8, exported from `src/data/templates/index.ts`)

- [ ] **Step 1: Extend the enum**

`src/constants/enums.ts` — replace the enum body:

```ts
/*
 * Platform
 * Supported marketplace platforms.
 */
export enum Platform {
  FLIPKART = 'FLIPKART',
  MYNTRA = 'MYNTRA',
  AMAZON = 'AMAZON',
  MEESHO = 'MEESHO',
  SNAPDEAL = 'SNAPDEAL',
  NYKAA = 'NYKAA',
  AJIO = 'AJIO',
  FIRSTCRY = 'FIRSTCRY',
}
```

- [ ] **Step 2: Extend the template validation test first**

`src/lib/templates/validate-template.test.ts` — replace the second `it` block:

```ts
  it('exposes the t-shirt template for all 8 platforms and 3 categories', () => {
    for (const p of ['FLIPKART', 'MYNTRA', 'AMAZON', 'MEESHO', 'SNAPDEAL', 'NYKAA', 'AJIO', 'FIRSTCRY']) {
      for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
        expect(getTemplate(p as never, slug), `${p} / ${slug}`).not.toBeNull()
      }
    }
  })
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/templates/validate-template.test.ts`
Expected: FAIL — the 15 new platform/slug combos are missing from the registry.

- [ ] **Step 4: Write the 5 template files** (same pattern as `myntra-t-shirt.ts`)

`src/data/templates/meesho-t-shirt.ts`:

```ts
import type { TemplateColumn } from '@/lib/templates/types'

/*
 * meeshoColumns
 * Best-effort Meesho catalog upload schema (public template knowledge).
 * ponytail: shallow-but-valid; deepen per seller-portal research.
 */
export const meeshoColumns: TemplateColumn[] = [
  { name: 'Product Name', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number' },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string' },
  { name: 'Size', source: 'size', required: true, type: 'string' },
  { name: 'Colour', source: 'color', required: true, type: 'string' },
  { name: 'Stock', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string' },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string' },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]
```

`src/data/templates/snapdeal-t-shirt.ts`:

```ts
import type { TemplateColumn } from '@/lib/templates/types'

/*
 * snapdealColumns
 * Best-effort Snapdeal upload template (public template knowledge).
 * ponytail: shallow-but-valid; deepen per seller-portal research.
 */
export const snapdealColumns: TemplateColumn[] = [
  { name: 'Product Name', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number' },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string' },
  { name: 'Size', source: 'size', required: true, type: 'string' },
  { name: 'Colour', source: 'color', required: true, type: 'string' },
  { name: 'Quantity', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string' },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string' },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]
```

`src/data/templates/nykaa-t-shirt.ts`:

```ts
import type { TemplateColumn } from '@/lib/templates/types'

/*
 * nykaaColumns
 * Best-effort Nykaa Fashion upload schema (public template knowledge).
 * ponytail: shallow-but-valid; Nykaa docs are sparse — omit unknown columns.
 */
export const nykaaColumns: TemplateColumn[] = [
  { name: 'Product Title', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number' },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string' },
  { name: 'Size', source: 'size', required: true, type: 'string' },
  { name: 'Colour', source: 'color', required: true, type: 'string' },
  { name: 'Stock Quantity', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string' },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string' },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]
```

`src/data/templates/ajio-t-shirt.ts`:

```ts
import type { TemplateColumn } from '@/lib/templates/types'

/*
 * ajioColumns
 * Best-effort AJIO upload schema (public template knowledge).
 * ponytail: shallow-but-valid; AJIO docs are sparse — omit unknown columns.
 */
export const ajioColumns: TemplateColumn[] = [
  { name: 'Product Name', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number' },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string' },
  { name: 'Size', source: 'size', required: true, type: 'string' },
  { name: 'Colour', source: 'color', required: true, type: 'string' },
  { name: 'Stock', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string' },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string' },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]
```

`src/data/templates/firstcry-t-shirt.ts`:

```ts
import type { TemplateColumn } from '@/lib/templates/types'

/*
 * firstcryColumns
 * Best-effort FirstCry upload schema (public template knowledge).
 * ponytail: shallow-but-valid; FirstCry docs are sparse — omit unknown columns.
 */
export const firstcryColumns: TemplateColumn[] = [
  { name: 'Product Name', source: 'title', required: true, type: 'string' },
  { name: 'Product Description', source: 'description', required: true, type: 'string' },
  { name: 'Brand', source: 'brand', required: true, type: 'string' },
  { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
  { name: 'MRP', source: 'mrp', required: true, type: 'number' },
  { name: 'Selling Price', source: 'price', required: true, type: 'number' },
  { name: 'Seller SKU', source: 'sku', required: true, type: 'string' },
  { name: 'Size', source: 'size', required: true, type: 'string' },
  { name: 'Colour', source: 'color', required: true, type: 'string' },
  { name: 'Quantity', source: 'stock', required: true, type: 'int' },
  { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
  { name: 'HSN', source: 'hsn', required: true, type: 'string' },
  { name: 'GST %', source: 'gstRate', required: true, type: 'string' },
  { name: 'Image URLs', source: 'images', required: false, type: 'string' },
]
```

- [ ] **Step 5: Register the new platforms**

`src/data/templates/index.ts` — replace the imports + registry block + add export:

```ts
import { Platform } from '@/constants/enums'
import type { PlatformTemplate } from '@/lib/templates/types'
import { flipkartColumns } from './flipkart-t-shirt'
import { myntraColumns } from './myntra-t-shirt'
import { amazonColumns } from './amazon-t-shirt'
import { meeshoColumns } from './meesho-t-shirt'
import { snapdealColumns } from './snapdeal-t-shirt'
import { nykaaColumns } from './nykaa-t-shirt'
import { ajioColumns } from './ajio-t-shirt'
import { firstcryColumns } from './firstcry-t-shirt'

/*
 * ALL_PLATFORMS
 * Every platform with a registered template.
 */
export const ALL_PLATFORMS: Platform[] = [
  Platform.FLIPKART,
  Platform.MYNTRA,
  Platform.AMAZON,
  Platform.MEESHO,
  Platform.SNAPDEAL,
  Platform.NYKAA,
  Platform.AJIO,
  Platform.FIRSTCRY,
]

/*
 * T_SHIRT_SLUGS
 * Category slugs every platform template supports.
 * ponytail: T-shirts for all 3 seeded categories; more categories are data additions later.
 */
const T_SHIRT_SLUGS = ['mens-tshirts', 'womens-tshirts', 'kids-tshirts'] as const

/*
 * Registry
 * One PlatformTemplate per (platform, category) built from shared column defs.
 */
const REGISTRY: PlatformTemplate[] = [
  { platform: Platform.FLIPKART, columns: flipkartColumns },
  { platform: Platform.MYNTRA, columns: myntraColumns },
  { platform: Platform.AMAZON, columns: amazonColumns },
  { platform: Platform.MEESHO, columns: meeshoColumns },
  { platform: Platform.SNAPDEAL, columns: snapdealColumns },
  { platform: Platform.NYKAA, columns: nykaaColumns },
  { platform: Platform.AJIO, columns: ajioColumns },
  { platform: Platform.FIRSTCRY, columns: firstcryColumns },
].flatMap((p) =>
  T_SHIRT_SLUGS.map((categorySlug) => ({ platform: p.platform, version: '1.0', categorySlug, columns: p.columns })),
)
```

(`getTemplate`, `getTemplatesForPlatform`, `getAllTemplates` stay as-is.)

- [ ] **Step 6: Wire all 8 platforms into the dashboard**

`src/app/dashboard/page.tsx` — change the import line and the GenerateButtons call:

```ts
import { ALL_PLATFORMS } from '@/data/templates'
```

```tsx
              <GenerateButtons productId={p.id} platforms={ALL_PLATFORMS} />
```

Remove the now-unused `import { Platform } from '@/constants/enums'` from that file.

- [ ] **Step 7: Extend the engine test with per-platform self-checks**

Append to `src/lib/engine/engine.test.ts` (inside the existing describe):

```ts
  it('renders a valid file for every platform and t-shirt category', () => {
    for (const platform of ['FLIPKART', 'MYNTRA', 'AMAZON', 'MEESHO', 'SNAPDEAL', 'NYKAA', 'AJIO', 'FIRSTCRY']) {
      for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
        const t = getTemplate(platform as never, slug)!
        const out = generateFile(product, variants, t)
        expect(out.csv).toContain('TS-BLK-M')
        expect(out.xlsx.length).toBeGreaterThan(0)
        expect(out.issues).toEqual([])
      }
    }
  })
```

- [ ] **Step 8: Run the tests**

Run: `pnpm test`
Expected: PASS — all existing + new tests (validate-template 2, engine 8)

- [ ] **Step 9: Lint + build**

Run: `pnpm lint && pnpm build`
Expected: both clean (the `Platform` import removal in step 6 must leave no unused imports).

- [ ] **Step 10: Commit**

```bash
git add src/constants/enums.ts src/data/templates/ src/app/dashboard/page.tsx src/lib/templates/validate-template.test.ts src/lib/engine/engine.test.ts
git commit -m "feat: five new platform templates and 8-platform dashboard"
```

---

### Task 6: Import server action (bulk create)

**Files:**
- Create: `src/lib/actions/import-products.ts`

**Interfaces:**
- Consumes: `auth()` from `@/lib/auth`, `db` from `@/lib/db`, `ImportRow` + `ValidImportRow` from `@/lib/import/import-schema`
- Produces:
  - `interface ImportResult { created: number; errors: { row: number; reason: string }[] }`
  - `importProductsAction(data: { categorySlug: string; rows: ImportRow[] }): Promise<ImportResult>`

- [ ] **Step 1: Write the action**

`src/lib/actions/import-products.ts`:

```ts
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { importRowSchema, type ImportRow } from '@/lib/import/import-schema'

/*
 * ImportResult
 * created = valid rows persisted; errors = skipped rows with reasons (spec D4).
 */
export interface ImportResult {
  created: number
  errors: { row: number; reason: string }[]
}

/*
 * importProductsAction
 * Validates every row, backfills hsn/gstRate from the category defaults,
 * and bulk-creates each valid row as Product + one Variant in one transaction.
 */
export async function importProductsAction(data: {
  categorySlug: string
  rows: ImportRow[]
}): Promise<ImportResult> {
  const session = await auth()
  const failAll = (reason: string): ImportResult => ({
    created: 0,
    errors: data.rows.map((r) => ({ row: r.fileRow, reason })),
  })
  if (!session?.user) return failAll('unauthorized')
  const category = await db.category.findUnique({ where: { slug: data.categorySlug } })
  if (!category) return failAll('unknown category')

  const errors: { row: number; reason: string }[] = []
  const valid: ReturnType<typeof importRowSchema.parse>[] = []
  for (const r of data.rows) {
    const parsed = importRowSchema.safeParse(r)
    if (!parsed.success) {
      errors.push({ row: r.fileRow, reason: parsed.error.issues[0]?.message ?? 'invalid row' })
      continue
    }
    valid.push(parsed.data)
  }

  await db.$transaction(
    valid.map((row) =>
      db.product.create({
        data: {
          userId: session.user.id as string,
          title: row.title,
          description: row.description ?? '',
          brand: row.brand ?? '',
          categorySlug: data.categorySlug,
          hsn: row.hsn && row.hsn.trim() ? row.hsn : category.defaultHsn,
          gstRate: row.gstRate ?? category.defaultGstRate,
          variants: {
            create: {
              sku: row.sku,
              size: row.size,
              color: row.color ?? '',
              mrp: row.mrp ?? 0,
              price: row.price,
              stock: row.stock ?? 0,
              weightGrams: row.weightGrams ?? 0,
            },
          },
        },
      }),
    ),
  )
  return { created: valid.length, errors }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/import-products.ts
git commit -m "feat: bulk import server action with skip-bad-rows report"
```

---

### Task 7: Import wizard UI

**Files:**
- Create: `src/app/dashboard/import/page.tsx`
- Create: `src/components/import/import-wizard.tsx`
- Modify: `src/app/dashboard/layout.tsx` (nav link "Import")
- Modify: `src/app/dashboard/page.tsx` (header button "Import products")

**Interfaces:**
- Consumes: `parseFile`, `ParsedFile` from `@/lib/import/parse`; `autoMapHeaders`, `suggestCategory` from `@/lib/import/auto-map`; `STANDARD_FIELDS`, `MATCH_THRESHOLD`, `tokenOverlap`, `type StandardField` from `@/lib/import/aliases`; `importProductsAction`, `type ImportResult` from `@/lib/actions/import-products`; `CATEGORIES` from `@/data/taxonomy/categories`; `Select` + `SelectItem` etc. from `@/components/ui/select` (check exported names in `select.tsx` and adapt: Base UI Select exports `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`)
- Produces: nothing for later tasks (terminal UI)

- [ ] **Step 1: Create the page shell**

`src/app/dashboard/import/page.tsx`:

```tsx
import { ImportWizard } from '@/components/import/import-wizard'

/*
 * ImportPage
 * Shell page — the wizard is a client component (file parsing is client-side).
 */
export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import products</h1>
        <p className="mt-1 text-sm text-brand-foreground-muted">
          Upload a catalog CSV or XLSX — we auto-map the headers, you confirm, then everything loads in one go.
        </p>
      </div>
      <ImportWizard />
    </div>
  )
}
```

- [ ] **Step 2: Write the wizard component**

`src/components/import/import-wizard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES, getCategory } from '@/data/taxonomy/categories'
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
    setPending(true)
    setResult(await importProductsAction({ categorySlug, rows: rowsToImport(parsed, mapping) }))
    setPending(false)
    setStep(4)
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
            <Select value={categorySlug} onValueChange={setCategorySlug}>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={!categorySlug} onClick={load}>
                Preview & load
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
```

- [ ] **Step 3: Add the nav link**

`src/app/dashboard/layout.tsx` — inside `<nav>`, after the History link:

```tsx
            <Link href="/dashboard/import" className="text-brand-foreground-muted hover:text-brand-foreground">
              Import
            </Link>
```

- [ ] **Step 4: Add the dashboard header button**

`src/app/dashboard/page.tsx` — next to the existing Add product link:

```tsx
        <div className="flex gap-2">
          <Link href="/dashboard/import">
            <Button variant="outline">Import products</Button>
          </Link>
          <Link href="/dashboard/new">
            <Button>Add product</Button>
          </Link>
        </div>
```

- [ ] **Step 5: Lint + build**

Run: `pnpm lint && pnpm build`
Expected: both clean. If `select.tsx` exports differ from the assumed names, adapt the import line to the actual exports.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/import/ src/components/import/ src/app/dashboard/layout.tsx src/app/dashboard/page.tsx
git commit -m "feat: 4-step import wizard with mapping confirmation and preview"
```

---

### Task 8: E2E verification

**Files:**
- Create: `e2e-fixtures/import-valid.csv`, `e2e-fixtures/import-bad.csv`

**Interfaces:**
- Consumes: the full Phase 2 feature set

- [ ] **Step 1: Create fixtures**

`e2e-fixtures/import-valid.csv` (aliased headers, one quoted comma, one comma in number, multi-row):

```csv
Product Title,Product Description,Brand,Seller SKU,MRP,Selling Price,Size,Colour,Stock,Weight (g),HSN,GST %,Category
Classic White Tee,"Soft, breathable cotton",TestBrand,CSV-001,999,599,M,White,25,180,61091000,5,T-Shirts
Classic Black Tee,Regular fit cotton tee,TestBrand,CSV-002,999,649,L,Black,15,180,61091000,5,T-Shirts
Classic Navy Tee,Regular fit cotton tee,TestBrand,CSV-003,999,649,XL,Navy,10,180,61091000,5,T-Shirts
Stripe Tee,Striped cotton tee,TestBrand,CSV-004,1099,699,1,299,M,Blue,8,180,61091000,5,T-Shirts
```

(`Colour` → color, `MRP,Selling Price` → mrp/price, `GST %` → gstRate, `1,299` exercises comma-stripping.)

`e2e-fixtures/import-bad.csv` (2 bad rows + 1 good):

```csv
Product Title,Product Description,Brand,Seller SKU,MRP,Selling Price,Size,Colour,Stock,Weight (g),HSN,GST %,Category
Good Tee,Ok tee,TestBrand,CSV-BAD-001,999,599,M,Green,10,180,61091000,5,T-Shirts
,Missing title,TestBrand,CSV-BAD-002,999,599,M,Green,10,180,61091000,5,T-Shirts
Bad Price Tee,Free tee,TestBrand,CSV-BAD-003,999,free,M,Green,10,180,61091000,5,T-Shirts
```

- [ ] **Step 2: Start the app and log in**

```bash
pnpm build
lsof -ti tcp:3101 | xargs kill 2>/dev/null
(PORT=3101 AUTH_TRUST_HOST=true pnpm start >> /tmp/cake-server.log 2>&1 &)
sleep 4
```

Then in the browse session (gstack browse, preamble already run): `goto http://localhost:3101/login`, sign in as an existing user (`seller@test.com` / `password123` from Phase 1, or sign up fresh), expect `/dashboard`.

- [ ] **Step 3: Import the valid file**

In browse: `goto http://localhost:3101/dashboard/import`, then use `upload` (or `fill` on the file input) with `e2e-fixtures/import-valid.csv`.

Verify (snapshot):
- Step 2 shows headers; the mapping selects are pre-filled (Product Title → title, Selling Price → price, GST % → gstRate, Category → category)
- Click Next → Step 3 shows the category select pre-suggested
- Click Preview & load → Step 4 shows "Imported 4 products" and a preview table
- `goto http://localhost:3101/dashboard` → 4 products with the CSV titles listed, all 8 Generate buttons per product
- Click Generate MEESHO on one product → "Download file" link appears; fetch the URL via the browser's same-origin `js fetch` and confirm the CSV contains the product title and a `Category Path` column with the Meesho path

- [ ] **Step 4: Import the bad file**

In browse: `goto http://localhost:3101/dashboard/import`, upload `e2e-fixtures/import-bad.csv`.

Verify:
- Step 4 shows "Imported 1 product" and "Skipped 2 rows" with `Row 2: missing title` and `Row 3: invalid price`
- `goto http://localhost:3101/dashboard` → the good row's product appears; no products from the skipped rows

- [ ] **Step 5: XLSX spot-check**

In browse devtools (js): fetch the xlsx endpoint from a generation (`?format=xlsx`), read it with SheetJS in the browser eval, and confirm the first row matches the template headers. (Optional if the unit test coverage is green — skip if the server log shows no errors during steps 3-4.)

- [ ] **Step 6: Full suite + commit**

```bash
pnpm test
pnpm lint
git add e2e-fixtures/
git commit -m "test: import wizard e2e fixtures"
```

Expected: all green.

---

## Self-Review Notes

- **Spec coverage:** §5 wizard steps → Task 7; §6.1 aliases → Task 1; §6.2 row validation → Task 3; §7 platforms → Task 5; §8 taxonomy → Task 4; §9 UI → Task 7; §10 error handling → Tasks 2/3/6/7; §11 testing → all tasks + Task 8; D2 row semantics → Task 6; D3 formats → Task 2; D4 skip-bad → Task 6; D5 one category → Task 7; D6 t-shirt-only templates → Task 5. No gaps.
- **Type consistency:** `ImportRow`/`ValidImportRow` defined once (Task 3) and consumed by Tasks 6-7; `ParsedFile` (Task 2) consumed by Task 7; `autoMapHeaders`/`suggestCategory` signatures (Task 1) match Task 7 usage; `ALL_PLATFORMS` (Task 5) consumed by Task 5's dashboard wiring only.
- **Note on Phase 1 wart:** the Phase 1 seed mapped ALL three t-shirt categories to the same per-platform path (e.g. kids-tshirts → "Men's T-Shirts" on Flipkart). Task 4 preserves these mappings exactly per spec §8 (regression guard); fixing them is a data change you can make later.
- **Env:** `.env` unchanged (AUTH_SECRET/AUTH_TRUST_HOST already set in Phase 1). Do not commit `.env` or `prisma/dev.db` (gitignored).
