import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

/*
 * DashboardLayout
 * Auth guard + brand shell with nav for every dashboard page.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 border-b border-brand-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Cake
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/dashboard" className="text-brand-foreground hover:underline">
              Products
            </Link>
            <Link href="/dashboard/history" className="text-brand-foreground-muted hover:text-brand-foreground">
              History
            </Link>
            <span className="hidden text-brand-foreground-muted sm:inline">{session.user?.email}</span>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}