# Phase 4 — Debt Sweep + Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the recorded post-merge gaps and debts from Phases 1–3: product page 8-platform generation (A1), settings/profile page with editable company + platform seller IDs (A2), batch file-wide SKU uniqueness (B5), flipkart 3XL enum (B8), cosmetic minors (C9–C12), dead exports + design-doc drift (B6, B7). Explicitly NOT in scope: legacy 4-digit HSN backfill (documented, D4-2) and any PRD Phase 4 feature.

**Architecture:** Small, surgical — one constant swap, one new route+action+JSON column, one pure helper + gate, one enum edit, three one-line UI fixes, two deletions, one doc edit. No engine redesign.

**Tech Stack:** Next.js 16 (App Router, server actions), Prisma 7 + better-sqlite3 (`prisma-client` generator → `src/generated/prisma`, driver adapter), zod 4, vitest, Tailwind v4 + shadcn Base UI (amber theme, DESIGN.md tokens).

## Global Constraints

- **Cake runs on 3101** (3000 is Hiretivo). Server start: `(PORT=3101 AUTH_TRUST_HOST=true pnpm start >> /tmp/cake-server.log 2>&1 &)`; kill: `lsof -ti tcp:3101 | xargs kill`. After source changes, `pnpm build` + restart before E2E.
- Test user: `seller@test.com` / `password123`.
- Prisma 7: after schema changes run `npx prisma generate` + `npx prisma db push`. `import { db } from '@/lib/db'`.
- zod 4 error syntax: `{ error: 'msg' }`.
- **Security pattern (Phase 3 Task 5 lesson):** a `'use server'` file must export ONLY authed async functions. Testable cores live in plain modules (`src/lib/validations/`), with `prisma` as a defaulted param (pattern: `updateProductFields`).
- DESIGN.md theme tokens + shadcn Base UI only.
- Commits on branch `feature/phase4-debt-sweep` (off main `13be6bb`). Per-task commits, TDD (test first, verify fail, implement, verify pass).
- Tests: `pnpm test` (currently 78). Lint: `pnpm lint`. Build: `pnpm build`.
- No new dependencies.

---

### Task 1: Product page generates for all 8 platforms

**Files:**
- Modify: `src/app/dashboard/products/[id]/page.tsx` (one line)

**Interfaces:**
- No new exports.

- [ ] **Step 1: Confirm the bug**

`page.tsx:35` currently passes `platforms={[Platform.FLIPKART, Platform.MYNTRA, Platform.AMAZON]}` — a Phase 1 leftover. The dashboard cards use `ALL_PLATFORMS` from `@/data/templates` (product-list.tsx:51).

- [ ] **Step 2: Fix**

Replace the hardcoded array with `ALL_PLATFORMS` imported from `@/data/templates`. Remove the now-unused `Platform` import from the page if it becomes dead.

- [ ] **Step 3: Verify**

`pnpm test` (78 green), `pnpm lint`, `pnpm build`. No new test needed — the constant is already used elsewhere; behavior is a props swap. Self-review: confirm no other page still hardcodes a 3-platform list (`grep -rn "FLIPKART, Platform.MYNTRA" src/app`).

- [ ] **Step 4: Commit**

Message: `fix: generate buttons for all 8 platforms on product page`

- [ ] **Step 5: Report**

Write `task-1-report.md` to `.superpowers/sdd/`: what changed, verification output, any dead-import removal.

---

### Task 2: Settings page — editable company + platform seller IDs

**Files:**
- Modify: `prisma/schema.prisma` (`Company` gains `platformSellerIds Json?`)
- Create: `src/lib/validations/update-company.ts` (core, plain module)
- Create: `src/lib/actions/update-company.ts` (`'use server'`, ONLY authed wrapper)
- Create: `src/app/dashboard/settings/page.tsx` (server component)
- Create: `src/components/forms/settings-form.tsx` (client form)
- Modify: header nav (`src/components/header.tsx` or wherever the dashboard nav lives — find it) — add "Settings" link
- Create: `src/lib/actions/update-company.test.ts`

**Interfaces:**
- `updateCompanyAction(data: { businessName; gstin; brandName; returnAddress?; warehousePin?; platformSellerIds: Record<string, string> })` → `{ ok: true } | { error: string }`
- Core `updateCompanyFields(data, prisma = db)` — same shape, `userId` injected by the wrapper from the session.

- [ ] **Step 1: Write failing tests** (`update-company.test.ts`, in-memory client per Phase 3 Task 3 pattern)
  - upsert creates the company row when none exists (ownership: `userId` from session)
  - updates existing company, preserves other fields
  - `platformSellerIds` round-trips (`{ FLIPKART: 'abc', MEESHO: 'xyz' }` → stored → returned)
  - empty businessName → `{ error: 'Business name is required' }`
  - verify fail → implement → verify pass (TDD)

- [ ] **Step 2: Schema**

`platformSellerIds Json?` on `Company`. `npx prisma generate && npx prisma db push`.

- [ ] **Step 3: Core + action**

Core in `src/lib/validations/update-company.ts`: validate required fields, `company.upsert({ where: { userId }, create: { userId, ... }, update: { ... } })`. Action file: `auth()` → reject unauth → `consumeRateLimit('update:${userId}', 60, 60_000)` (same limit family as product update) → call core. No `Platform`-type gymnastics: seller IDs keyed by platform name string.

- [ ] **Step 4: Route + form + nav**

Settings page: `auth()` guard (redirect to `/login` if no session), load `db.company.findUnique({ where: { userId } })`, render `<SettingsForm initial={company} />`. Form: pattern of `product-edit.tsx` — text inputs for the 5 company fields + one input per platform from `ALL_PLATFORMS` (label `{platform} Seller ID`), Save button calling `updateCompanyAction`, `{ error }` surface. Nav link "Settings" beside Products/History/Import.

- [ ] **Step 5: Verify**

`pnpm test` (78 + new), `pnpm lint`, `pnpm build`. Self-review: the 'use server' file exports ONLY `updateCompanyAction`; grep confirms no unauthed export.

- [ ] **Step 6: Commit**

Message: `feat: settings page with editable company and platform seller IDs`

- [ ] **Step 7: Report**

`task-2-report.md`: files, test counts, deviations.

---

### Task 3: Batch file-wide SKU uniqueness

**Files:**
- Modify: `src/lib/engine/build-rows.ts` (add `findDuplicateSkus`)
- Modify: `src/lib/actions/generate-batch.ts` (gate)
- Modify: `src/lib/actions/generate-batch.test.ts` (new tests)

**Interfaces:**
- `export function findDuplicateSkus(batch: BatchProduct[]): { sku: string; productTitle: string; row: number } | null` — one `seen` Map across ALL variants in file order; `row` is 1-based file row (header = row 1, first data row = row 2 — match the per-product duplicate message convention `rows {n} and {m}`).

- [ ] **Step 1: Write failing tests** (in `generate-batch.test.ts`, TDD)
  - no duplicates across products → null
  - same SKU in two products → hit, names both product titles and correct file rows
  - interleaved: A(prod1), B(prod2), A(prod3) → reports prod1 row vs prod3 row (first occurrence pair)
  - empty batch → null
  - SKU duplicated WITHIN one product → also caught (helper reports it; per-product validate may already have blocked it, but the helper must not crash)
  - verify fail → implement → verify pass

- [ ] **Step 2: Implement + gate**

Helper in `build-rows.ts` (pure, no imports from server-action land). In `generateBatchAction`, after the per-product validation loop and BEFORE the `$transaction`, run `findDuplicateSkus(batch)`; on hit return `{ error: 'duplicate SKU in file: {sku} ({productTitle}, row {row})' }` — zero Generation rows created (gate before transaction, same position as the existing validation gate).

- [ ] **Step 3: Verify**

`pnpm test`, `pnpm lint`, `pnpm build`. Self-review: existing batch tests still pass; the dup message supersedes the per-product "rows 1 and 2" wording for cross-product cases.

- [ ] **Step 4: Commit**

Message: `feat: block batch generation on file-wide duplicate SKUs`

- [ ] **Step 5: Report**

`task-3-report.md`.

---

### Task 4: Cosmetic + data fixes

**Files:**
- Modify: `src/data/templates/flipkart-t-shirt.ts` (size enum + `3XL`)
- Modify: `src/components/dashboard/batch-bar.tsx` (C9: distinct blocked messages; C10: clear downloadUrl on platform/format change)
- Modify: `src/app/dashboard/history/page.tsx` (C11: caveat inside rows.length check)
- Modify: `src/lib/import/import-schema.ts` (C12: toNumber intent comment)
- Modify: `README.md` (B4 note: legacy HSN/3XL products show clear errors; fix in-app)
- Modify: `src/lib/engine/engine.test.ts` (flipkart 3XL regression test) — or a template test; see step 1

- [ ] **Step 1: TDD for B8**

New test: flipkart `mens-tshirts` template accepts a `3XL` variant (no size issue). Verify fail (enum lacks 3XL), then add `'3XL'` to the flipkart size enum. Verify pass.

- [ ] **Step 2: C9**

`batch-bar.tsx`: split the `blocked` computation — `!platform` → message "Choose a platform"; `categories.size > 1` → "Same category required — selected: …" (current behavior). Button disabled on either.

- [ ] **Step 3: C10**

Clear `downloadUrl` state whenever platform or format changes (reset in the same handlers that set platform/format).

- [ ] **Step 4: C11**

History page: move the caveat paragraph inside the `rows.length > 0` conditional.

- [ ] **Step 5: C12 + B4**

One comment on `toNumber` documenting `null`/non-string → null (invalid) vs `''` → undefined (missing). README note under a "Known limitations" section: legacy 4-digit-HSN and non-enum sizes produce clear generation errors, fixed in-app via the edit screen; no auto-backfill by design.

- [ ] **Step 6: Verify + commit**

`pnpm test` (78 + new), `pnpm lint`, `pnpm build`. Commit message: `fix: flipkart 3XL enum and dashboard/history polish`

- [ ] **Step 7: Report**

`task-4-report.md`.

---

### Task 5: Dead exports + design-doc drift

**Files:**
- Modify: `src/lib/rate-limit.ts` (delete `checkRateLimit` + `RateLimitError`)
- Modify: `docs/superpowers/specs/2026-08-10-phase3-hardening-design.md` (§4.1 unique wording + amazon url note)

- [ ] **Step 1: Grep consumers**

`grep -rn "checkRateLimit\|RateLimitError" src/` — confirm zero consumers outside `rate-limit.ts` itself. If a consumer exists, keep the export and say so in the report instead.

- [ ] **Step 2: Delete**

Remove both exports + their now-unused imports/types from `rate-limit.ts`.

- [ ] **Step 3: Doc edits**

Design doc §4.1: correct "unique runs once per file" → per-product within a file; batch enforces file-wide uniqueness via `findDuplicateSkus` (link Task 3). Add note: amazon `url: true` intentionally not shipped (images source is hardcoded `''` — the rule could never fire; blank-guard prevents the trap).

- [ ] **Step 4: Verify + commit**

`pnpm test`, `pnpm lint`, `pnpm build`. Commit message: `chore: remove dead rate-limit exports, sync phase 3 design doc`

- [ ] **Step 5: Report**

`task-5-report.md`.

---

### Task 6: E2E verification

**Files:**
- No source changes — verification only. Record bugs with repro; do NOT fix in this task.

- [ ] **Step 1: Server**

`pnpm build`, restart on 3101 (kill + start, log to /tmp/cake-server.log). Login as `seller@test.com`.

- [ ] **Step 2: Verify each item with evidence**

1. **A1:** product page (any product, e.g. FixVerifyTea or Batch Tee One) shows 8 generate buttons; generate one platform, download link appears.
2. **A2:** `/dashboard/settings` loads with current company fields; edit business name + set one seller ID; save; reload → persists. Nav link present.
3. **B5:** batch-select two products, edit one variant's SKU to equal the other's (via edit page) → batch generate blocked with "duplicate SKU in file" naming both products; then fix SKU → batch works. (Or use existing products with colliding SKUs if present.)
4. **B8:** flipkart generate for a 3XL product succeeds (create a 3XL variant via edit if none exists).
5. **C9:** batch bar with products selected but no platform → "Choose a platform"; mixed categories → "Same category required".
6. **C10:** after generating, change platform → download link disappears.
7. **C11:** history page with 0 generations shows no caveat (only if user has a fresh state; otherwise note it).

- [ ] **Step 3: Report**

`task-6-report.md`: PASS/FAIL per item with evidence (snapshots to /tmp/cake-e2e/*.png, fetched file contents). Bugs → repro steps.

---

## Merge flow (after all tasks + final whole-branch review)

- Final review: base `ec690c4`'s phase-3 equivalent → use base = the plan commit for phase 4 (base `13be6bb`), full diff, cross-task seams, security boundary (no unauthed server-action exports), docs drift.
- Push `feature/phase4-debt-sweep`, open PR #4 to main, merge with a merge commit (established pattern), delete branch.
