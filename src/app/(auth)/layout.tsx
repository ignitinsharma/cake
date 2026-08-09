import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/*
 * AuthLayout
 * Wraps login/signup — already-authenticated users go straight to the dashboard.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user) redirect('/dashboard')
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-brand-border bg-white p-6">{children}</div>
    </main>
  )
}