import { auth } from '@/lib/auth'

/*
 * DashboardPage (stub)
 * Full product list lands here in Task 7.
 */
export default async function DashboardPage() {
  const session = await auth()
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-bold text-3xl tracking-tight">Products</h1>
      <p className="mt-2 text-brand-foreground-muted">Hi {session?.user?.email} — dashboard coming right up.</p>
    </main>
  )
}