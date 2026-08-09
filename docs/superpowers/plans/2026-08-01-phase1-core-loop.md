# Phase 1: Core Loop Implementation Plan (Cake)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Cake core loop — signup with company details, dynamic product form (platform → category → mandatory fields), generator engine, and CSV/XLSX download with history — for Flipkart, Myntra, and Amazon (T-shirt category).

**Architecture:** Next.js App Router app with a standard product model in the center. Platform templates are data files (`src/data/templates/*.ts`) describing columns (name, source, required, default); the generic engine (`src/lib/engine/`) validates a product against a template, renders one row per variant, and serializes to CSV/XLSX. Auth via Auth.js v5 credentials; Prisma + SQLite for dev.

**Tech Stack:** Next.js 15 App Router + TypeScript (strict), TailwindCSS + shadcn/ui (amber theme per DESIGN.md), Prisma (SQLite dev / Neon postgres prod), Auth.js v5 (`next-auth@beta`) with credentials, React Hook Form + Zod, `xlsx` (SheetJS), bcryptjs, vitest, pnpm.

## Global Constraints

- pnpm only. Node >= 20. Remove the stub `package.json` (`{}`) before scaffolding.
- TypeScript strict; never `any`; enums not string unions (see `src/constants/enums.ts`).
- Styling: brand tokens via `tailwind.config.ts` colors, amber primary `#F59E0B` / hover `#D97706` / active `#B45309`; foreground `#0a0a0a`; muted `#6b7280`; secondary `#9ca3af`; border `#e5e7eb`; surface `#f9fafb`. No shadows, no dark mode, no `rounded-full` on inputs/cards, Inter font only (next/font/google).
- Every function, route, action, and component gets a `/* */` doc block (purpose, params, return).
- No `console.log`, no TODO comments in shipped code.
- Tests co-located as `src/**/*.test.ts`, run with vitest (`pnpm test`).
- Branch flow (CLAUDE.md §7): no remote exists yet — commit on `main` for now; switch to `feature/*` → PR → `staging` once a remote is added.
- Deferred to later phases (do NOT build now): rate limiting (Upstash), file storage (files re-rendered on demand), TanStack Query/Zustand/date-fns (server components + useState suffice), CSV import wizard, image hosting.
- Template column data is best-effort from public knowledge; templates are data files so they can be corrected without code changes (PRD risk #1).

---

### Task 1: Scaffold Next.js app + shadcn/ui + amber theme

**Files:**
- Create: (entire app scaffold via create-next-app)
- Create: `tailwind.config.ts` (extend)
- Create: `src/app/globals.css` (modify)
- Create: `src/app/layout.tsx` (modify — Inter font)
- Create: `vitest.config.ts`, `tests/setup.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: nothing.
- Produces: runnable `pnpm dev` app at `localhost:3000`; `pnpm test` runs vitest; `pnpm build` passes.

- [ ] **Step 1: Remove stub package.json and scaffold**

```bash
rm package.json .DS_Store
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Expected: scaffold created in place (`.git` already exists; answer prompts with defaults).

- [ ] **Step 2: Install shadcn/ui and add needed components**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button input label card select dialog table sonner
pnpm add bcryptjs xlsx
pnpm add -D vitest @vitest/coverage-v8
```

- [ ] **Step 3: Configure amber brand tokens in `tailwind.config.ts`**

Add to the `theme.extend.colors` block (keep existing shadcn values):

```ts
brand: {
  primary: '#F59E0B',
  'primary-dk': '#D97706',
  'primary-active': '#B45309',
  foreground: '#0a0a0a',
  'foreground-muted': '#6b7280',
  'foreground-secondary': '#9ca3af',
  border: '#e5e7eb',
  surface: '#f9fafb',
  success: '#16a34a',
  danger: '#ef4444',
},
```

- [ ] **Step 4: Set theme vars in `src/app/globals.css`**

Replace the default `:root` palette primaries with amber (keep the rest of shadcn's vars):

```css
:root {
  --primary: 38 92% 50%;          /* #F59E0B */
  --primary-foreground: 0 0% 100%;
  --ring: 38 92% 50%;
}
```

- [ ] **Step 5: Inter font in `src/app/layout.tsx`**

```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
// <html lang="en" className={inter.className}>
```

- [ ] **Step 6: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 7: Verify**

Run: `pnpm build` — Expected: PASS.
Run: `pnpm test` — Expected: no tests found, exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold nextjs app with shadcn amber theme and vitest"
```

---

### Task 2: Prisma schema + seed data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `prisma/seed.ts`
- Create: `src/constants/enums.ts`
- Modify: `package.json` (prisma seed script)

**Interfaces:**
- Consumes: Task 1 scaffold.
- Produces: `db` (PrismaClient singleton) in `src/lib/db.ts`; `Platform` enum in `src/constants/enums.ts`; seeded `Category` rows with slugs `mens-tshirts`, `womens-tshirts`, `kids-tshirts` and `CategoryPlatformMapping` rows for `Platform.FLIPKART | MYNTRA | AMAZON`; tables `User, Company, Product, Variant, Category, CategoryPlatformMapping, Generation`.

- [ ] **Step 1: Install Prisma**

```bash
pnpm add -D prisma tsx
pnpm add @prisma/client
pnpm prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client { provider = "prisma-client-js" }

datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  company      Company?
  products     Product[]
  generations  Generation[]
}

model Company {
  id            String  @id @default(cuid())
  userId        String  @unique
  businessName  String
  gstin         String
  brandName     String
  returnAddress String?
  warehousePin  String?
  user          User    @relation(fields: [userId], references: [id])
}

model Product {
  id           String       @id @default(cuid())
  userId       String
  title        String
  description  String
  brand        String
  categorySlug String
  hsn          String
  gstRate      Float
  createdAt    DateTime     @default(now())
  user         User         @relation(fields: [userId], references: [id])
  variants     Variant[]
  generations  Generation[]
}

model Variant {
  id          String  @id @default(cuid())
  productId   String
  sku         String
  size        String
  color       String
  mrp         Float
  price       Float
  stock       Int
  weightGrams Float
  product     Product @relation(fields: [productId], references: [id])
}

model Category {
  id             String                  @id @default(cuid())
  slug           String                  @unique
  name           String
  path           String
  defaultHsn     String
  defaultGstRate Float
  mappings       CategoryPlatformMapping[]
}

model CategoryPlatformMapping {
  id                  String  @id @default(cuid())
  categorySlug        String
  platform            String
  platformCategoryId  String?
  platformCategoryPath String
  category            Category @relation(fields: [categorySlug], references: [slug])
}

model Generation {
  id              String   @id @default(cuid())
  userId          String
  productId       String
  platform        String
  categorySlug    String
  templateVersion String
  fileName        String
  createdAt       DateTime @default(now())
  product         Product  @relation(fields: [productId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 3: Create `src/constants/enums.ts`**

```ts
/*
 * Platform
 * Supported marketplace platforms.
 */
export enum Platform {
  FLIPKART = 'FLIPKART',
  MYNTRA = 'MYNTRA',
  AMAZON = 'AMAZON',
}
```

- [ ] **Step 4: Create `src/lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

/*
 * db
 * Prisma client singleton — reuse one connection across the app.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const db = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 5: Create `prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

/*
 * seed
 * Creates the starter category taxonomy and platform mappings.
 * ponytail: 3 T-shirt categories to prove the loop; add more categories as data later.
 */
async function main() {
  const cats = [
    { slug: 'mens-tshirts', name: 'T-Shirts', path: "Clothing > Men's Wear > T-Shirts", hsn: '6109', gst: 5 },
    { slug: 'womens-tshirts', name: 'T-Shirts', path: "Clothing > Women's Wear > T-Shirts", hsn: '6109', gst: 5 },
    { slug: 'kids-tshirts', name: 'T-Shirts', path: 'Clothing > Kids > T-Shirts', hsn: '6109', gst: 5 },
  ]
  for (const c of cats) {
    const category = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, path: c.path, defaultHsn: c.hsn, defaultGstRate: c.gst },
    })
    const mappings = [
      { platform: 'FLIPKART', path: "Men's T-Shirts", id: null },
      { platform: 'MYNTRA', path: "Men's Wear > T-Shirts", id: null },
      { platform: 'AMAZON', path: 'Apparel > Men > T-Shirts', id: null },
    ]
    for (const m of mappings) {
      await db.categoryPlatformMapping.upsert({
        where: {
          id: `map-${c.slug}-${m.platform}`,
        },
        update: {},
        create: {
          id: `map-${c.slug}-${m.platform}`,
          categorySlug: c.slug,
          platform: m.platform,
          platformCategoryId: m.id,
          platformCategoryPath: m.path,
        },
      })
    }
  }
  console.log('seed done')
}

main().finally(() => db.$disconnect())
```

- [ ] **Step 6: Add seed script to `package.json`**

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 7: Push schema and run seed; verify**

```bash
cp .env.example .env   # or create .env with DATABASE_URL="file:./dev.db"
pnpm prisma db push
pnpm prisma db seed
```

Create `scripts/check-seed.ts`:

```ts
import { db } from '@/lib/db'

/*
 * check-seed
 * Smoke check: categories and mappings exist.
 */
async function main() {
  const cats = await db.category.findMany({ include: { mappings: true } })
  console.log(`categories: ${cats.length}`)
  console.log(`mappings: ${cats.reduce((n, c) => n + c.mappings.length, 0)}`)
}
main().finally(() => db.$disconnect())
```

Run: `pnpm tsx scripts/check-seed.ts` — Expected: `categories: 3`, `mappings: 9`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add prisma schema, seed categories and platform mappings"
```

---

### Task 3: Auth — signup (with company details), login, route guard

**Files:**
- Create: `src/lib/password.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/actions/register.ts`
- Create: `src/lib/validations/auth.schema.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/components/forms/auth-form.tsx`
- Test: `src/lib/password.test.ts`

**Interfaces:**
- Consumes: `db` (Task 2).
- Produces: `auth` (NextAuth instance) and `hashPassword`/`verifyPassword`; `registerAction(data)` server action returning `{ error?: string; ok: true }`; routes `/login`, `/signup`; `/dashboard/**` requires session.

- [ ] **Step 1: Write the failing test — `src/lib/password.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

/*
 * password round-trip: hash then verify succeeds; wrong password fails.
 */
describe('password', () => {
  it('verifies correct password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })
  it('rejects wrong password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL (module missing)**

Run: `pnpm test` — Expected: FAIL `Cannot find module './password'`.

- [ ] **Step 3: Create `src/lib/password.ts`**

```ts
import bcrypt from 'bcryptjs'

/*
 * hashPassword
 * bcrypt hash with 10 rounds.
 * @param plain - raw password
 * @returns hashed string
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

/*
 * verifyPassword
 * Compare a raw password against a stored hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm test` — Expected: 2 passed.

- [ ] **Step 5: Create `src/lib/validations/auth.schema.ts`**

```ts
import { z } from 'zod'

/*
 * RegisterSchema
 * Signup collects company details once (PRD §6).
 */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(1),
  gstin: z.string().regex(/^[0-9A-Za-z]{15}$/, 'GSTIN must be 15 characters'),
  brandName: z.string().min(1),
  returnAddress: z.string().optional(),
  warehousePin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits').optional().or(z.literal('')),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
export type LoginInput = z.infer<typeof LoginSchema>
```

- [ ] **Step 6: Create `src/lib/auth.ts`**

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from './db'
import { verifyPassword } from './password'

/*
 * auth
 * NextAuth v5 with credentials provider (JWT sessions).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null
        const ok = await verifyPassword(String(credentials?.password ?? ''), user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
})
```

- [ ] **Step 7: Create `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 8: Create `src/middleware.ts`**

```ts
export { auth as middleware } from '@/lib/auth'
export const config = { matcher: ['/dashboard/:path*'] }
```

- [ ] **Step 9: Create `src/lib/actions/register.ts`**

```ts
'use server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { RegisterSchema } from '@/lib/validations/auth.schema'

/*
 * registerAction
 * Creates a User + Company from signup form data.
 * @param data - raw form payload
 * @returns { ok: true } or { error: string }
 */
export async function registerAction(data: unknown) {
  const parsed = RegisterSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid form data' }
  const { email, password, businessName, gstin, brandName, returnAddress, warehousePin } = parsed.data
  const exists = await db.user.findUnique({ where: { email } })
  if (exists) return { error: 'Account already exists' }
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      company: {
        create: { businessName, gstin, brandName, returnAddress, warehousePin: warehousePin || null },
      },
    },
  })
  return { ok: true as const, userId: user.id }
}
```

- [ ] **Step 10: Create `src/components/forms/auth-form.tsx`**

Client component, RHF + zod, mode `signup` shows company fields:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterSchema, LoginSchema, type RegisterInput, type LoginInput } from '@/lib/validations/auth.schema'
import { registerAction } from '@/lib/actions/register'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/*
 * AuthForm
 * Login/signup form. Signup collects company details (PRD §6).
 * @param mode - 'login' | 'signup'
 */
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const isSignup = mode === 'signup'
  const form = useForm<RegisterInput & LoginInput>({
    resolver: zodResolver(isSignup ? RegisterSchema : LoginSchema),
    defaultValues: {},
  })

  async function onSubmit(data: RegisterInput & LoginInput) {
    setPending(true)
    setError('')
    if (isSignup) {
      const res = await registerAction(data)
      if (!('ok' in res)) { setError(res.error); setPending(false); return }
    }
    const s = await signIn('credentials', { email: data.email, password: data.password, redirect: false })
    if (s?.error) { setError('Invalid email or password'); setPending(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register('email')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...form.register('password')} />
      </div>
      {isSignup && (
        <>
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" {...form.register('businessName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" placeholder="15-character GSTIN" {...form.register('gstin')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand name</Label>
            <Input id="brandName" {...form.register('brandName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="returnAddress">Return address (optional)</Label>
            <Input id="returnAddress" {...form.register('returnAddress')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="warehousePin">Warehouse PIN (optional)</Label>
            <Input id="warehousePin" {...form.register('warehousePin')} />
          </div>
        </>
      )}
      {error && <p className="text-sm text-brand-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 11: Create login/signup pages**

`src/app/(auth)/login/page.tsx` — centered card, heading "Welcome back", `<AuthForm mode="login" />`, link to `/signup`.
`src/app/(auth)/signup/page.tsx` — heading "Create your account", `<AuthForm mode="signup" />`, link to `/login`.
(Reuse shadcn `Card`: `rounded-xl border border-brand-border bg-white p-6`.)

- [ ] **Step 12: Verify**

Run: `pnpm test` — Expected: PASS.
Run: `pnpm dev` — visit `/signup`, create an account, land on `/dashboard` (middleware redirects unauthenticated). Visit `/dashboard` logged out — Expected: redirect to `/login`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: auth with signup company details, login, and dashboard guard"
```

---

### Task 4: Template schema types + data for 3 platforms

**Files:**
- Create: `src/lib/templates/types.ts`
- Create: `src/lib/templates/validate-template.ts`
- Create: `src/data/templates/flipkart-t-shirt.ts`
- Create: `src/data/templates/myntra-t-shirt.ts`
- Create: `src/data/templates/amazon-t-shirt.ts`
- Create: `src/data/templates/index.ts`
- Test: `src/lib/templates/validate-template.test.ts`

**Interfaces:**
- Consumes: `Platform` enum (Task 2).
- Produces: `TemplateSource` union; `TemplateColumn { name, source, required, type, default? }`; `PlatformTemplate { platform, version, categorySlug, columns }`; `getTemplate(platform, categorySlug): PlatformTemplate | null`; `getTemplatesForPlatform(platform)`; `assertAllTemplatesValid()`.

- [ ] **Step 1: Write the failing test — `src/lib/templates/validate-template.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { getTemplate } from '@/data/templates'
import { assertAllTemplatesValid } from './validate-template'

/*
 * Every template in the registry must be structurally valid:
 * unique column names, required columns must have a source or default,
 * sources must be known, and the registry must cover every platform mapping.
 */
describe('templates', () => {
  it('all templates are valid', () => {
    expect(assertAllTemplatesValid()).toEqual([])
  })
  it('exposes the t-shirt template for all 3 platforms', () => {
    for (const p of ['FLIPKART', 'MYNTRA', 'AMAZON']) {
      expect(getTemplate(p, 'mens-tshirts')).not.toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run test, expect FAIL (modules missing)**

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/templates/types.ts`**

```ts
import { Platform } from '@/constants/enums'

/*
 * TemplateSource
 * Standard product model fields a template column can read from.
 */
export type TemplateSource =
  | 'title' | 'description' | 'brand' | 'hsn' | 'gstRate' | 'categoryPath'
  | 'sku' | 'size' | 'color' | 'mrp' | 'price' | 'stock' | 'weightGrams'
  | 'images'

export type TemplateColumnType = 'string' | 'number' | 'int'

/*
 * TemplateColumn
 * One output column of a platform template.
 */
export interface TemplateColumn {
  name: string
  source: TemplateSource
  required: boolean
  type: TemplateColumnType
  default?: string
}

/*
 * PlatformTemplate
 * The full schema for one (platform, category) upload file.
 */
export interface PlatformTemplate {
  platform: Platform
  version: string
  categorySlug: string
  columns: TemplateColumn[]
}
```

- [ ] **Step 4: Create `src/lib/templates/validate-template.ts`**

```ts
import { getAllTemplates } from '@/data/templates'
import type { TemplateSource } from './types'

/*
 * SOURCES
 * Every valid source name.
 */
export const SOURCES: readonly TemplateSource[] = [
  'title', 'description', 'brand', 'hsn', 'gstRate', 'categoryPath',
  'sku', 'size', 'color', 'mrp', 'price', 'stock', 'weightGrams', 'images',
]

/*
 * assertAllTemplatesValid
 * Structural checks over every template in the registry.
 * @returns array of problem strings (empty when valid)
 */
export function assertAllTemplatesValid(): string[] {
  const issues: string[] = []
  for (const t of getAllTemplates()) {
    const names = t.columns.map((c) => c.name)
    if (new Set(names).size !== names.length) issues.push(`${t.platform}/${t.categorySlug}: duplicate column names`)
    for (const c of t.columns) {
      if (!(SOURCES as readonly string[]).includes(c.source)) {
        issues.push(`${t.platform}/${t.categorySlug}: unknown source ${c.source}`)
      }
      if (c.required && !c.default && !SOURCES.includes(c.source)) {
        issues.push(`${t.platform}/${t.categorySlug}: required column ${c.name} has no usable source`)
      }
    }
  }
  return issues
}
```

- [ ] **Step 5: Create template data files**

`src/data/templates/flipkart-t-shirt.ts`:

```ts
import { Platform } from '@/constants/enums'
import type { PlatformTemplate } from '@/lib/templates/types'

/*
 * flipkartTShirt
 * Best-effort Flipkart T-shirt upload schema (public template knowledge).
 * ponytail: deepen per real seller-hub template in research pass.
 */
export const flipkartTShirt: PlatformTemplate = {
  platform: Platform.FLIPKART,
  version: '1.0',
  categorySlug: 'mens-tshirts',
  columns: [
    { name: 'Category', source: 'categoryPath', required: true, type: 'string' },
    { name: 'Brand', source: 'brand', required: true, type: 'string' },
    { name: 'Product Title', source: 'title', required: true, type: 'string' },
    { name: 'Product Description', source: 'description', required: true, type: 'string' },
    { name: 'MRP', source: 'mrp', required: true, type: 'number' },
    { name: 'Selling Price', source: 'price', required: true, type: 'number' },
    { name: 'Seller SKU', source: 'sku', required: true, type: 'string' },
    { name: 'Size', source: 'size', required: true, type: 'string' },
    { name: 'Color', source: 'color', required: true, type: 'string' },
    { name: 'Stock', source: 'stock', required: true, type: 'int' },
    { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
    { name: 'HSN', source: 'hsn', required: true, type: 'string' },
    { name: 'Tax Code', source: 'gstRate', required: true, type: 'string' },
    { name: 'Image URLs', source: 'images', required: false, type: 'string' },
  ],
}
```

`src/data/templates/myntra-t-shirt.ts` (same pattern):

```ts
import { Platform } from '@/constants/enums'
import type { PlatformTemplate } from '@/lib/templates/types'

/*
 * myntraTShirt
 * Best-effort Myntra T-shirt upload schema (public template knowledge).
 * ponytail: Myntra templates are category-specific; deepen per seller portal research.
 */
export const myntraTShirt: PlatformTemplate = {
  platform: Platform.MYNTRA,
  version: '1.0',
  categorySlug: 'mens-tshirts',
  columns: [
    { name: 'Style Code', source: 'sku', required: true, type: 'string' },
    { name: 'Product Name', source: 'title', required: true, type: 'string' },
    { name: 'Brand', source: 'brand', required: true, type: 'string' },
    { name: 'Category Path', source: 'categoryPath', required: true, type: 'string' },
    { name: 'MRP', source: 'mrp', required: true, type: 'number' },
    { name: 'Selling Price', source: 'price', required: true, type: 'number' },
    { name: 'Size', source: 'size', required: true, type: 'string' },
    { name: 'Color', source: 'color', required: true, type: 'string' },
    { name: 'HSN', source: 'hsn', required: true, type: 'string' },
    { name: 'GST %', source: 'gstRate', required: true, type: 'string' },
    { name: 'Weight (g)', source: 'weightGrams', required: true, type: 'number' },
    { name: 'Stock', source: 'stock', required: true, type: 'int' },
    { name: 'Image URLs', source: 'images', required: false, type: 'string' },
  ],
}
```

`src/data/templates/amazon-t-shirt.ts` (same pattern, Amazon headers):

```ts
import { Platform } from '@/constants/enums'
import type { PlatformTemplate } from '@/lib/templates/types'

/*
 * amazonTShirt
 * Best-effort Amazon India flat-file subset for T-shirts.
 * ponytail: full flat file has 100+ columns; ship the mandatory core set.
 */
export const amazonTShirt: PlatformTemplate = {
  platform: Platform.AMAZON,
  version: '1.0',
  categorySlug: 'mens-tshirts',
  columns: [
    { name: 'item_name', source: 'title', required: true, type: 'string' },
    { name: 'brand_name', source: 'brand', required: true, type: 'string' },
    { name: 'item_type_keyword', source: 'categoryPath', required: true, type: 'string' },
    { name: 'standard_price', source: 'price', required: true, type: 'number' },
    { name: 'part_number', source: 'sku', required: true, type: 'string' },
    { name: 'size_name', source: 'size', required: true, type: 'string' },
    { name: 'color_name', source: 'color', required: true, type: 'string' },
    { name: 'quantity', source: 'stock', required: true, type: 'int' },
    { name: 'item_weight', source: 'weightGrams', required: true, type: 'number' },
    { name: 'HSN_Code', source: 'hsn', required: true, type: 'string' },
    { name: 'Product_Tax_Code', source: 'gstRate', required: true, type: 'string' },
    { name: 'main_image_url', source: 'images', required: false, type: 'string' },
  ],
}
```

`src/data/templates/index.ts`:

```ts
import { Platform } from '@/constants/enums'
import type { PlatformTemplate } from '@/lib/templates/types'
import { flipkartTShirt } from './flipkart-t-shirt'
import { myntraTShirt } from './myntra-t-shirt'
import { amazonTShirt } from './amazon-t-shirt'

/*
 * REGISTRY
 * All platform templates. Keyed by `${platform}:${categorySlug}`.
 */
const REGISTRY: PlatformTemplate[] = [flipkartTShirt, myntraTShirt, amazonTShirt]

/*
 * getTemplate
 * @param platform - marketplace platform
 * @param categorySlug - our category slug
 * @returns matching template or null
 */
export function getTemplate(platform: Platform, categorySlug: string): PlatformTemplate | null {
  return REGISTRY.find((t) => t.platform === platform && t.categorySlug === categorySlug) ?? null
}

/*
 * getTemplatesForPlatform
 * All templates for a platform (used by the form's category step).
 */
export function getTemplatesForPlatform(platform: Platform): PlatformTemplate[] {
  return REGISTRY.filter((t) => t.platform === platform)
}

/*
 * getAllTemplates
 * Every registered template.
 */
export function getAllTemplates(): PlatformTemplate[] {
  return REGISTRY
}
```

- [ ] **Step 6: Run tests, expect PASS**

Run: `pnpm test` — Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add template schema and t-shirt templates for 3 platforms"
```

---

### Task 5: Generator engine — validate, build rows, serialize

**Files:**
- Create: `src/lib/products/types.ts`
- Create: `src/lib/engine/validate.ts`
- Create: `src/lib/engine/build-rows.ts`
- Create: `src/lib/engine/serialize.ts`
- Create: `src/lib/engine/index.ts`
- Test: `src/lib/engine/engine.test.ts`

**Interfaces:**
- Consumes: `PlatformTemplate` (Task 4), `getTemplate` (Task 4).
- Produces:
  - `StandardProduct { title; description; brand; hsn; gstRate; categoryPath }`
  - `VariantInput { sku; size; color; mrp; price; stock; weightGrams }`
  - `validateForTemplate(product: StandardProduct, variants: VariantInput[], template: PlatformTemplate): ValidationIssue[]` where `ValidationIssue = { column: string; message: string }`
  - `buildRows(product, variants, template): string[][]` (header row + one row per variant, values formatted per column type)
  - `toCSV(rows: string[][]): string` (RFC 4180)
  - `toXLSX(rows: string[][]): Buffer` (first row = headers)
  - `generateFile(product, variants, template): { rows; csv; xlsx }`

- [ ] **Step 1: Write the failing tests — `src/lib/engine/engine.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { validateForTemplate } from './validate'
import { buildRows } from './build-rows'
import { toCSV, toXLSX } from './serialize'
import { generateFile } from './index'
import * as XLSX from 'xlsx'

const product: StandardProduct = {
  title: 'Men Cotton T-Shirt',
  description: 'Soft 100% cotton tee',
  brand: 'MyBrand',
  hsn: '6109',
  gstRate: 5,
  categoryPath: "Clothing > Men's Wear > T-Shirts",
}
const variants: VariantInput[] = [
  { sku: 'TS-BLK-M', size: 'M', color: 'Black', mrp: 999, price: 599, stock: 10, weightGrams: 150 },
]

/*
 * Engine behavior: validation, one row per variant, exact CSV/XLSX output.
 */
describe('engine', () => {
  const template = getTemplate(Platform.FLIPKART, 'mens-tshirts')!

  it('validates complete product with no issues', () => {
    expect(validateForTemplate(product, variants, template)).toEqual([])
  })
  it('flags a missing required source (no description)', () => {
    const issues = validateForTemplate({ ...product, description: '' }, variants, template)
    expect(issues.some((i) => i.column === 'Product Description')).toBe(true)
  })
  it('builds header row + one row per variant with correct values', () => {
    const rows = buildRows(product, variants, template)
    expect(rows[0]).toEqual(template.columns.map((c) => c.name))
    expect(rows).toHaveLength(2)
    expect(rows[1]).toContain('TS-BLK-M')
    expect(rows[1]).toContain('599')
  })
  it('builds a row per variant', () => {
    const rows = buildRows(product, [...variants, { ...variants[0], sku: 'TS-BLK-L', size: 'L' }], template)
    expect(rows).toHaveLength(3)
  })
  it('CSV quotes commas, quotes, and newlines (RFC 4180)', () => {
    const csv = toCSV([['a', 'b'], ['x,y', 'say "hi"', 'line\nbreak']])
    expect(csv).toBe('a,b\r\n"x,y","say ""hi""","line\nbreak"\r\n')
  })
  it('XLSX round-trips with header row preserved', () => {
    const rows = buildRows(product, variants, template)
    const buf = toXLSX(rows)
    const wb = XLSX.read(buf, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    expect(data[0]).toEqual(template.columns.map((c) => c.name))
    expect(data).toHaveLength(2)
  })
  it('generateFile returns rows, csv, and xlsx', () => {
    const out = generateFile(product, variants, template)
    expect(out.csv).toContain('TS-BLK-M')
    expect(out.xlsx.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `pnpm test` — Expected: FAIL (modules missing).

- [ ] **Step 3: Create `src/lib/products/types.ts`**

```ts
/*
 * StandardProduct
 * Platform-neutral product fields used by every template.
 */
export interface StandardProduct {
  title: string
  description: string
  brand: string
  hsn: string
  gstRate: number
  categoryPath: string
}

/*
 * VariantInput
 * One sellable unit (SKU) of a product.
 */
export interface VariantInput {
  sku: string
  size: string
  color: string
  mrp: number
  price: number
  stock: number
  weightGrams: number
}
```

- [ ] **Step 4: Create `src/lib/engine/validate.ts`**

```ts
import type { PlatformTemplate } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'

/*
 * ValidationIssue
 * One missing/blank required field.
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
 * validateForTemplate
 * @returns issues for required columns whose source value is blank
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
  return issues
}
```

- [ ] **Step 5: Create `src/lib/engine/build-rows.ts`**

```ts
import type { PlatformTemplate } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { fieldValue } from './validate'

/*
 * buildRows
 * Renders the header row plus one row per variant.
 * Values are formatted per the column type (numbers stay numeric).
 * @returns string[][] — first row is headers
 */
export function buildRows(
  product: StandardProduct,
  variants: VariantInput[],
  template: PlatformTemplate,
): string[][] {
  const header = template.columns.map((c) => c.name)
  const rows = variants.map((variant) =>
    template.columns.map((c) => {
      const raw = fieldValue(c.source, product, variant, c.default)
      if (c.type === 'number' || c.type === 'int') return String(Number(raw) || 0)
      return raw
    }),
  )
  return [header, ...rows]
}
```

- [ ] **Step 6: Create `src/lib/engine/serialize.ts`**

```ts
import * as XLSX from 'xlsx'

/*
 * toCSV
 * RFC 4180 CSV: quote fields containing comma, quote, CR, or LF.
 */
export function toCSV(rows: string[][]): string {
  const esc = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n'
}

/*
 * toXLSX
 * Writes rows (header + data) to an xlsx buffer.
 */
export function toXLSX(rows: string[][]): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
```

- [ ] **Step 7: Create `src/lib/engine/index.ts`**

```ts
import type { PlatformTemplate } from '@/lib/templates/types'
import type { StandardProduct, VariantInput } from '@/lib/products/types'
import { validateForTemplate, type ValidationIssue } from './validate'
import { buildRows } from './build-rows'
import { toCSV, toXLSX } from './serialize'

/*
 * GenerationResult
 * Everything a download needs.
 */
export interface GenerationResult {
  rows: string[][]
  csv: string
  xlsx: Buffer
  issues: ValidationIssue[]
}

/*
 * generateFile
 * Validate then render then serialize.
 * @returns rows, csv, xlsx, and any validation issues
 */
export function generateFile(
  product: StandardProduct,
  variants: VariantInput[],
  template: PlatformTemplate,
): GenerationResult {
  const issues = validateForTemplate(product, variants, template)
  const rows = buildRows(product, variants, template)
  return { rows, csv: toCSV(rows), xlsx: toXLSX(rows), issues }
}
```

- [ ] **Step 8: Run tests, expect PASS**

Run: `pnpm test` — Expected: 6 passed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add generator engine with validation, CSV and XLSX serialization"
```

---

### Task 6: Dynamic product form (platform → category → fields)

**Files:**
- Create: `src/lib/forms/product-form-schema.ts`
- Create: `src/components/forms/product-form.tsx`
- Create: `src/lib/actions/create-product.ts`
- Create: `src/app/dashboard/new/page.tsx`
- Create: `src/app/dashboard/layout.tsx`
- Test: `src/lib/forms/product-form-schema.test.ts`

**Interfaces:**
- Consumes: `getTemplatesForPlatform`, `getTemplate` (Task 4); `db`, `Category`, `CategoryPlatformMapping` (Task 2).
- Produces: `createProductAction(data)` server action `{ ok: true; productId } | { error }`; route `/dashboard/new`; `deriveFormSchema(template)` → zod schema.

- [ ] **Step 1: Write the failing test — `src/lib/forms/product-form-schema.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { deriveFormSchema } from './product-form-schema'

/*
 * The dynamic form schema mirrors the template's required columns.
 */
describe('product form schema', () => {
  const template = getTemplate(Platform.FLIPKART, 'mens-tshirts')!

  it('accepts a complete product', () => {
    const schema = deriveFormSchema(template)
    const parsed = schema.safeParse({
      title: 'Tee', description: 'desc', brand: 'B', hsn: '6109', gstRate: '5',
      sku: 'S1', size: 'M', color: 'Black', mrp: '999', price: '599', stock: '10', weightGrams: '150',
    })
    expect(parsed.success).toBe(true)
  })
  it('rejects a missing required field', () => {
    const schema = deriveFormSchema(template)
    const parsed = schema.safeParse({
      title: 'Tee', description: '', brand: 'B', hsn: '6109', gstRate: '5',
      sku: 'S1', size: 'M', color: 'Black', mrp: '999', price: '599', stock: '10', weightGrams: '150',
    })
    expect(parsed.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm test` — Expected: FAIL.

- [ ] **Step 3: Create `src/lib/forms/product-form-schema.ts`**

```ts
import { z } from 'zod'
import type { PlatformTemplate } from '@/lib/templates/types'

/*
 * deriveFormSchema
 * Builds a zod schema from a template: every required column becomes a
 * required field; numeric columns validate as numbers (string input).
 */
export function deriveFormSchema(template: PlatformTemplate) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const c of template.columns) {
    const isNum = c.type === 'number' || c.type === 'int'
    const base = isNum ? z.coerce.number() : z.string()
    shape[c.name] = c.required ? base : base.optional().or(z.literal(''))
  }
  return z.object(shape)
}

/*
 * ProductFormData
 * The form payload shape (string values from inputs).
 */
export type ProductFormData = Record<string, string>
```

- [ ] **Step 4: Create `src/lib/actions/create-product.ts`**

```ts
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { deriveFormSchema } from '@/lib/forms/product-form-schema'

/*
 * createProductAction
 * Validates the dynamic form against the template, saves product + variant.
 * @param data - form payload
 * @returns { ok: true; productId } or { error }
 */
export async function createProductAction(data: unknown) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const payload = data as Record<string, unknown>
  const platform = payload.platform as Platform
  const categorySlug = payload.categorySlug as string
  const template = getTemplate(platform, categorySlug)
  if (!template) return { error: 'Template not found' }
  const parsed = deriveFormSchema(template).safeParse(payload)
  if (!parsed.success) return { error: 'Please fill all required fields' }
  const v = parsed.data as Record<string, string>
  const category = await db.category.findUnique({ where: { slug: categorySlug } })
  const product = await db.product.create({
    data: {
      userId: session.user.id as string,
      title: v['Product Title'] || v['item_name'] || v['Product Name'] || '',
      description: v['Product Description'] || '',
      brand: v['Brand'] || v['brand_name'] || '',
      categorySlug,
      hsn: v['HSN'] || v['HSN_Code'] || category?.defaultHsn ?? '6109',
      gstRate: Number(v['Tax Code'] || v['GST %'] || v['Product_Tax_Code'] || category?.defaultGstRate ?? 5),
      variants: {
        create: {
          sku: v['Seller SKU'] || v['Style Code'] || v['part_number'] || '',
          size: v['Size'] || v['size_name'] || '',
          color: v['Color'] || v['color_name'] || '',
          mrp: Number(v['MRP'] || 0),
          price: Number(v['Selling Price'] || v['standard_price'] || 0),
          stock: Number(v['Stock'] || v['quantity'] || 0),
          weightGrams: Number(v['Weight (g)'] || v['item_weight'] || 0),
        },
      },
    },
  })
  return { ok: true as const, productId: product.id }
}
```

- [ ] **Step 5: Create `src/components/forms/product-form.tsx`**

Client component: step 1 platform select (3 platforms), step 2 category select (from mappings), step 3 dynamic fields from `template.columns` (text/number inputs, required marked), submit → `createProductAction` → redirect to `/dashboard/products/[id]`.

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Platform } from '@/constants/enums'
import { getTemplatesForPlatform, getTemplate } from '@/data/templates'
import { deriveFormSchema, type ProductFormData } from '@/lib/forms/product-form-schema'
import { createProductAction } from '@/lib/actions/create-product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

/*
 * ProductForm
 * Wizard: platform → category → dynamic fields for the chosen template.
 */
export function ProductForm() {
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [categorySlug, setCategorySlug] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [rows, setRows] = useState(1)

  const template = useMemo(
    () => (platform && categorySlug ? getTemplate(platform, categorySlug) : null),
    [platform, categorySlug],
  )
  const templateCategories = useMemo(
    () => (platform ? getTemplatesForPlatform(platform).map((t) => t.categorySlug) : []),
    [platform],
  )
  const schema = useMemo(() => (template ? deriveFormSchema(template) : null), [template])
  const form = useForm<ProductFormData>({ resolver: schema ? zodResolver(schema) : undefined, defaultValues: {} })

  async function onSubmit(values: ProductFormData) {
    if (!template) return
    setPending(true)
    setError('')
    for (let i = 0; i < rows; i++) {
      const res = await createProductAction({ ...values, platform, categorySlug, row: i })
      if (!('ok' in res)) { setError(res.error); setPending(false); return }
      router.push('/dashboard')
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Card className="rounded-xl border border-brand-border bg-white p-6">
        <h2 className="font-semibold text-xl">1. Platform</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {Object.values(Platform).map((p) => (
            <Button key={p} type="button" variant={platform === p ? 'primary' : 'outline'} onClick={() => { setPlatform(p); setCategorySlug('') }}>
              {p}
            </Button>
          ))}
        </div>
      </Card>
      {platform && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <h2 className="font-semibold text-xl">2. Category</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {templateCategories.map((slug) => (
              <Button key={slug} type="button" variant={categorySlug === slug ? 'primary' : 'outline'} onClick={() => setCategorySlug(slug)}>
                {slug.replace(/-/g, ' ')}
              </Button>
            ))}
          </div>
        </Card>
      )}
      {template && (
        <Card className="rounded-xl border border-brand-border bg-white p-6">
          <h2 className="font-semibold text-xl">3. Product details</h2>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {template.columns.map((c) => (
              <div key={c.name} className="space-y-1">
                <Label htmlFor={c.name}>{c.name}{c.required && <span className="text-brand-danger"> *</span>}</Label>
                <Input id={c.name} type={c.type === 'number' || c.type === 'int' ? 'number' : 'text'} step="any" {...form.register(c.name)} />
              </div>
            ))}
            {error && <p className="text-sm text-brand-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Saving…' : 'Save product'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/app/dashboard/layout.tsx`**

Server component: header with "Cake" brand, nav links (Products → `/dashboard`, History → `/dashboard/history`), sign-out button (form calling `signOut` from `@/lib/auth`):

```tsx
import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

/*
 * DashboardLayout
 * Auth-gated shell with brand nav for all dashboard pages.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 border-b border-brand-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-bold text-xl tracking-tight">Cake</Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/dashboard">Products</Link>
            <Link href="/dashboard/history">History</Link>
            <span className="text-brand-foreground-muted">{session?.user?.email}</span>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
              <Button type="submit" variant="ghost">Sign out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/dashboard/new/page.tsx`**

```tsx
import { ProductForm } from '@/components/forms/product-form'

/*
 * NewProductPage
 * Hosts the platform → category → fields wizard.
 */
export default function NewProductPage() {
  return <ProductForm />
}
```

- [ ] **Step 8: Run tests, expect PASS; manual verify**

Run: `pnpm test` — Expected: PASS.
Run: `pnpm dev` — `/dashboard/new`: pick Flipkart → mens-tshirts → fill form → Save → redirected to `/dashboard`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add dynamic product form wizard and create-product action"
```

---

### Task 7: Dashboard, generate + download, history

**Files:**
- Create: `src/lib/actions/generate-file.ts`
- Create: `src/app/api/generate/[id]/route.ts`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/history/page.tsx`
- Create: `src/app/dashboard/products/[id]/page.tsx`
- Create: `src/components/dashboard/generate-buttons.tsx`

**Interfaces:**
- Consumes: `generateFile` (Task 5), `getTemplate` (Task 4), `db`.
- Produces: `generateFileAction(productId, platform, format)` → `{ downloadUrl }`; GET `/api/generate/[id]` streams the file; `/dashboard` product list; `/dashboard/history`; `/dashboard/products/[id]` detail + generate buttons.

- [ ] **Step 1: Create `src/lib/actions/generate-file.ts`**

```ts
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { getTemplate } from '@/data/templates'
import { generateFile } from '@/lib/engine'

/*
 * generateFileAction
 * Validates and renders the platform file, records a Generation row,
 * and returns a download URL (file re-rendered on demand by the route).
 * ponytail: no file storage yet — deterministic re-render from product data.
 */
export async function generateFileAction(productId: string, platform: Platform, format: 'csv' | 'xlsx') {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const product = await db.product.findFirst({ where: { id: productId, userId: session.user.id as string }, include: { variants: true } })
  if (!product) return { error: 'Product not found' }
  const template = getTemplate(platform, product.categorySlug)
  if (!template) return { error: 'No template for this platform' }
  const result = generateFile(
    {
      title: product.title,
      description: product.description,
      brand: product.brand,
      hsn: product.hsn,
      gstRate: product.gstRate,
      categoryPath: product.categorySlug, // replaced below with real path
    },
    product.variants.map((v) => ({
      sku: v.sku, size: v.size, color: v.color, mrp: v.mrp, price: v.price, stock: v.stock, weightGrams: v.weightGrams,
    })),
    template,
  )
  if (result.issues.length > 0) return { error: result.issues[0].message }
  const fileName = `${platform.toLowerCase()}-${product.categorySlug}-${format}.csv`
  const generation = await db.generation.create({
    data: {
      userId: session.user.id as string,
      productId,
      platform,
      categorySlug: product.categorySlug,
      templateVersion: template.version,
      fileName,
    },
  })
  return { downloadUrl: `/api/generate/${generation.id}?format=${format}` }
}
```

- [ ] **Step 2: Create `src/app/api/generate/[id]/route.ts`**

```ts
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTemplate } from '@/data/templates'
import { generateFile } from '@/lib/engine'

/*
 * GET /api/generate/[id]
 * Streams the generated file as an attachment. Re-renders from the
 * product + template version recorded on the Generation row.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { id } = await params
  const format = new URL(req.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv'
  const generation = await db.generation.findFirst({ where: { id, userId: session.user.id as string } })
  if (!generation) return new Response('Not found', { status: 404 })
  const product = await db.product.findFirst({ where: { id: generation.productId }, include: { variants: true } })
  if (!product) return new Response('Not found', { status: 404 })
  const template = getTemplate(generation.platform as Platform, generation.categorySlug)
  if (!template) return new Response('Not found', { status: 404 })
  const result = generateFile(
    { title: product.title, description: product.description, brand: product.brand, hsn: product.hsn, gstRate: product.gstRate, categoryPath: generation.categorySlug },
    product.variants.map((v) => ({ sku: v.sku, size: v.size, color: v.color, mrp: v.mrp, price: v.price, stock: v.stock, weightGrams: v.weightGrams })),
    template,
  )
  const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
  const body = format === 'xlsx' ? result.xlsx : Buffer.from(result.csv, 'utf-8')
  const ext = format === 'xlsx' ? 'xlsx' : 'csv'
  return new Response(body, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${product.title.replace(/[^a-z0-9]+/gi, '-')}-${ext}"`,
    },
  })
}
```

(Add `import { Platform } from '@/constants/enums'` to the route — `generation.platform` is a string; keep the cast.)

- [ ] **Step 3: Create `src/components/dashboard/generate-buttons.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Platform } from '@/constants/enums'
import { generateFileAction } from '@/lib/actions/generate-file'
import { Button } from '@/components/ui/button'

/*
 * GenerateButtons
 * One download button per platform, CSV default; link opens the file URL.
 */
export function GenerateButtons({ productId, platforms }: { productId: string; platforms: Platform[] }) {
  const [pending, setPending] = useState<Platform | ''>('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  async function run(p: Platform) {
    setPending(p); setError(''); setUrl('')
    const res = await generateFileAction(productId, p, 'csv')
    if (!('downloadUrl' in res)) { setError(res.error); setPending(''); return }
    setUrl(res.downloadUrl); setPending('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <Button key={p} variant="outline" size="sm" disabled={pending !== ''} onClick={() => run(p)}>
            {pending === p ? 'Generating…' : `Generate ${p}`}
          </Button>
        ))}
      </div>
      {url && <a className="text-sm text-brand-primary underline" href={url}>Download file</a>}
      {error && <p className="text-sm text-brand-danger">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/dashboard/page.tsx`**

Server component: list products with links, generate buttons per platform, and "Add product" CTA:

```tsx
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { GenerateButtons } from '@/components/dashboard/generate-buttons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/*
 * DashboardPage
 * Product list with per-platform generate actions.
 */
export default async function DashboardPage() {
  const session = await auth()
  const products = await db.product.findMany({
    where: { userId: session?.user?.id as string },
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
  })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl tracking-tight">Products</h1>
        <Link href="/dashboard/new"><Button>Add product</Button></Link>
      </div>
      {products.length === 0 && <p className="text-brand-foreground-muted">No products yet — add your first one.</p>}
      {products.map((p) => (
        <Card key={p.id} className="rounded-xl border border-brand-border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link href={`/dashboard/products/${p.id}`} className="font-semibold text-xl hover:underline">{p.title}</Link>
              <p className="text-sm text-brand-foreground-muted">{p.brand} · {p.variants.length} variant(s) · {p.categorySlug}</p>
            </div>
            <GenerateButtons productId={p.id} platforms={[Platform.FLIPKART, Platform.MYNTRA, Platform.AMAZON]} />
          </div>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/app/dashboard/history/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'  // ponytail: date-fns per CLAUDE.md

/*
 * HistoryPage
 * Table of generated files with download links.
 */
export default async function HistoryPage() {
  const session = await auth()
  const generations = await db.generation.findMany({
    where: { userId: session?.user?.id as string },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  })
  return (
    <div className="space-y-6">
      <h1 className="font-bold text-3xl tracking-tight">Generation history</h1>
      {generations.length === 0 && <p className="text-brand-foreground-muted">No files generated yet.</p>}
      <div className="overflow-x-auto rounded-xl border border-brand-border">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-left font-medium">Platform</th>
              <th className="px-4 py-3 text-left font-medium">Version</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">File</th>
            </tr>
          </thead>
          <tbody>
            {generations.map((g) => (
              <tr key={g.id} className="border-t border-brand-border">
                <td className="px-4 py-3">{g.product.title}</td>
                <td className="px-4 py-3">{g.platform}</td>
                <td className="px-4 py-3">{g.templateVersion}</td>
                <td className="px-4 py-3">{format(g.createdAt, 'MMM d, yyyy HH:mm')}</td>
                <td className="px-4 py-3"><a className="text-brand-primary underline" href={`/api/generate/${g.id}?format=csv`}>{g.fileName}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/app/dashboard/products/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'
import { GenerateButtons } from '@/components/dashboard/generate-buttons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/*
 * ProductDetailPage
 * Full product view with variants table and generate actions.
 */
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  const product = await db.product.findFirst({ where: { id, userId: session?.user?.id as string }, include: { variants: true } })
  if (!product) notFound()
  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-brand-foreground-muted hover:underline">← Products</Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">{product.title}</h1>
          <p className="mt-1 text-brand-foreground-muted">{product.description}</p>
          <p className="mt-1 text-sm text-brand-foreground-muted">Brand: {product.brand} · HSN {product.hsn} · GST {product.gstRate}%</p>
        </div>
        <GenerateButtons productId={product.id} platforms={[Platform.FLIPKART, Platform.MYNTRA, Platform.AMAZON]} />
      </div>
      <Card className="rounded-xl border border-brand-border bg-white p-6">
        <h2 className="font-semibold text-xl">Variants</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="bg-brand-surface">
            <tr>
              {['SKU', 'Size', 'Color', 'MRP', 'Price', 'Stock', 'Weight (g)'].map((h) => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {product.variants.map((v) => (
              <tr key={v.id} className="border-t border-brand-border">
                <td className="px-4 py-2">{v.sku}</td><td className="px-4 py-2">{v.size}</td>
                <td className="px-4 py-2">{v.color}</td><td className="px-4 py-2">₹{v.mrp}</td>
                <td className="px-4 py-2">₹{v.price}</td><td className="px-4 py-2">{v.stock}</td>
                <td className="px-4 py-2">{v.weightGrams}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Install date-fns and verify**

```bash
pnpm add date-fns
pnpm test && pnpm build
```

Run: `pnpm test` — PASS. Run: `pnpm dev` — full loop: signup → add product (Flipkart) → dashboard → Generate FLIPKART → Download file → open CSV in a spreadsheet; History shows the row.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard, generate/download flow, and history"
```

---

## Self-Review Notes

- **Spec coverage:** PRD §5 workflow (signup w/ company → dashboard → platform → category → form → generate → history) = Tasks 3, 6, 7. PRD §6 India fields (GSTIN, HSN, MRP/price, weight, material-deferred) = Tasks 2, 3, 6. PRD §7 Phase 1 (3 platforms, engine, validation, history) = Tasks 4, 5, 7. PRD §9 data model = Task 2. PRD §10 testing = per-task vitest suites.
- **Deferred (documented in PRD):** images (blank column + user fills in portal), import wizard (Phase 2), rate limiting (Phase 3), file storage (re-render on demand), material/care attributes (Phase 2 templates).
- **Known limitation:** `generateFileAction` and the API route build the `categoryPath` from `categorySlug` rather than the seeded `Category.path` — improve in a later task by joining `CategoryPlatformMapping.platformCategoryPath`. Acceptable for v1; the engine already consumes the path value.
