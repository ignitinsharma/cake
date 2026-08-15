# Deploying Cake (production)

Cake runs on **Next.js (Vercel) + Postgres (Neon)**. Local dev and tests run
against a local Postgres (`cake` / `cake_test`); production uses Neon.

Requires two free accounts: **Neon** (database) and **Vercel** (hosting).

## Step 1 — Create the Neon database

1. Sign in at https://neon.tech (GitHub/Google; free tier is enough)
2. **Create a project** → name `cake`, region **Singapore** (or Mumbai)
3. Project dashboard → **Connect** → copy the **pooled connection string**
   (starts with `postgresql://...-pooler...`)
4. Save it — you'll paste it in Step 3

## Step 2 — Push schema + seed the database

From this repo, with the Neon URL in `DATABASE_URL`:

```bash
DATABASE_URL="<your-neon-pooled-url>" pnpm db:push
DATABASE_URL="<your-neon-pooled-url>" pnpm db:seed
```

`db:push` creates all tables; `db:seed` loads the category taxonomy
(54 categories × 38 platform mappings). Both must succeed before deploying.

## Step 3 — Set Vercel environment variables

In the Vercel project: **Settings → Environment Variables** (or `vercel env add`).

| Variable | Value |
|---|---|
| `DATABASE_URL` | The Neon pooled connection string from Step 1 |
| `AUTH_SECRET` | Fresh secret — generate: `openssl rand -base64 32` |
| `AUTH_URL` | `https://<your-deployed-url>` (set after first deploy, or use your custom domain) |
| `AUTH_TRUST_HOST` | `true` (harmless on Vercel) |

Apply to **Production** (and Preview if you want preview deploys to work).

`AUTH_SECRET` is the only secret you must invent — never commit it or the
`.env` file (both gitignored).

## Step 4 — Deploy

1. Vercel dashboard → **Add New → Project** → import the `cake` repo
   (`ignitinsharma/cake`) — Next.js is auto-detected, no framework settings
   needed. The install runs `postinstall: prisma generate`, so the generated
   Prisma client is built fresh on every deploy (it is gitignored).
2. Env vars must exist **before** the first build: `next build` fails fast
   without `DATABASE_URL` (the db singleton requires it at module load).
3. **Deploy**. Each push to `main` triggers a new deployment.

## Step 5 — Custom domain (optional)

Vercel → project **Settings → Domains** → add your domain, then set the DNS
records Vercel shows you at your registrar. Once live, update `AUTH_URL` to
the custom domain.

## Verify

- [ ] `https://<url>/signup` loads; register a test account
- [ ] Create a product → generate a Flipkart CSV → download → opens in Excel/Sheets
- [ ] Generate a batch (select 2 products) → one file, both products
- [ ] History shows the generations; downloads re-render correctly
- [ ] Sign out / sign in works

## Recurring schema changes

Schema edits use `db push` (no migration history — fine at this scale):

```bash
DATABASE_URL="<your-neon-pooled-url>" pnpm db:push
```

New categories/mappings are picked up by re-running `pnpm db:seed`
(upserts; never duplicates).

## Dev vs prod databases

- **Local dev**: `.env` → `postgresql://postgres:postgres@localhost:5432/cake`
  (or any local Postgres; recreate with `pnpm db:push && pnpm db:seed`)
- **Tests**: `TEST_DATABASE_URL` (defaults to `DATABASE_URL`, tables live in
  the `test` schema — tests drop/recreate their own tables)
- **Prod**: the Neon URL — never put it in `.env`; keep it in Vercel only.
