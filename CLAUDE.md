# Cake — Development Rules

**Version 3.1** · Apply across ALL sessions, tools, and phases. Reference at the start of every chat.

---

## Golden Rules

```
1. CHECK FIRST  → search services/, lib/, modules/*/, components/shared/, app/api/
                  before building. Exists → use it. Not → build it. No duplicates.
2. STYLING      → brand tokens → native tailwind → arbitrary (rare) → globals → style={{}} (last)
3. TYPES        → never `any`. Path aliases, never ../../../. Enums, never string unions.
4. RENDER       → DRY with .map(). Handle isLoading / isError / empty / data — every time.
5. UI           → mobile-first base, then sm:/md:/lg:. No shadows. No dark mode. No rounded-full.
6. COMMENTS     → every function, route, action, component gets a /* */ doc block.
```

---

## 1. Project & Stack

### 1.1 Identity

- **Cake** — marketplace listing generator for Indian e-commerce (Myntra, Flipkart, Amazon). Enter product data once → generate ready-to-upload platform template files.
- **Core mechanic:** Match score = (seeker skills ∩ job required skills) / job required skills × 100
- **Users:** Job Seeker (`UserRole.SEEKER`), Recruiter (`UserRole.RECRUITER`)
- **Auth gate:** Browse/search is public. Apply requires login — show LoginModal, do NOT redirect.

### 1.2 Stack

| Layer | Tech | Layer | Tech |
|-------|------|-------|------|
| Framework | Next.js 14+ App Router | ORM | Prisma |
| Language | TypeScript (strict) | Database | Neon (serverless Postgres) |
| Package manager | pnpm only | Auth | Auth.js v5 |
| UI | shadcn/ui | File storage | Cloudflare R2 |
| Styling | TailwindCSS | Cache / rate limit | Upstash Redis |
| Icons | Lucide React | Email | Resend |
| Global state | Zustand | Dates | date-fns |
| Server state | TanStack Query | Hosting | Vercel |
| Forms | React Hook Form | Validation | Zod (client + server) |

### 1.3 Dates — date-fns only

```ts
import { format, addDays } from 'date-fns'
format(date, 'MMM d, yyyy')        // ✅
new Date().toLocaleDateString()    // ❌
```

---

## 2. Styling (canonical — all styling rules live here)

> **DESIGN.md is the design system of record.** Read it before any UI code. The palette below is DESIGN.md's — amber primary `#F59E0B`, no shadows, borders for depth, Inter only, light mode only, `rounded-lg` inputs / `rounded-xl` cards. Build clean, neat, **reusable** UI: extract shared components instead of repeating markup, keep single-responsibility components, and always check for an existing component before writing new markup.

### Priority Ladder

```
1. BRAND TOKENS    bg-brand-primary, text-brand-foreground   [ALWAYS FIRST]
2. NATIVE TAILWIND bg-white, text-gray-500, rounded-lg       [PREFERRED]
3. ARBITRARY       bg-[#F59E0B]                              [RARE — only if 1+2 unavailable]
4. GLOBAL CSS      add to globals.css / tailwind.config.ts, then use as token
5. style={{}}      LAST RESORT ONLY — prefer className="mt-4"
```

### Brand Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `bg-brand-primary` | `#F59E0B` | Primary buttons, CTAs |
| `bg-brand-primary-dk` | `#D97706` | Button hover |
| `bg-brand-primary-active` | `#B45309` | Button active |
| `text-brand-primary-foreground` | `#ffffff` | Text on primary |
| `text-brand-foreground` | `#0a0a0a` | Headings, primary text |
| `text-brand-foreground-muted` | `#6b7280` | Body text, descriptions |
| `text-brand-foreground-secondary` | `#9ca3af` | Placeholders, captions |
| `border-brand-border` | `#e5e7eb` | Borders, dividers |
| `bg-brand-surface` | `#f9fafb` | Light backgrounds |
| `bg-brand-surface-hover` | `#f3f4f6` | Surface hover |
| `text-brand-success` | `#16a34a` | Success states |
| `text-brand-danger` | `#ef4444` | Error, destructive |

### Typography Scale

```ts
// Display / Hero
"font-bold text-5xl md:text-6xl lg:text-7xl leading-tight tracking-tight"
// H1 / Page
"font-bold text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight"
// H2 / Section
"font-bold text-2xl md:text-3xl leading-snug tracking-tight"
// H3 / Card title
"font-semibold text-xl leading-snug tracking-tight"
// Body / Body muted
"font-normal text-base leading-relaxed"  ·  add text-muted-foreground for muted
// Label
"font-medium text-xs uppercase tracking-wider"
```

### Arbitrary Values

Before writing `[Xpx]`, use the canonical class. Arbitrary `[X]` is ONLY valid when: value NOT divisible by 4 (310px, 132px) · ratio/em with no named equivalent · CSS feature (perspective, translateZ, blur) · sub-pixel micro-typography (10/11/13px) · a color (still follow token priority).

| Arbitrary | Canonical | Arbitrary | Canonical |
|-----------|-----------|-----------|-----------|
| `text-[60px]` | `text-6xl` | `leading-[1.5]` | `leading-normal` |
| `text-[48px]` | `text-5xl` | `leading-[1.625]`/`[1.7]` | `leading-relaxed` |
| `text-[36px]` | `text-4xl` | `leading-[2]` | `leading-loose` |
| `text-[30px]` | `text-3xl` | `tracking-[-0.05em]` | `tracking-tighter` |
| `max-w/w/h/gap/p-[Xpx]` where X÷4=N | `*-N` | `tracking-[-0.025em]` | `tracking-tight` |

### Component Patterns

- Ring color for inputs/focus: amber `#F59E0B` (e.g. `focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B]`)
- No shadows anywhere; depth from `border` + whitespace. `rounded-lg` inputs/buttons, `rounded-xl` cards, `rounded-full` ONLY for pills/badges. Never `rounded-full` on inputs/cards.

```ts
import { Button } from "@/components/ui/button"
<Button variant="primary">Label</Button>   // also: secondary | destructive | ghost | link

// Card:  "rounded-xl border border-brand-border bg-white p-6"
// Input: "rounded-lg border border-brand-border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
// Modal: "rounded-xl border border-brand-border"
```

| Variant | Use | Variant | Use |
|---------|-----|---------|-----|
| `primary` | Main CTA, submit | `destructive` | Delete, remove |
| `secondary` | Secondary actions | `ghost` | Inline, nav |
| `link` | Text links | | |

### Mobile-First (mandatory)

```ts
"flex flex-col gap-4 lg:flex-row lg:gap-8"                       // ✅ base mobile, enhance up
"relative w-full lg:absolute lg:left-0 lg:top-0 lg:w-72"        // ✅ desktop positioning gated
"absolute left-0 top-0 w-72"                                    // ❌ clips on mobile
```

- Base classes must produce a usable mobile layout before any `sm:`/`md:`/`lg:` override.
- Absolute positioning / fixed width / fixed height that can overflow must be `lg:`-gated with mobile-safe base classes.
- Header/nav must expose all critical auth/actions on mobile (visible buttons or menu).
- Verify affected screens at ~390px and desktop before finishing.

### NEVER

```ts
style={{ color:'#4F46E5' }}                  // inline styles → use className
className="text-[#000000]"                   // hardcoded hex (unless arbitrary rule applies)
className="bg-indigo-600" / "bg-purple-500"  // old purple/indigo → amber brand tokens
className="text-slate-700" / "text-gray-400" // → text-brand-foreground / -muted
className="shadow-lg"                        // no shadows — borders only
className="dark:bg-gray-900"                 // no dark mode
className="font-extrabold"                   // → font-bold (no 800+)
className="rounded-full"                     // on inputs/cards → rounded-lg / rounded-xl
className="max-w-[460px]"                    // arbitrary when canonical exists → max-w-lg
```

---

## 3. Components

### File Structure

```
src/components/ui/                → shadcn/ui base only — NEVER customize
src/components/forms/             → reusable form inputs
src/components/layout/            → headers, footer
src/components/shared/            → used in 2+ modules
src/modules/[domain]/components/  → domain-specific only
```

**2+ Rule:** component used in more than one module → `src/components/shared/`. Never duplicate.

**Size:** keep components under ~80 lines JSX. Break files >~300 lines or with multiple visual sections into sub-components. Co-locate single-use sub-components in the same folder; reusable ones follow the 2+ rule.

### `"use client"` only when

useState/useEffect/useReducer · TanStack Query hooks · Zustand access · browser APIs · event handlers · third-party client libs. Otherwise default to Server Component.

### Props — always typed

```ts
interface JobCardProps { job: JobListItem; matchScore?: number; onApply?: () => void }
export function JobCard({ job, matchScore, onApply }: JobCardProps) { }
```

### Import Order

```ts
'use client'                                              // 1. directive (first line if needed)
import { useState } from 'react'                          // 2. React
import { useRouter } from 'next/navigation'               // 3. Next.js
import { useQuery } from '@tanstack/react-query'          // 4. third-party
import { UserRole } from '@/constants/enums'              // 5. internal: lib/constants/store/hooks
import { calculateMatchScore } from '@/modules/matching/utils/calculate-match' // 6. modules
import { JobCard } from '@/components/shared/JobCard'      // 7. components (shared → local)
import type { JobListItem } from '@/modules/jobs/types/job.types' // 8. types
// 9. interfaces  10. component
```

**No barrel imports** — import from the exact file path, never `@/components/shared`.

---

## 4. State & Data

| State | Tool | Example |
|-------|------|---------|
| Server data | TanStack Query | jobs list, applicants |
| Global UI | Zustand | modal, sidebar, auth |
| Form state | React Hook Form + Zod | inputs, validation |
| Local UI | useState | toggle, transient |
| URL / filter | useSearchParams | pagination |

- **Zustand:** one store per domain (`use-auth-store.ts`). Keep thin — global UI only, server data belongs in Query. `persist` only on auth store.
- **TanStack Query:** array keys (`['jobs', filters]`). staleTime: static 5min, dynamic 30s. Invalidate after mutations: `queryClient.invalidateQueries({ queryKey: ['jobs'] })`.

```ts
// Forms — schema in lib/validations/, validate on client AND server
const form = useForm<CreateJobInput>({ resolver: zodResolver(CreateJobSchema), defaultValues: {} })
const parsed = CreateJobSchema.safeParse(data)
if (!parsed.success) return { error: parsed.error.flatten() }
```

---

## 5. API & Server

### Route Rules

```ts
const session = await auth()
if (!session?.user) return new Response('Unauthorized', { status: 401 })
if (session.user.role !== UserRole.RECRUITER) return new Response('Forbidden', { status: 403 })

const parsed = CreateJobSchema.safeParse(await req.json())
if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

Response.json({ data: result }, { status: 200 })   // consistent shape
Response.json({ error: 'message' }, { status: 500 })
```

### Rate Limiting (mandatory on ALL routes)

Use Upstash `Ratelimit` (sliding window). Key by IP for reads/auth, by userId for writes/uploads.

```ts
const ip = req.headers.get("x-forwarded-for") ?? "anonymous"
const { success } = await ratelimit.limit(ip)
if (!success) return new Response("Too Many Requests", { status: 429 })
```

| Endpoint | Limit | Endpoint | Limit |
|----------|-------|----------|-------|
| Auth | 10/min per IP | Reads | 30/min per IP |
| Writes (POST/PUT/DELETE) | 5/min per user | File uploads | 5/min per userId |

### Server Actions

```ts
"use server"
export async function createJobAction(data: unknown) {
  const parsed = CreateJobSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  // proceed with parsed.data
}
```

---

## 6. Code Quality

### DRY

```ts
// JSX → data array + .map(); never copy-paste rows/cards
const ROWS = [{ label: 'A' }, { label: 'B' }]
{ROWS.map(row => <tr key={row.label}><td className={CELL_BASE}>{row.label}</td></tr>)}

// Repeated className → named const.  Static data → typed config, not inline JSX.
const CELL_BASE = 'py-4 px-4 text-sm'
```

### Handle All States

```ts
if (isLoading) return <Skeleton />
if (isError)   return <ErrorState onRetry={refetch} />
if (!data?.length) return <EmptyState />
return <Content data={data} />
```

### Enums, Not String Unions

Any value from a fixed set of strings → enum in `src/constants/enums.ts`. Applies to return types, params, variable annotations, response shapes.

```ts
// ❌ function getDirection(): "upgrade" | "downgrade" | "same"
export enum PlanDirection { UPGRADE = "upgrade", DOWNGRADE = "downgrade", SAME = "same" }
function getDirection(): PlanDirection { }   // ✅
```

### Mandatory Comments

Every function, API route, server action, and component gets a `/* */` block: purpose, params, return, key behavior/side effects. Add inline comments for non-obvious logic.

```ts
/*
 * calculateMatchScore
 * Job-seeker match % from skills overlap.
 * @param required - job required skills
 * @param seeker   - seeker skills
 * @returns number 0-100, or null if no overlap
 */
export function calculateMatchScore(required: string[], seeker: string[]): number | null { }
```

### Bug-Fix Standards (mandatory — no patch-only fixes)

1. **Root-cause first** — trace the failure path, identify the broken contract/invariant, confirm why existing checks missed it.
2. **Cross-feature impact** — check adjacent flows sharing the function/action/component; verify return shapes are consistent for all callers; ensure auth/session/cookie mutations run only in valid contexts.
3. **Fix the source** — correct the contract/state mismatch and tighten types so invalid states can't recur. Avoid null/undefined guards as the only fix.
4. **Prove safety** — run at minimum a TypeScript check; add targeted tests where practical; document residual risk if unverifiable locally.

### Pre-commit Checklist

- [ ] No repeated JSX (`.map()`) or className (`cn()`/const)
- [ ] No hardcoded copy in JSX — constants or props
- [ ] No `any` in props/handlers · no string-literal unions (use enums)
- [ ] isLoading / isError / empty handled
- [ ] Mobile-first responsive · aria-* on interactive elements
- [ ] No `console.log` or `TODO`
- [ ] All functions/routes have doc comments

---

## 7. Git & Naming

### ⚠️ Branch Rules — MANDATORY for ALL agents (Claude, Codex, OpenCode, Cursor, Copilot, etc.)

```
NEVER push directly to: main, staging
ALWAYS:
  1. git checkout staging && git pull origin staging
  2. git checkout -b feature/your-feature-name   (or fix/, chore/, etc.)
  3. do work + commit on that branch
  4. push that branch → open PR → target: staging
```

**Why:** `main` = production. `staging` = integration. Direct pushes break CI, bypass review, and can nuke prod.

| Branch | Purpose | Push policy |
|--------|---------|-------------|
| `main` | Production | ❌ Never push directly — merge from staging via PR only |
| `staging` | Integration / QA | ❌ Never push directly — merge from feature branch via PR only |
| `feature/*` | New features | ✅ Push freely — PR targets `staging` |
| `fix/*` | Bug fixes | ✅ Push freely — PR targets `staging` |
| `chore/*` | Maintenance | ✅ Push freely — PR targets `staging` |

```
type(scope): short description        types: feat fix chore refactor style test docs
  feat(jobs): add skills tag input
  fix(auth): correct oauth redirect

branches:  feature/job-detail-page · fix/login-modal-redirect
never commit:  .env* (with values) · node_modules/ · .next/ · keys/tokens/secrets
```

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase.tsx | JobCard.tsx |
| Hooks | use-kebab-case.ts | use-matched-jobs.ts |
| Utils | kebab-case.ts | calculate-match.ts |
| Types | kebab-case.types.ts | job.types.ts |
| Schemas | kebab-case.schema.ts | job.schema.ts |
| Stores | use-kebab-store.ts | use-auth-store.ts |
| Services | kebab-case.service.ts | job.service.ts |
| Constants | kebab-case.ts | match-thresholds.ts |

---

**End of Rules**
