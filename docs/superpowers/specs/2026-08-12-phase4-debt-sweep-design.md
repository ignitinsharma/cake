# Phase 4 — Debt sweep + gaps (design)

Date: 2026-08-12 · Branch: `feature/phase4-debt-sweep` · Base: main `13be6bb`

## 1. Problem

Phases 1–3 shipped the full PRD scope. Final reviews recorded a set of gaps and debts that were accepted as post-merge trackables. This phase closes them in one small sweep. No new product features.

## 2. Items (from PRD gaps + recorded review minors)

| # | Item | Source | Where |
|---|---|---|---|
| A1 | Product page generates only FLIPKART/MYNTRA/AMAZON — hardcoded 3-platform list | PRD Phase 2 (5 more platforms) missed this page; found in Phase 3 E2E | `src/app/dashboard/products/[id]/page.tsx:35` |
| A2 | No profile/settings page — company data set at signup, never editable; platform seller IDs "deferred to profile settings" per PRD §7 | PRD Phase 1 | new route + action + `Company` column |
| B4 | Legacy 4-digit-HSN / 3XL products error at generation until edited | Phase 3 final review | **decision: leave + document** (no auto-backfill; naive padEnd writes wrong HSNs; edit screen already recovers) |
| B5 | Batch has no file-wide SKU uniqueness — two products sharing a SKU pass batch validation; design doc §4.1 claims "unique runs once per file" | Phase 3 final review minor | `generateBatchAction` + pure helper |
| B6 | Dead exports `checkRateLimit` / `RateLimitError` | Phase 3 final review | `src/lib/rate-limit.ts` |
| B7 | Docs drift: spec §4.1 vs batch reality; amazon `url: true` never shipped | Phase 3 final review | design doc |
| B8 | Flipkart size enum lacks 3XL while existing data has it | Phase 3 final review | `src/data/templates/flipkart-t-shirt.ts` |
| C9 | Batch bar shows "Same category required" even when only the platform is unset | Phase 3 final review | `batch-bar.tsx` |
| C10 | Batch download link goes stale after platform/format change | Phase 3 final review | `batch-bar.tsx` |
| C11 | History caveat renders when the table is empty | Phase 3 final review | `src/app/dashboard/history/page.tsx` |
| C12 | `toNumber(null)` semantics + batch dup-SKU row numbers are per-product | Phase 3 final review | `import-schema.ts` (comment), superseded by B5 |

## 3. Decisions (user-confirmed)

- **D4-1:** Platform seller IDs stored as a single `platformSellerIds Json?` column on `Company` (`{ FLIPKART: "...", ... }`). Nothing consumes them today (zero template columns reference seller IDs); JSON beats 8 nullable columns.
- **D4-2:** Legacy 4-digit HSN products: **leave as-is, document in README**. No auto-backfill.
- **D4-3:** No `url: true` on amazon image columns — the `images` source is hardcoded `''` (products have no image storage), so the rule can never fire; blank-guard (Phase 3) already prevents the trap. Document in the spec instead.

## 4. Design

### 4.1 Product page platforms (A1)

`src/app/dashboard/products/[id]/page.tsx` passes `platforms={[FLIPKART, MYNTRA, AMAZON]}`. Replace with `ALL_PLATFORMS` from `@/data/templates` — the same constant the dashboard cards (`product-list.tsx:51`) and batch bar use. One-line change, no logic.

### 4.2 Settings page (A2)

- **Schema:** `Company` += `platformSellerIds Json?` (Prisma `Json` type). `npx prisma generate && npx prisma db push` (repo pattern, no migrations).
- **Route:** `src/app/dashboard/settings/page.tsx` — server component: `auth()` → load `company` (user-scoped) → render `<SettingsForm>`.
- **Form:** `src/components/forms/settings-form.tsx` — client component, pattern from `product-edit.tsx`: business name, GSTIN, brand, return address, warehouse PIN, one seller-ID input per platform (8).
- **Action:** `src/lib/actions/update-company.ts` — `'use server'` file exporting ONLY the authed wrapper (`updateCompanyAction`), core `updateCompanyFields(data, prisma = db)` in a plain module (`src/lib/validations/update-company.ts`) per the Phase 3 Task 5 security fix pattern (async exports from `'use server'` files are reachable endpoints — never expose an unauthed core there).
  - Core: validate (title-case the 8 seller IDs as `{platform, id}` pairs or a flat record; zod 4 `{ error }` shape), `company.upsert` keyed by userId, `ok: true`.
- **Nav:** add "Settings" link to the dashboard header (`src/components/header.tsx` or wherever nav lives).
- **Tests:** ownership, upsert on missing company, invalid payload → error, seller IDs round-trip.

### 4.3 Batch file-wide SKU uniqueness (B5)

- Pure helper in `src/lib/engine/build-rows.ts`: `findDuplicateSkus(batch: BatchProduct[]): { sku, productTitle, row } | null` — one `seen` map across all products' variants in order; first duplicate wins; `row` = 1-based file row (header-offset).
- `generateBatchAction`: after per-product `validateForTemplate`, call `findDuplicateSkus`; on hit return `{ error: "duplicate SKU in file: {sku} ({productTitle}, row {row})" }` with zero Generation rows created (gate sits before the transaction, like the existing validation gate).
- TDD: no dup → null; dup within one product (already caught per-product — helper still reports it); dup across two products; three variants incl. interleaved dups; empty batch → null.

### 4.4 Cosmetic + data fixes (B4 doc, B8, C9–C12)

- B8: flipkart size enum `['XS','S','M','L','XL','XXL','3XL']` — Myntra already has 3XL; flipkart data has 3XL products today. Test: flipkart 3XL variant passes.
- C9: batch bar computes `blocked` from two separate conditions: no platform chosen → "Choose a platform"; mixed categories → "Same category required — selected: …". Distinct messages.
- C10: `downloadUrl` state resets when platform or format changes.
- C11: history caveat inside the `rows.length > 0` conditional.
- C12: comment on `toNumber` documenting `null` → `null` (invalid) vs `''` → `undefined` (missing) intent.
- B4: README note — products with legacy 4-digit HSN or non-listed sizes show clear generation errors; fix in-app via edit.

### 4.5 Dead code + docs (B6, B7)

- Grep consumers of `checkRateLimit`/`RateLimitError`; delete both (plus the unused imports in rate-limit.ts).
- Design doc §4.1: "unique" wording corrected to "unique per product within one file; batch enforces file-wide uniqueness via `findDuplicateSkus`". Note the amazon `url: true` decision (D4-3).

## 5. Testing

- Unit (TDD): `findDuplicateSkus` matrix; `updateCompanyFields` ownership/upsert/validation; flipkart 3XL; existing suite stays green (78 → ~82+).
- E2E (Task 6, live server on 3101): product page shows 8 generate buttons + generates; settings save + reload round-trip (seller ID persists); batch with two same-SKU products blocked with message; flipkart 3XL product generates.

## 6. Out of scope

- PRD Phase 4 features (images/CDN, relisting, price/inventory sync, agency mode) — separate PRD later.
- Product delete, settings for platform category paths, any template deepening.
