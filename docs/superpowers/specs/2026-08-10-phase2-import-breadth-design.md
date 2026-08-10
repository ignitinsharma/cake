# Design: Phase 2 — Import + Breadth

**Project:** Cake (Marketplace Listing Generator)
**Date:** 2026-08-10
**Status:** Approved (design)
**Parent:** docs/superpowers/specs/2026-08-01-marketplace-listing-generator-prd.md (§7 Phase 2)

## 1. Problem Statement

Phase 1 proved the core loop: enter one product → generate ready-to-upload files for Flipkart, Myntra, Amazon. Sellers with an existing catalog (the PRD's "D2C brand owner" persona) still must re-type every product into the form — the same manual re-entry the product exists to eliminate. And platform coverage stops at 3 of the 8 target marketplaces.

## 2. Goals & Non-Goals

### Goals
- Import an existing catalog file (CSV or XLSX) into Cake in one guided flow: upload → auto-map headers → confirm → preview → load
- Cover 8 platforms total: add Meesho, Snapdeal, Nykaa, Ajio, FirstCry (shallow-but-valid t-shirt templates)
- Expand taxonomy from 3 to ~50 categories with platform path mappings where publicly known

### Non-Goals (Phase 2)
- Template versioning, batch generation, full per-platform validation enums (Phase 3)
- Multi-variant products (grouping rows by shared title/brand into one product with N variants)
- Importing images / auto-uploading to marketplaces
- Any Postgres migration — SQLite + Prisma stays as-is

## 3. Decisions (confirmed with user)

| # | Question | Decision |
|---|---|---|
| D1 | Phase 2 scope | All 3 workstreams: import wizard + 5 platforms + 50-category taxonomy |
| D2 | Row semantics | **Each row = one product + one variant**; import bulk-creates N products in one transaction |
| D3 | Import formats | **CSV + XLSX** (papaparse for CSV; SheetJS `xlsx` already installed, reads client-side) |
| D4 | Bad rows policy | **Skip bad rows + show error report** after load — good rows import, invalid ones are listed with per-row reasons |
| D5 | Category assignment | **One category per file**, fuzzy-suggested from the file's category column, confirmed by user in the wizard |
| D6 | Template breadth | New platforms get **t-shirt templates only** (same mens/womens/kids slugs); taxonomy expands to ~50 categories |

## 4. Architecture

```
Next.js (App Router, TypeScript)
├── /app/dashboard/import       — 4-step wizard (client components)
├── /lib/import                 — parse + auto-map + row validation (pure, unit-testable)
│   ├── parse.ts                — CSV (papaparse) / XLSX (xlsx) → { headers, rows }
│   ├── aliases.ts              — standard-field → alias list (fuzzy match source)
│   ├── auto-map.ts             — header fuzzy match → standard field
│   ├── import-schema.ts        — per-row zod validation (skip-bad-rows policy)
│   └── index.ts                — orchestrator for the load action
├── /data/templates/{meesho,snapdeal,nykaa,ajio,firstcry}-t-shirt.ts  — new templates
├── /data/taxonomy/categories.ts — ~50-category tree + platform mappings (seed)
└── /lib/actions/import-products.ts — server action: validate + bulk create in transaction
```

**Choice rationale (client-side wizard, Approach A):** file never leaves the browser until the user confirms the mapping; preview is instant; no upload plumbing, temp storage, or multi-step server state. Row cap 2000 keeps the browser honest. papaparse is ~6KB; SheetJS is already a dependency (used for XLSX output in Phase 1).

## 5. Import Wizard Flow

Four steps, client-side state, one server round-trip at the end.

### Step 1 — Upload
- Drag-drop or pick file: `.csv`, `.xlsx`. Cap: 2000 data rows (reject beyond with message).
- Parse client-side: CSV via papaparse (header: true, skip empty lines); XLSX via `xlsx` (first sheet, header: true).
- Parse errors (malformed CSV, empty file, no header row) shown inline; user can pick another file.

### Step 2 — Auto-guess mapping
- Each source header is fuzzy-matched against standard fields using the alias table (§6.1).
- Every header gets a dropdown: one entry per standard field + "Not mapped".
- Auto-guess fills the dropdowns; user confirms/overrides.
- Required-for-import fields (title, sku, price, size) must be mapped — Load is disabled with a hint until they are.

### Step 3 — Category
- If the source has a category-ish column (matched to the `category` pseudo-field), its first non-empty value is fuzzy-matched against the taxonomy; otherwise empty.
- Tree picker over ~50 categories; selected category is applied to the whole file (D5).
- The category's default HSN/GST (taxonomy defaults) backfill rows missing those values.

### Step 4 — Preview + load
- Table of first 20 rows with per-row validity flags (valid / error reason), row count summary.
- **Load** → `importProductsAction` (server):
  1. Re-validates every row with `import-schema` (zod) + category defaults applied
  2. `db.$transaction`: create Product + one Variant per valid row
  3. Returns `{ created: number, errors: [{ row, reason }] }`
- Success screen: "Imported N products" + error report table (D4). Errors are skipped, never block good rows.
- Redirect to dashboard after dismiss.

## 6. Data Model

No schema changes. Product + Variant (Phase 1) already fit row = product+variant.

### 6.1 Standard field aliases (auto-map source)

| Standard field | Aliases (fuzzy match, case/space-insensitive) |
|---|---|
| `title` | title, product title, product name, item title, name |
| `description` | description, product description, long description, details |
| `brand` | brand, brand name, brand_name |
| `sku` | sku, seller sku, style code, part number, item code, product code |
| `mrp` | mrp, list price, maximum retail price, mrp price |
| `price` | selling price, price, sale price, offer price, standard price |
| `size` | size, size name, size_name |
| `color` | color, colour, color name, colour name |
| `stock` | stock, quantity, available quantity, stock quantity, qty |
| `weightGrams` | weight, weight (g), item weight, weight in grams, gross weight |
| `hsn` | hsn, hsn code, hsn_code |
| `gstRate` | gst %, gst rate, tax code, tax %, igst |
| `category` | category, product category, category path, category_name |

`category` is a pseudo-field: it never maps to a product column; it only drives the Step 3 suggestion (D5).

Matching: normalize (lowercase, strip spaces/underscores/parens) then exact alias match, else token-overlap score (max shared tokens / max tokens); threshold ≥ 0.5 to auto-map, else "Not mapped". Deterministic, pure, unit-tested.

### 6.2 Per-row validation (import-schema)

- Required: `title` (non-empty), `sku` (non-empty), `price` (> 0), `size` (non-empty)
- Coerced numbers: `mrp`, `price`, `stock`, `weightGrams` (accept "1,299" → 1299, "499.00" → 499); unparseable → row error
- `gstRate`: strip non-digit/dot chars ("GST18" → 18) — same parse fix as Phase 1 create-product
- `hsn`: optional; backfilled from category default; `gstRate` backfilled from category default
- Row error reasons: exact strings — "missing title", "missing sku", "invalid price", "invalid number: <field>", "missing size"

## 7. Platform Breadth — 5 New Templates

- New files in `src/data/templates/` following the Phase 1 registry pattern exactly (TemplateColumn[] + source field names; engine stays generic — no adapter code)
- Research each platform's public seller upload template (best-effort, shallow-but-valid): ~15–25 columns, the 13 Phase 1 columns where present (Category, Brand, Title, Description, MRP, Selling Price, SKU, Size, Color, Stock, Weight, HSN, Tax), omitting genuinely-unknown columns rather than inventing them
- Registered in `src/data/templates/index.ts` via the existing flatMap over 5 platforms × 3 t-shirt slugs (mens/womens/kids) — all 15 combos
- Risk note (D6): Nykaa/Ajio/FirstCry public template docs may be sparse or behind seller-portal login; templates are best-effort data, not guarantees — same stance as Phase 1's ponytail comment on template depth

## 8. Taxonomy — ~50 Categories

- New `src/data/taxonomy/categories.ts` (typed tree): ~50 categories, apparel-led (T-Shirts, Shirts, Kurtas, Jeans, Sarees, Dresses, Kids, Footwear, etc.) — the taxonomy replaces the hardcoded seed; `prisma/seed.ts` imports it
- Each category: slug, name, parent, defaultHsn, defaultGstRate, `platformPaths: { platform: path }` for paths known from public docs
- CategoryPlatformMapping seed: all known mappings; categories without a documented path for a platform are simply absent (generation for that combo shows a clear error instead of a wrong path — existing behavior)
- The 3 existing t-shirt categories keep their Phase 1 mappings exactly (regression guard: seed test asserts count ≥ 3)

## 9. UI

- New `/dashboard/import` page + wizard components under `src/components/import/` — follows DESIGN.md amber system, reuses Card/Button/Input/Select components; step indicator + Back/Next buttons
- No new UI deps: tree picker is a flat list grouped by parent (lazy: ~50 items, no virtualized tree widget)
- Import success/error report rendered from the action's return value (no toasts for multi-row results)

## 10. Error Handling

| Scenario | Behavior |
|---|---|
| Unparseable file / empty / no headers | Step 1 inline error, stay on step |
| Header matches nothing | Dropdown stays "Not mapped"; row values ignored for that field |
| Required fields unmapped | Load disabled with hint listing them |
| Row fails validation | Skipped; listed in post-load error report with reason + original row number |
| Category has no platform path at generation | Existing generation error message (no change) |
| >2000 rows | Reject at upload with count message |

## 11. Testing

- **Unit — aliases/auto-map:** exact match, token-overlap match, normalization ("GST %" vs "gst%"), no-match → "Not mapped" (extend existing vitest suite)
- **Unit — import-schema:** valid row, missing title/sku/size, invalid price, "1,299" coercion, "GST18" → 18, category-default backfill
- **Unit — parse:** CSV fixture with quoted commas; XLSX fixture (minimal workbook built in test via xlsx)
- **Template validation:** existing `validate-template` test extends over all 8 platforms × 3 slugs (15 new)
- **Engine self-check:** one render per new platform → valid file (mirrors Phase 1)
- **Seed guard:** taxonomy seed test — ≥ 50 categories, 3 Phase 1 mappings intact, every platform slug in every t-shirt template
- **E2E (browser, :3101):** upload fixture CSV → auto-map visible → confirm → Load → dashboard lists imported products → generate one → download; bad-rows fixture → error report shown

## 12. Risks

| Risk | Mitigation |
|---|---|
| 5 new platform template quality varies | Structured as data; deepen later without code changes (Phase 1 stance) |
| Public docs for Nykaa/Ajio/FirstCry sparse | Omit unknown columns; generation errors surface gaps honestly |
| Large imports freeze the tab | 2000-row cap; parse is synchronous but bounded; preview shows 20 rows only |
| Fuzzy match mis-maps headers | Mapping confirmation is a mandatory step; only ≥0.5 threshold auto-guesses |
