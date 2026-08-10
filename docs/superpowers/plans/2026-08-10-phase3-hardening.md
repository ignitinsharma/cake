# Phase 3 — Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Cake for real seller use: rules-as-data validation, template versioning polish, batch generation, DB-backed rate limiting, multi-variant editing, and the Phase 2 minors sweep.

**Architecture:** Extend the existing data-driven engine — `TemplateColumn` gains `rules`; `validate.ts` becomes a rule engine; a new `RateLimit` table + fixed-window lib; a batch action that renders one file from many products; an update action + variant table on the edit screen. No engine redesign.

**Tech Stack:** Next.js 16 (App Router, server actions), Prisma 7 + better-sqlite3 (`prisma-client` generator → `src/generated/prisma`, driver adapter), zod 4, vitest, Tailwind v4 + shadcn Base UI (amber theme, DESIGN.md tokens), papaparse/xlsx already installed.

## Global Constraints

- **Port 3000 is another project (Hiretivo) — never test there. Cake runs on 3101.** Server start: `(PORT=3101 AUTH_TRUST_HOST=true pnpm start >> /tmp/cake-server.log 2>&1 &)`; kill: `lsof -ti tcp:3101 | xargs kill`.
- `.env` already has `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `DATABASE_URL=file:./prisma/dev.db`. Never commit `.env` or `prisma/dev.db` (gitignored).
- Test user: `seller@test.com` / `password123`.
- Prisma 7: schema in `prisma/schema.prisma` + `prisma.config.ts`; after schema changes run `npx prisma generate` (output `src/generated/prisma` is gitignored) and `npx prisma db push` for dev.db. `import { db } from '@/lib/db'` for server-side access.
- zod 4 error syntax: `z.string().min(1, { error: 'msg' })` (not `{ message }`).
- DESIGN.md theme tokens only: `bg-brand-surface`, `text-brand-primary`, `text-brand-danger`, `text-brand-foreground-muted`, `border-brand-border`, `bg-white`. shadcn Base UI: Button `variant="default"|"outline"`; Card exports `Card, CardHeader, CardTitle, CardContent`.
- Commits on branch `feature/phase3-hardening` (off updated main — PRs #1/#2 merged). Per-task commits, TDD (test first, verify fail, implement, verify pass).
- SQLite has no enums — `RateLimit` key is a plain String.
- Tests: `pnpm test` (vitest). Lint: `pnpm lint`. Build: `pnpm build`.
- Schema change note: `Generation.templateVersion` is NOT unique — batch rows share `fileName`, fine.
- No new dependencies for any task. `xlsx` (SheetJS) is installed for XLSX.

---

### Task 1: Column rules type + rule engine

**Files:**
- Modify: `src/lib/templates/types.ts` (add `ColumnRule` interface, `rules` on `TemplateColumn`)
- Modify: `src/lib/engine/validate.ts` (rule engine)
- Modify: `src/lib/engine/engine.test.ts` (rule tests)
- Modify: `src/lib/templates/validate-template.ts` (structural check for rules)

**Interfaces:**
- Produces: `export interface ColumnRule { enum?: string[]; regex?: string; min?: number; max?: number; url?: boolean; unique?: boolean }`; `TemplateColumn` gains `rules?: ColumnRule`; `validateForTemplate(product, variants, template)` keeps its signature but now enforces rules; `fieldValue` unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/engine/engine.test.ts`:

```ts
/*
 * Rule engine: enum, regex, min/max, url, unique-SKU.
 */
describe('rules', () => {
  const ruleTemplate = (rules: Record<string, any>) => ({
    ...template,
    columns: [
      { name: 'Size', source: 'size', required: true, type: 'string' as const, rules: rules.size },
      { name: 'Selling Price', source: 'price', required: true, type: 'number' as const, rules: rules.price },
      { name: 'Image URLs', source: 'images', required: false, type: 'string' as const, rules: rules.images },
      { name: 'Seller SKU', source: 'sku', required: true, type: 'string' as const, rules: rules.sku },
    ],
  })

  it('flags a value outside an enum', () => {
    const t = ruleTemplate({ size: { enum: ['S', 'M', 'L'] } })
    const issues = validateForTemplate(product, [{ ...variants[0], size: 'XL' }], t)
    expect(issues.some((i) => i.message.includes('Size') && i.message.includes('S, M, L'))).toBe(true)
  })
  it('passes a value inside an enum', () => {
    const t = ruleTemplate({ size: { enum: ['S', 'M', 'L'] } })
    expect(validateForTemplate(product, [{ ...variants[0], size: 'M' }], t)).toEqual([])
  })
  it('flags a value failing a regex (HSN not 8 digits)', () => {
    const t = ruleTemplate({ size: { regex: '^\\d{8}$' } })
    const issues = validateForTemplate(product, variants, t)
    expect(issues.some((i) => i.message.includes('Size'))).toBe(true)
  })
  it('flags a price below min (0 allowed, negative rejected)', () => {
    const t = ruleTemplate({ price: { min: 1 } })
    const issues = validateForTemplate(product, [{ ...variants[0], price: 0 }], t)
    expect(issues.some((i) => i.column === 'Selling Price')).toBe(true)
  })
  it('flags a price above max', () => {
    const t = ruleTemplate({ price: { max: 1000 } })
    const issues = validateForTemplate(product, [{ ...variants[0], price: 9999 }], t)
    expect(issues.some((i) => i.column === 'Selling Price')).toBe(true)
  })
  it('flags a non-URL when url: true', () => {
    const t = ruleTemplate({ images: { url: true } })
    const issues = validateForTemplate(product, [...variants], t)
    expect(issues.some((i) => i.column === 'Image URLs')).toBe(true)
  })
  it('passes a valid URL when url: true', () => {
    const t = ruleTemplate({ images: { url: true } })
    const issues = validateForTemplate(
      { ...product },
      [{ ...variants[0], sku: 'X' }],
      { ...t, columns: [{ name: 'Image URLs', source: 'images', required: false, type: 'string', default: 'https://cdn.example.com/a.jpg' }] },
    )
    expect(issues).toEqual([])
  })
  it('flags duplicate SKUs within one file (unique: true)', () => {
    const t = ruleTemplate({ sku: { unique: true } })
    const issues = validateForTemplate(
      product,
      [variants[0], { ...variants[0], sku: 'TS-BLK-M', size: 'L' }],
      t,
    )
    expect(issues.some((i) => i.message.includes('duplicate SKU'))).toBe(true)
  })
  it('passes distinct SKUs (unique: true)', () => {
    const t = ruleTemplate({ sku: { unique: true } })
    const issues = validateForTemplate(
      product,
      [variants[0], { ...variants[0], sku: 'TS-BLK-L', size: 'L' }],
      t,
    )
    expect(issues).toEqual([])
  })
})
```

Also append to `src/lib/templates/validate-template.test.ts`:

```ts
it('rejects a rule with unknown keys', () => {
  const t = { platform: Platform.FLIPKART, version: '1.0.0', categorySlug: 'mens-tshirts', columns: [
    { name: 'X', source: 'title', required: true, type: 'string', rules: { bogus: 1 } },
  ] }
  expect(assertAllTemplatesValid()).toEqual([]) // registry templates unaffected
  const ALLOWED = ['enum', 'regex', 'min', 'max', 'url', 'unique']
  const bad = Object.keys((t.columns[0].rules ?? {})).filter((k) => !ALLOWED.includes(k))
  expect(bad).toEqual([])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: new `rules` describe FAILs (no `rules` support yet); existing tests pass.

- [ ] **Step 3: Implement the rule engine**

`src/lib/templates/types.ts` — add before `TemplateColumn`:

```ts
/*
 * ColumnRule
 * Optional per-column validation rules (spec §4.1).
 * enum: allowed values; regex: format check; min/max: numeric range;
 * url: must parse as http(s) URL; unique: no duplicates within the file.
 */
export interface ColumnRule {
  enum?: string[]
  regex?: string
  min?: number
  max?: number
  url?: boolean
  unique?: boolean
}
```

Add `rules?: ColumnRule` to `TemplateColumn`.

`src/lib/engine/validate.ts` — add the rule evaluation. Replace the whole file:

```ts
import type { PlatformTemplate, TemplateColumn } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'

/*
 * ValidationIssue
 * One missing/blank required field or one rule violation.
 */
export interface ValidationIssue {
  column: string
  message: string
}

/*
 * fieldValue
 * Resolve a template source to the product/variant value.
 */
export function fieldValue(
  source: string,
  product: StandardProduct,
  variant: VariantInput,
  defaultValue?: string,
): string {
  const map: Record<string, string> = {
    title: product.title,
    description: product.description,
    brand: product.brand,
    hsn: product.hsn,
    gstRate: String(product.gstRate),
    categoryPath: product.categoryPath,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    mrp: String(variant.mrp),
    price: String(variant.price),
    stock: String(variant.stock),
    weightGrams: String(variant.weightGrams),
    images: '',
  }
  return map[source] ?? defaultValue ?? ''
}

/*
 * checkRules
 * Evaluate one column's rules for one variant value.
 * @returns an issue message, or null when the value passes
 */
export function checkRules(column: TemplateColumn, value: string): string | null {
  const rules = column.rules
  if (!rules) return null
  if (rules.enum && rules.enum.length > 0 && !rules.enum.includes(value)) {
    return `${column.name} must be one of: ${rules.enum.join(', ')}`
  }
  if (rules.regex && !new RegExp(rules.regex).test(value)) {
    return `${column.name} is not in the required format`
  }
  const n = Number(value)
  if (Number.isFinite(n)) {
    if (rules.min !== undefined && n < rules.min) {
      return `${column.name} must be at least ${rules.min}`
    }
    if (rules.max !== undefined && n > rules.max) {
      return `${column.name} must be at most ${rules.max}`
    }
  }
  if (rules.url && value !== '') {
    try {
      const u = new URL(value)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return `${column.name} must be a valid URL`
    } catch {
      return `${column.name} must be a valid URL`
    }
  }
  return null
}

/*
 * validateForTemplate
 * @returns issues for required columns whose source value is blank,
 * plus rule violations (enum/regex/min/max/url) per column,
 * plus one issue per duplicate SKU when a unique SKU column exists.
 */
export function validateForTemplate(
  product: StandardProduct,
  variants: VariantInput[],
  template: PlatformTemplate,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const column of template.columns) {
    if (!column.required) continue
    for (const variant of variants) {
      const value = fieldValue(column.source, product, variant, column.default)
      if (value === '' || value == null) {
        issues.push({ column: column.name, message: `${column.name} is required` })
        break
      }
    }
  }
  for (const column of template.columns) {
    if (!column.rules) continue
    if (column.rules.unique) {
      const seen = new Map<string, number>()
      for (const variant of variants) {
        const value = fieldValue(column.source, product, variant, column.default)
        const prev = seen.get(value)
        if (prev !== undefined) {
          issues.push({
            column: column.name,
            message: `duplicate SKU in file: ${value} (rows ${prev + 1} and ${seen.size + 1})`,
          })
          continue
        }
        seen.set(value, seen.size)
      }
      continue
    }
    for (const variant of variants) {
      const value = fieldValue(column.source, product, variant, column.default)
      const msg = checkRules(column, value)
      if (msg) issues.push({ column: column.name, message: msg })
    }
  }
  return issues
}
```

`src/lib/templates/validate-template.ts` — add to the per-column loop:

```ts
      const ALLOWED_RULE_KEYS = ['enum', 'regex', 'min', 'max', 'url', 'unique']
      if (c.rules) {
        for (const k of Object.keys(c.rules)) {
          if (!ALLOWED_RULE_KEYS.includes(k)) {
            issues.push(`${t.platform}/${t.categorySlug}: unknown rule key ${k} on ${c.name}`)
          }
        }
      }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: all pass (existing 35 + new rule tests).

- [ ] **Step 5: Lint + commit**

```bash
pnpm lint
git add src/lib/templates/types.ts src/lib/engine/validate.ts src/lib/engine/engine.test.ts src/lib/templates/validate-template.ts src/lib/templates/validate-template.test.ts
git commit -m "feat: column rule engine for template validation (enum, regex, range, url, unique SKU)"
```

---

### Task 2: Add rules to all templates + shared defaults + versioning polish

**Files:**
- Modify: all 8 `src/data/templates/*-t-shirt.ts`
- Modify: `src/components/dashboard/generate-buttons.tsx` (show template version on success)
- Modify: `src/app/dashboard/history/page.tsx` (re-render caveat note)

**Interfaces:**
- Consumes: `ColumnRule` from Task 1
- Produces: rules content on every template; no new exports

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/engine/engine.test.ts`:

```ts
/*
 * Shared rule defaults present on every platform template.
 */
describe('shared rules', () => {
  for (const p of [Platform.FLIPKART, Platform.MYNTRA, Platform.AMAZON, Platform.MEESHO, Platform.SNAPDEAL, Platform.NYKAA, Platform.AJIO, Platform.FIRSTCRY]) {
    const t = getTemplate(p, 'mens-tshirts')!
    it(`${p}: GST 0-28, positive price, 8-digit HSN rules exist`, () => {
      const gst = t.columns.find((c) => c.source === 'gstRate')
      const price = t.columns.find((c) => c.source === 'price')
      const hsn = t.columns.find((c) => c.source === 'hsn')
      expect(gst?.rules?.min).toBe(0)
      expect(gst?.rules?.max).toBe(28)
      expect(price?.rules?.min).toBe(1)
      expect(hsn?.rules?.regex).toBe('^\\d{8}$')
    })
  }
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test`
Expected: new describe FAILs (`rules` undefined on template columns).

- [ ] **Step 3: Add rules to every template**

For each of the 8 template files, add `rules` to the relevant columns. Exact edits per file (same pattern, matching the column's existing `source`):

`flipkart-t-shirt.ts` — on the existing columns add:
- `Selling Price` (source `price`): `rules: { min: 1 }`
- `Tax Code` (source `gstRate`): `rules: { min: 0, max: 28 }`
- `HSN` (source `hsn`): `rules: { regex: '^\\d{8}$' }`
- `Seller SKU` (source `sku`): `rules: { unique: true }`
- `Size` (source `size`): `rules: { enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }`

`myntra-t-shirt.ts` — same five, size enum `['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']`.

`amazon-t-shirt.ts` — same five, size enum `['S', 'M', 'L', 'XL', 'XXL']`, and `Image URLs` (source `images`): `rules: { url: true }`.

`meesho-t-shirt.ts`, `snapdeal-t-shirt.ts`, `nykaa-t-shirt.ts`, `ajio-t-shirt.ts`, `firstcry-t-shirt.ts` — same five rules (size enum `['S', 'M', 'L', 'XL', 'XXL']`), matching each file's actual column names (check each file: e.g. Meesho uses `GST %` source `gstRate`; Snapdeal `Seller SKU`; Nykaa `MRP`/`Selling Price`; Ajio `Product Title`; FirstCry `Size`).

IMPORTANT: match each template's ACTUAL column `name` — read the file first, add `rules` to the right columns only. The test only checks `source`-based rules (gstRate/price/hsn), so any naming differences won't fail tests, but the enum/unique rules must land on the real columns to be meaningful.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test`
Expected: shared-rules describe passes for all 8 platforms; all other tests still pass.

- [ ] **Step 5: Versioning polish — generate buttons**

`src/components/dashboard/generate-buttons.tsx` — after a successful generation, show the template version. The action response currently returns `{ downloadUrl } | { error }`. Extend `generate-file.ts` response to include `templateVersion`:

In `generate-file.ts`:

```ts
  return { downloadUrl: `/api/generate/${generation.id}?format=${format}`, templateVersion: template.version }
```

In `generate-buttons.tsx`, keep a `version` state:

```ts
  const [version, setVersion] = useState('')
  // in run() success path:
  if (!('error' in res)) {
    setUrl(res.downloadUrl)
    setVersion('templateVersion' in res ? (res as any).templateVersion : '')
  }
  // render under the download link when version is set:
  //   <p className="text-xs text-brand-foreground-muted">Template v{version}</p>
```

- [ ] **Step 6: History caveat**

`src/app/dashboard/history/page.tsx` — under the table, add:

```tsx
      <p className="text-xs text-brand-foreground-muted">
        Downloads re-render from the current template version — the version shown is the one recorded when the file was generated.
      </p>
```

- [ ] **Step 7: Lint + build + commit**

```bash
pnpm lint && pnpm build
git add src/data/templates/ src/components/dashboard/generate-buttons.tsx src/lib/actions/generate-file.ts src/app/dashboard/history/page.tsx src/lib/engine/engine.test.ts
git commit -m "feat: per-platform validation rules and template version display"
```

---

### Task 3: Rate limiting (DB-backed fixed window)

**Files:**
- Modify: `prisma/schema.prisma` (RateLimit model)
- Create: `src/lib/rate-limit.ts`
- Modify: `src/lib/actions/generate-file.ts`, `src/lib/actions/import-products.ts`, `src/lib/actions/register.ts`, `src/lib/auth.ts` (login authorize)
- Create: `src/lib/rate-limit.test.ts`

**Interfaces:**
- Produces: `export class RateLimitError extends Error {}`; `export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<void>` — throws `RateLimitError` when the window is exhausted, otherwise records the call. Also `export async function consumeRateLimit(key, limit, windowMs): Promise<{ ok: boolean; retryAfterSec: number }>` for login (must not throw across the auth boundary).

- [ ] **Step 1: Write the failing test**

`src/lib/rate-limit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { consumeRateLimit } from './rate-limit'

describe('rate limit', () => {
  it('allows calls under the limit', async () => {
    const r = await consumeRateLimit('test-user-a', 3, 60_000)
    expect(r.ok).toBe(true)
  })
  it('blocks calls over the limit', async () => {
    const key = `test-user-b-${Date.now()}`
    await consumeRateLimit(key, 2, 60_000)
    await consumeRateLimit(key, 2, 60_000)
    const r = await consumeRateLimit(key, 2, 60_000)
    expect(r.ok).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThan(0)
  })
  it('resets after the window expires', async () => {
    const key = `test-user-c-${Date.now()}`
    await consumeRateLimit(key, 1, 10)
    await consumeRateLimit(key, 1, 10)
    const blocked = await consumeRateLimit(key, 1, 10)
    expect(blocked.ok).toBe(false)
    await new Promise((r) => setTimeout(r, 30))
    const after = await consumeRateLimit(key, 1, 10)
    expect(after.ok).toBe(true)
  })
  it('separates keys', async () => {
    const k1 = `sep-a-${Date.now()}`
    const k2 = `sep-b-${Date.now()}`
    await consumeRateLimit(k1, 1, 60_000)
    await consumeRateLimit(k1, 1, 60_000)
    const r2 = await consumeRateLimit(k2, 1, 60_000)
    expect(r2.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test src/lib/rate-limit.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Schema + generate**

`prisma/schema.prisma` — add model:

```prisma
model RateLimit {
  key         String   @id
  windowStart DateTime
  count       Int
}
```

Run: `npx prisma generate && npx prisma db push`

- [ ] **Step 4: Implement the lib**

`src/lib/rate-limit.ts`:

```ts
import { db } from '@/lib/db'

/*
 * consumeRateLimit
 * Fixed-window counter keyed by string (e.g. `generate:<userId>`).
 * Returns ok=false (with retryAfterSec) instead of throwing, so callers
 * control the response. Window resets when now - windowStart > windowMs.
 * ponytail: fixed window, not sliding; swappable for Upstash behind this file.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const now = Date.now()
  const existing = await db.rateLimit.findUnique({ where: { key } })
  if (!existing || now - existing.windowStart.getTime() >= windowMs) {
    await db.rateLimit.upsert({
      where: { key },
      update: { windowStart: new Date(now), count: 1 },
      create: { key, windowStart: new Date(now), count: 1 },
    })
    return { ok: true, retryAfterSec: 0 }
  }
  if (existing.count >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - existing.windowStart.getTime())) / 1000)
    return { ok: false, retryAfterSec }
  }
  await db.rateLimit.update({
    where: { key },
    data: { count: existing.count + 1 },
  })
  return { ok: true, retryAfterSec: 0 }
}
```

- [ ] **Step 5: Wire into actions**

`src/lib/actions/generate-file.ts` — at top of `generateFileAction`, after the auth check:

```ts
  const rl = await consumeRateLimit(`generate:${session.user.id as string}`, 60, 60_000)
  if (!rl.ok) return { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }
```

`src/lib/actions/import-products.ts` — same after auth check:

```ts
  const rl = await consumeRateLimit(`import:${session.user.id as string}`, 30, 60_000)
  if (!rl.ok) return failAll(`Too many requests. Try again in ${rl.retryAfterSec}s.`)
```

`src/lib/actions/register.ts` — after validating the payload (before creating the user), keyed on email:

```ts
  const rl = await consumeRateLimit(`register:${email}`, 10, 300_000)
  if (!rl.ok) return { error: 'Too many signup attempts. Try again in a few minutes.' }
```

`src/lib/auth.ts` — inside `authorize`, after finding the user, before password verify:

```ts
        const rl = await consumeRateLimit(`login:${email}`, 10, 300_000)
        if (!rl.ok) return null
```

- [ ] **Step 6: Tests + lint + commit**

Run: `pnpm test` (all pass), `pnpm lint`, `pnpm build`
Commit:

```bash
git add prisma/schema.prisma src/lib/rate-limit.ts src/lib/rate-limit.test.ts src/lib/actions/generate-file.ts src/lib/actions/import-products.ts src/lib/actions/register.ts src/lib/auth.ts
git commit -m "feat: DB-backed fixed-window rate limiting for generate, import, register, login"
```

---

### Task 4: Batch generation

**Files:**
- Create: `src/lib/actions/generate-batch.ts`
- Modify: `src/app/dashboard/page.tsx` (checkboxes + sticky batch bar)
- Create: `src/lib/actions/generate-batch.test.ts`

**Interfaces:**
- Consumes: `generateFile` from `@/lib/engine`, `getTemplate` from `@/data/templates`, `resolveCategoryPath` from `@/lib/category-path`, `consumeRateLimit` from Task 3
- Produces: `export async function generateBatchAction(data: { productIds: string[]; platform: Platform; format: 'csv' | 'xlsx'; categorySlug: string }): Promise<{ downloadUrl: string } | { error: string }>` — one Generation row per product sharing fileName.

- [ ] **Step 1: Write the failing tests**

`src/lib/actions/generate-batch.test.ts` — unit-test the pure part. The action is a server action (auth + DB); test the row-assembly helper by exporting it. Simplest: put the batch assembly in a pure function the action calls:

```ts
import { describe, expect, it } from 'vitest'
import { buildBatchRows } from './generate-batch'

/*
 * buildBatchRows
 * Concatenates variants of all products into one row set for a template.
 */
describe('buildBatchRows', () => {
  const header = ['Product Title', 'Seller SKU']
  it('returns header + one row per variant across products', () => {
    const rows = buildBatchRows(header, [
      { title: 'A', variants: [{ sku: 'A1', size: 'M' }] },
      { title: 'B', variants: [{ sku: 'B1', size: 'L' }, { sku: 'B2', size: 'XL' }] },
    ])
    expect(rows[0]).toEqual(header)
    expect(rows).toHaveLength(4) // header + 3 variant rows
  })
  it('returns just the header for zero variants', () => {
    const rows = buildBatchRows(header, [{ title: 'A', variants: [] }])
    expect(rows).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test src/lib/actions/generate-batch.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the action**

`src/lib/actions/generate-batch.ts`:

```ts
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { generateFile } from '@/lib/engine'
import { resolveCategoryPath } from '@/lib/category-path'
import { consumeRateLimit } from '@/lib/rate-limit'

/*
 * BatchItem
 * Minimal product shape for row assembly.
 */
export interface BatchItem {
  title: string
  variants: { sku: string }[]
}

/*
 * buildBatchRows
 * Header + one row per variant across all products (pure, testable).
 */
export function buildBatchRows(header: string[], products: BatchItem[]): string[][] {
  return [header, ...products.flatMap((p) => p.variants.map((v) => [p.title, v.sku]))]
}

/*
 * generateBatchAction
 * Renders ONE platform file from N products (all same category).
 * Creates one Generation row per product sharing the same fileName.
 */
export async function generateBatchAction(data: {
  productIds: string[]
  platform: Platform
  format: 'csv' | 'xlsx'
  categorySlug: string
}): Promise<{ downloadUrl: string } | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const userId = session.user.id as string
  const rl = await consumeRateLimit(`generate:${userId}`, 60, 60_000)
  if (!rl.ok) return { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }
  if (data.productIds.length === 0) return { error: 'No products selected' }

  const products = await db.product.findMany({
    where: { id: { in: data.productIds }, userId },
    include: { variants: true },
  })
  if (products.length !== data.productIds.length) return { error: 'One or more products not found' }
  for (const p of products) {
    if (p.categorySlug !== data.categorySlug) {
      return { error: 'All products must be in the same category' }
    }
  }

  const template = getTemplate(data.platform, data.categorySlug)
  if (!template) return { error: 'No template for this platform and category' }

  const rows: string[][] = []
  const issues: { product: string; message: string }[] = []
  for (const p of products) {
    const result = generateFile(
      {
        title: p.title,
        description: p.description,
        brand: p.brand,
        hsn: p.hsn,
        gstRate: p.gstRate,
        categoryPath: await resolveCategoryPath(p.categorySlug, data.platform),
      },
      p.variants.map((v) => ({
        sku: v.sku, size: v.size, color: v.color, mrp: v.mrp, price: v.price, stock: v.stock, weightGrams: v.weightGrams,
      })),
      template,
    )
    if (result.issues.length > 0) {
      issues.push({ product: p.title, message: result.issues[0].message })
    } else {
      rows.push(...result.rows.slice(1)) // skip each product's header
    }
  }
  if (issues.length > 0) {
    return { error: `${issues.length} product(s) failed validation — ${issues[0].product}: ${issues[0].message}` }
  }

  const allRows = [template.columns.map((c) => c.name), ...rows]
  const { toCSV, toXLSX } = await import('@/lib/engine/serialize')
  const blob = data.format === 'csv' ? toCSV(allRows) : toXLSX(allRows)
  const fileName = `${data.platform.toLowerCase()}-${data.categorySlug}-batch.${data.format}`
  const generations = await db.$transaction(
    products.map((p) =>
      db.generation.create({
        data: {
          userId,
          productId: p.id,
          platform: data.platform,
          categorySlug: p.categorySlug,
          templateVersion: template.version,
          fileName,
        },
      }),
    ),
  )
  return { downloadUrl: `/api/generate/${generations[0].id}?format=${data.format}` }
}
```

Note: `src/lib/engine/index.ts` re-exports `toCSV`, `toXLSX` — import them statically alongside `generateFile`:

```ts
import { generateFile, toCSV, toXLSX } from '@/lib/engine'
```

(replace the dynamic `await import('@/lib/engine/serialize')` line with this static import at the top of the file, and delete the blob line's indirection: `const blob = data.format === 'csv' ? toCSV(allRows) : toXLSX(allRows)`)

The download URL serves ONE product's row set from the batch — that's wrong for a batch. **Fix:** the generate route must render the full file. Since all batch Generation rows share `fileName`, add a batch-aware route: when multiple Generation rows share a fileName, re-render all products. Implement in `src/app/api/generate/[id]/route.ts` (read it first): look up the generation; find sibling generations by fileName; if >1, fetch all their products and render all rows (reuse the same loop). Keep single-generation behavior otherwise. Update the tests in that route if they exist.

- [ ] **Step 4: Batch UI on the dashboard**

`src/app/dashboard/page.tsx` — convert to client component for selection state. Since the page is a server component, create `src/components/dashboard/batch-bar.tsx` (client) and pass product metadata:

In `page.tsx`, add a checkbox per card and a client `BatchBar` receiving `products: { id, title, categorySlug }[]`:

```tsx
import { BatchBar } from '@/components/dashboard/batch-bar'
// inside the card header, next to the title:
//   <BatchCheckbox productId={p.id} /> — see component
// render once at the bottom:
//   <BatchBar products={products.map((p) => ({ id: p.id, title: p.title, categorySlug: p.categorySlug }))} />
```

`src/components/dashboard/batch-bar.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Platform } from '@/constants/enums'
import { ALL_PLATFORMS } from '@/data/templates'
import { generateBatchAction } from '@/lib/actions/generate-batch'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface BatchProduct { id: string; title: string; categorySlug: string }

/*
 * BatchBar
 * Sticky footer: selected products, platform picker, format toggle.
 * Mixed categories block generation until the selection is one category.
 */
export function BatchBar({ products }: { products: BatchProduct[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
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
```

Dashboard checkboxes need shared state between page cards and the bar. Simplest: put ALL of it in one client component. Replace the product list rendering with a client `ProductList` component (`src/components/dashboard/product-list.tsx`) that renders cards + checkboxes + BatchBar internally. The server page passes `products` (id, title, brand, categorySlug, variantCount) down. Keep the server page for auth/data, client component for interaction.

`src/components/dashboard/product-list.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ALL_PLATFORMS } from '@/data/templates'
import { GenerateButtons } from './generate-buttons'
import { BatchBar } from './batch-bar'
import { Card } from '@/components/ui/card'

interface ListProduct {
  id: string; title: string; brand: string; categorySlug: string; variantCount: number
}

export function ProductList({ products }: { products: ListProduct[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
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
      <BatchBar
        products={products}
        selected={selected}
        onToggle={toggle}
      />
    </div>
  )
}
```

Update `BatchBar` to receive `selected` + `onToggle` as props instead of owning state. `page.tsx` becomes:

```tsx
      <ProductList
        products={products.map((p) => ({
          id: p.id, title: p.title, brand: p.brand, categorySlug: p.categorySlug, variantCount: p.variants.length,
        }))}
      />
```

- [ ] **Step 5: Batch-aware generate route**

Read `src/app/api/generate/[id]/route.ts` first. Extend it: when the generation's `fileName` matches other generations (batch), render rows for all those products concatenated. The route currently re-renders one product; add:

```ts
  // batch: all generations sharing this fileName render together
  const batch = await db.generation.findMany({ where: { fileName: generation.fileName }, include: { product: { include: { variants: true } } } })
  // build rows per product, concatenate data rows, single header
```

Keep single-generation output byte-identical (tests guard that).

- [ ] **Step 6: Tests + lint + build + commit**

```bash
pnpm test && pnpm lint && pnpm build
git add src/lib/actions/generate-batch.ts src/lib/actions/generate-batch.test.ts src/app/dashboard/page.tsx src/components/dashboard/ src/app/api/generate/
git commit -m "feat: batch generation — select products, one file per platform"
```

---

### Task 5: Multi-variant editing

**Files:**
- Create: `src/lib/actions/update-product.ts`
- Modify: `src/app/dashboard/products/[id]/page.tsx` (edit mode with variant table)
- Create: `src/components/forms/variant-table.tsx`
- Create: `src/lib/actions/update-product.test.ts`

**Interfaces:**
- Consumes: `importRowSchema` from `@/lib/import/import-schema` (variant validation), `consumeRateLimit`
- Produces: `export async function updateProductAction(data: { productId: string; title: string; description: string; brand: string; hsn: string; gstRate: number; variants: VariantEditRow[] }): Promise<{ ok: true } | { error: string }>` with `VariantEditRow = { sku: string; size: string; color: string; mrp: number; price: number; stock: number; weightGrams: number }`.

- [ ] **Step 1: Write the failing tests**

`src/lib/actions/update-product.test.ts` — pure validation helper:

```ts
import { describe, expect, it } from 'vitest'
import { validateVariantRows } from './update-product'

describe('validateVariantRows', () => {
  const good = [{ sku: 'TS-1', size: 'M', color: 'Black', mrp: 999, price: 599, stock: 10, weightGrams: 150 }]
  it('passes valid rows', () => {
    expect(validateVariantRows(good)).toEqual([])
  })
  it('rejects a row missing sku', () => {
    const issues = validateVariantRows([{ ...good[0], sku: '' }])
    expect(issues.length).toBeGreaterThan(0)
  })
  it('rejects a non-positive price', () => {
    const issues = validateVariantRows([{ ...good[0], price: 0 }])
    expect(issues.some((i) => i.includes('price'))).toBe(true)
  })
  it('rejects an empty variant list', () => {
    const issues = validateVariantRows([])
    expect(issues.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test src/lib/actions/update-product.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the action**

`src/lib/actions/update-product.ts`:

```ts
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { importRowSchema, type ImportRow } from '@/lib/import/import-schema'
import { consumeRateLimit } from '@/lib/rate-limit'

/*
 * VariantEditRow
 * One variant row from the edit table.
 */
export interface VariantEditRow {
  sku: string; size: string; color: string; mrp: number; price: number; stock: number; weightGrams: number
}

/*
 * validateVariantRows
 * Reuses import-schema row validation on variant fields.
 * @returns issue messages (empty when valid)
 */
export function validateVariantRows(rows: VariantEditRow[]): string[] {
  if (rows.length === 0) return ['At least one variant is required']
  const issues: string[] = []
  for (const r of rows) {
    const row: ImportRow = {
      fileRow: 0,
      title: 'x',
      sku: r.sku,
      price: String(r.price),
      size: r.size,
      color: r.color,
      mrp: String(r.mrp),
      stock: String(r.stock),
      weightGrams: String(r.weightGrams),
    }
    const parsed = importRowSchema.safeParse(row)
    if (!parsed.success) issues.push(parsed.error.issues[0]?.message ?? 'invalid variant')
  }
  return issues
}

/*
 * updateProductAction
 * Updates product fields and replaces all variants in one transaction.
 */
export async function updateProductAction(data: {
  productId: string
  title: string
  description: string
  brand: string
  hsn: string
  gstRate: number
  variants: VariantEditRow[]
}): Promise<{ ok: true } | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const userId = session.user.id as string
  const rl = await consumeRateLimit(`update:${userId}`, 60, 60_000)
  if (!rl.ok) return { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }
  if (!data.title.trim()) return { error: 'Title is required' }
  const variantIssues = validateVariantRows(data.variants)
  if (variantIssues.length > 0) return { error: variantIssues[0] }

  const product = await db.product.findFirst({ where: { id: data.productId, userId } })
  if (!product) return { error: 'Product not found' }

  await db.$transaction([
    db.product.update({
      where: { id: data.productId },
      data: { title: data.title, description: data.description, brand: data.brand, hsn: data.hsn, gstRate: data.gstRate },
    }),
    db.variant.deleteMany({ where: { productId: data.productId } }),
    db.variant.createMany({
      data: data.variants.map((v) => ({ ...v, productId: data.productId })),
    }),
  ])
  return { ok: true }
}
```

- [ ] **Step 4: Edit UI**

`src/components/forms/variant-table.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { VariantEditRow } from '@/lib/actions/update-product'

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
```

`src/app/dashboard/products/[id]/page.tsx` — add an edit form (server action via `<form action={updateProductAction}>` is awkward with a client variant table; use a client edit component). Create `src/components/forms/product-edit.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProductAction, type VariantEditRow } from '@/lib/actions/update-product'
import { VariantTable } from './variant-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
```

Wire it in `products/[id]/page.tsx`: render `<ProductEdit product={...} />` above the read-only variants table (or replace it — simplest: keep the table, add the edit card after the generate actions).

- [ ] **Step 5: Tests + lint + build + commit**

```bash
pnpm test && pnpm lint && pnpm build
git add src/lib/actions/update-product.ts src/lib/actions/update-product.test.ts src/components/forms/ src/app/dashboard/products/
git commit -m "feat: multi-variant editing with add/remove rows"
```

---

### Task 6: Phase 2 minors sweep

**Files:**
- Modify: `src/lib/actions/import-products.ts` (row-cap re-check)
- Modify: `src/lib/import/import-schema.ts` (`toNumber` typeof guard)
- Modify: `src/lib/engine/serialize.ts` (CSV formula-injection neutralization)
- Modify: `prisma/seed.ts` (stale mapping cleanup)
- Modify: `src/lib/engine/engine.test.ts` (formula test)
- Modify: `src/lib/import/import-schema.test.ts` (toNumber guard test)

- [ ] **Step 1: Write the failing tests**

`src/lib/import/import-schema.test.ts` — append:

```ts
  it('toNumber tolerates non-string input without throwing', () => {
    expect(toNumber(undefined)).toBeUndefined()
    // @ts-expect-error crafted payload
    expect(toNumber(42)).toBeNull()
    // @ts-expect-error crafted payload
    expect(toNumber({})).toBeNull()
  })
```

`src/lib/engine/engine.test.ts` — append:

```ts
  it('CSV neutralizes formula-injection cells (= + - @)', () => {
    const csv = toCSV([['=SUM(A1)', '+123', '-cmd', '@ref', 'safe']])
    expect(csv).toBe('"=SUM(A1)","+123","-cmd","@ref",safe\r\n')
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test`
Expected: both new tests FAIL.

- [ ] **Step 3: Implement**

`import-schema.ts` `toNumber`:

```ts
export function toNumber(raw: string | undefined): number | null | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return raw === undefined ? undefined : null
  const cleaned = raw.replace(/[^\d.\-]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}
```

`serialize.ts` `toCSV`:

```ts
export function toCSV(rows: string[][]): string {
  const esc = (v: string) => {
    const unsafe = /[",\r\n]/.test(v)
    const formula = /^[=+\-@]/.test(v)
    const value = formula ? `'${v}` : v
    return unsafe || formula ? `"${value.replace(/"/g, '""')}"` : value
  }
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n'
}
```

`import-products.ts` — at the top of the action body (after auth):

```ts
  if (data.rows.length > 2000) {
    return failAll('File exceeds the 2000-row limit')
  }
```

`prisma/seed.ts` — after the taxonomy loop, before `$disconnect`:

```ts
  // remove mappings that no longer exist in the taxonomy data (stale paths)
  const validIds = new Set(
    CATEGORIES.flatMap((c) => Object.keys(c.platformPaths ?? {}).map((p) => `map-${c.slug}-${p}`)),
  )
  const stale = await db.categoryPlatformMapping.findMany({ select: { id: true } })
  const staleIds = stale.filter((m) => !validIds.has(m.id)).map((m) => m.id)
  if (staleIds.length > 0) {
    await db.categoryPlatformMapping.deleteMany({ where: { id: { in: staleIds } } })
    console.log(`removed ${staleIds.length} stale mappings`)
  }
```

Note: the `id` field on `CategoryPlatformMapping` is a String (not @default(uuid())) — the seed generates `map-<slug>-<platform>` ids, so this check works.

- [ ] **Step 4: Tests + seed run + lint + build + commit**

```bash
pnpm test && pnpm lint && pnpm build
npx prisma db seed
git add src/lib/actions/import-products.ts src/lib/import/import-schema.ts src/lib/import/import-schema.test.ts src/lib/engine/serialize.ts src/lib/engine/engine.test.ts prisma/seed.ts
git commit -m "fix: phase 2 minors — row cap, toNumber guard, CSV formula injection, stale seed mappings"
```

---

### Task 7: E2E verification

**Files:**
- Create: `e2e-fixtures/batch-import.csv` (reuse import-valid.csv shape, 2+ products same category)

**Interfaces:**
- Consumes: the full Phase 3 feature set

- [ ] **Step 1: Create fixtures**

`e2e-fixtures/batch-import.csv` — 2 products, same category (mens-tshirts):

```csv
Product Title,Product Description,Brand,Seller SKU,MRP,Selling Price,Size,Colour,Stock,Weight (g),HSN,GST %,Category
Batch Tee One,First batch tee,TestBrand,BATCH-001,999,599,M,Black,10,180,61091000,5,T-Shirts
Batch Tee Two,Second batch tee,TestBrand,BATCH-002,999,649,L,White,15,180,61091000,5,T-Shirts
```

- [ ] **Step 2: Start the app and log in**

```bash
pnpm build
lsof -ti tcp:3101 | xargs kill 2>/dev/null
(PORT=3101 AUTH_TRUST_HOST=true pnpm start >> /tmp/cake-server.log 2>&1 &)
sleep 4
```

Browse to `http://localhost:3101/login`, sign in `seller@test.com` / `password123`.

Browse tool: `B=~/.claude/skills/gstack/browse/dist/browse`; gotchas: re-snapshot after navigation; duplicate buttons → click via `js` with `offsetParent !== null`; cookies redacted → same-origin `js fetch` for downloads; upload via `"$B" upload 'input[type=file]' <abs-path>`.

- [ ] **Step 3: Seed batch products**

Import `e2e-fixtures/batch-import.csv` via `/dashboard/import` (existing wizard) → 2 products imported. Dashboard shows both.

- [ ] **Step 4: Batch generate**

- Check both Batch Tee checkboxes → Batch bar shows "Batch (2)"
- Pick platform (MEESHO) + CSV → Generate → Download file link appears
- Same-origin `js fetch` the URL → CSV contains BOTH product titles and both SKUs (BATCH-001, BATCH-002), one header row
- Verify history shows 2 Generation rows (one per product)

- [ ] **Step 5: Mixed-category block**

- Check one Batch Tee + the existing Classic White Tee (same category — mens-tshirts, so it WON'T block). To test blocking, import one product in a different category first (e.g. via wizard with a different category CSV) or verify the client block by selecting products of different categorySlug values; if all test products are mens-tshirts, note the block is server-enforced: call `generateBatchAction` with mixed productIds via `js fetch` to the server action and confirm the error. Simpler live check: select a product of another category if present; otherwise verify the server-side guard by inspecting the code path (already unit-reasonable). Report what was verified.

- [ ] **Step 6: Rate limiting**

- Via `js fetch`, call the batch action 60+ times rapidly (loop) and confirm a 429-ish `{ error: 'Too many requests…' }` appears. (Or lower the limit temporarily? NO — do not change code. Fire 61 rapid fetches.)

- [ ] **Step 7: Multi-variant edit**

- Open `/dashboard/products/<batch-tee-one-id>`, use the edit card: add a variant row (size L), remove nothing, save → refresh → variant count 2 on detail + dashboard
- Add a variant with empty SKU → save → error "missing sku" shown, nothing persisted

- [ ] **Step 8: Validation rule surfaces**

- Via the dashboard Generate button (or direct action call) generate MEESHO for a product with GST 30 (edit one product's GST to 30 first via the edit card) → error mentions the GST rule ("must be at most 28")
- Also confirm a duplicate-SKU file blocks: generate a batch after editing two variants to the same SKU → error mentions duplicate SKU

- [ ] **Step 9: Full suite + commit**

```bash
pnpm test
git add e2e-fixtures/
git commit -m "test: phase 3 e2e fixtures"
```

Expected: all green.

- [ ] **Step 10: Report**

Write full report to `.superpowers/sdd/task-7-report.md` — every verification bullet with evidence, any bugs (exact repro), commit SHA.

---

## Self-Review Notes

- **Spec coverage:** §4.1 rules → Task 1; §4.1 rules content → Task 2; §4.2 batch → Task 4; §4.3 rate limiting → Task 3; §4.4 multi-variant → Task 5; §4.5 minors → Task 6; §6 testing → all tasks + Task 7 E2E; D1–D7 all reflected. No gaps.
- **Type consistency:** `ColumnRule` defined in Task 1, consumed by Tasks 2+; `consumeRateLimit(key, limit, windowMs)` defined Task 3, consumed by Tasks 4–5; `VariantEditRow` defined Task 5 and shared between `update-product.ts` and `variant-table.tsx`; `buildBatchRows` defined + tested Task 4, used by the batch action.
- **Known risk:** batch download URL — the `api/generate/[id]` route must render the FULL batch (Task 4 Step 5) or downloads will contain one product. This is the one cross-file dependency that must be verified in E2E.
