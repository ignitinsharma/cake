# Design: Phase 3 — Hardening

**Parent:** docs/superpowers/specs/2026-08-01-marketplace-listing-generator-prd.md (§7 Phase 3)

## 1. Problem Statement

Phases 1–2 shipped the core loop (3 platforms) and breadth (8 platforms, CSV/XLSX import, 54-category taxonomy). What's missing before sellers can trust the files for real uploads:

- **Validation is shallow** — `validate.ts` only checks required columns are non-blank. No format/enum/URL checks, no duplicate-SKU detection. Shallow templates → upload rejections is the PRD's top risk.
- **One file per product** — sellers with 100 products must click Generate 100×8 times. Batch generation (select N products → one upload file) is the PRD's Phase 3 item.
- **No abuse protection** — no rate limiting anywhere (deferred from Phase 1).
- **Multi-variant editing** — import supports row=variant, but the edit screen is single-variant (deferred from Phase 1).
- **Phase 2 minors** — 4 small hardening items flagged in the Phase 2 final review.

## 2. Goals & Non-Goals

### Goals
- Full per-platform validation as **data** (rules on template columns), generic engine
- Template versioning polish: version shown at generate time; documented re-render caveat
- Batch generation: select products → one file per platform
- DB-backed rate limiting (no new dependencies)
- Multi-variant editing on the product edit screen
- Phase 2 minors sweep (4 items)

### Non-Goals (Phase 3)
- File storage / true template pinning (re-render caveat stays; PRD Phase 4)
- Upstash (rate-limit lib is swappable behind one file)
- DB-level SKU uniqueness (file-level only; seller decision)
- Image hosting/CDN, relisting, price sync, agency mode (PRD Phase 4)

## 3. Decisions (confirmed with user)

| # | Decision | Choice |
|---|---|---|
| D1 | Phase 3 scope | All PRD + deferred: validation, versioning polish, batch, rate limiting, multi-variant, minors |
| D2 | Validation architecture | Rules-as-data in templates (extend `TemplateColumn` with `rules`); generic rule engine |
| D3 | Batch shape | Select products + one platform → one file (variants of all products = rows) |
| D4 | Batch & categories | Same-category only; mixed selection blocks with conflict message until filtered to one |
| D5 | Rate limiting | DB-backed fixed-window counter (`RateLimit` table); Upstash swappable later |
| D6 | Multi-variant | Variant table on edit screen (add/remove rows); new-product flow unchanged |
| D7 | Merge style for PRs #1/#2 | Merge commits (preserve per-task review trail) |

## 4. Architecture

No engine redesign — extend what exists:

```
src/lib/templates/types.ts   — TemplateColumn gains rules?: ColumnRule
src/lib/engine/validate.ts   — rule engine (per-column + file-level SKU dup pass)
src/data/templates/*.ts      — each platform template gains best-effort rules
src/lib/actions/generate-batch.ts — batch generation action
src/lib/rate-limit.ts        — fixed-window counter lib (one file, swappable)
prisma/schema.prisma         — RateLimit model (+ prisma generate)
src/components/forms/variant-table.tsx — variant rows editor (edit screen)
src/lib/actions/update-product.ts     — update product + replace variants
```

### 4.1 Rule model

```ts
export interface ColumnRule {
  enum?: string[]    // allowed values (platform size lists, etc.)
  regex?: string     // format check (HSN 8-digit, etc.)
  min?: number       // numeric floor (price > 0, GST 0)
  max?: number       // numeric ceiling (GST 28)
  url?: boolean      // image URL format check
  unique?: boolean   // SKU uniqueness within the generated file
}
```

Rules evaluate per (column, variant); `unique` is enforced per product within one generated file (each variant's SKU must be unique within its product's variants — every platform template puts `unique: true` on its SKU column). Batch generation enforces file-wide uniqueness across all products' variants via `findDuplicateSkus` (see the Phase 4 debt-sweep design: §B5, 2026-08-12). Issues keep the existing `{ column, message }` shape → wizard/action error paths unchanged.

Shared defaults applied to every template (data, in each template file): price > 0, GST 0–28, HSN 8-digit regex (`^\d{8}$`). Per-platform enums (size lists) added where public docs support them; omitted where unknown (Phase 2 D6 stance — never invent).

**Decision note (D4-3):** the `url` rule (`url?: boolean`) is intentionally not shipped. The amazon template's image column (`main_image_url`) sources from `images`, which is hardcoded `''` in `validate.ts` (products have no image storage), so the rule could never fire; the blank-guard in `validate.ts` already rejects empty source values, preventing future template authors from tripping on it unnoticed. Rule stays in the `ColumnRule` type as the intended escape hatch.

### 4.2 Batch generation flow

1. Dashboard: checkbox per product card; sticky bar shows count + platform select + format toggle (CSV/XLSX)
2. Selection mixes categories → bar shows "Same category required" + lists the categories; blocked until filtered to one
3. `generateBatchAction(productIds, platform, format, categorySlug)`:
   - Verify all products belong to `categorySlug` and to the user
   - `getTemplate(platform, categorySlug)`; missing → error
   - Concatenate all products' variants; `generateFile` once (validation issues from ANY row block the whole file — matches single-product behavior)
   - One `Generation` row per product sharing the same `fileName` (no schema change; download keyed by generation id)
4. Success → download link on the bar (first generation id)

### 4.3 Rate limiting

`RateLimit` table: `key String @id` (e.g. `generate:<userId>`), `windowStart DateTime`, `count Int`.

Fixed-window lib: `checkRateLimit(key, limit, windowMs)` → increments, returns remaining or throws `RateLimitError`. Applied in: `generateFileAction`, `generateBatchAction`, `importProductsAction`, `registerAction`, login. Limits: 60 file generations/min/user, 10 auth attempts/5min/IP-ish (keyed on email+ip fallback — simplest: key on email for register, userId for actions). Returns `{ error: 'Too many requests. Try again in a minute.' }`.

### 4.4 Multi-variant editing

`products/[id]` edit screen gains a variant table (rows: sku, size, color, mrp, price, stock, weightGrams) with add/remove buttons. `updateProductAction(productId, data, variants[])`:
- Validates each variant with the import-schema row rules (reuse!)
- Replaces variants in a `$transaction` (delete many + create many)
- Product-level fields (title, description, brand, hsn, gstRate) update alongside

### 4.5 Phase 2 minors sweep

1. `import-products.ts`: server-side `rows.length > MAX_IMPORT_ROWS` re-check
2. `import-schema.ts:29` `toNumber`: typeof guard (`typeof raw === 'string'`)
3. `serialize.ts`: CSV formula-injection neutralization — prefix cells starting with `= + - @` with a leading quote (OWASP CSV injection)
4. Seed: delete `CategoryPlatformMapping` rows whose (categorySlug, platform) pair is absent from the taxonomy data (fixes stale womens/kids paths)

## 5. Error Handling

- Validation issues: existing `issues[0].message` rejection path for single; batch rejects with first issue + count
- Rate limit: friendly `{ error }` like all other actions
- Mixed-category batch: client-side block + server-side re-check (trust boundary)
- Update action: import-schema messages reused

## 6. Testing

- **Rule engine unit tests:** one per rule type (enum pass/fail, regex, min/max, url, unique dup), bad-fixture rows
- **Per-template test:** every template's rules pass for the sample product (extends engine self-check)
- **Rate limit:** window reset, limit hit, key separation
- **Batch:** mixed-category rejection, multi-product file rows, Generation rows count
- **Update action:** variant add/remove/validate, transaction atomicity
- **E2E (live on 3101):** batch-generate 2 products → one file both rows; mixed-category block; rate-limit hit; variant add/remove persists; GST 35 → validation error surfaces

## 7. Risks

| Risk | Mitigation |
|---|---|
| Enum rules too strict for real seller data | Rules are data; omit unknown enums (D6 stance); clear messages |
| Batch file rejected for mixed headers | Same-category enforcement (D4) + server re-check |
| Fixed-window limiter crude | Simple, predictable; swappable for Upstash behind one lib |
| Multi-variant edit corrupts variants | Transaction replace + import-schema validation reuse |
