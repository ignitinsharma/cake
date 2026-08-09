import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/*
 * DashboardLayout
 * Auth guard for every dashboard route.
 * ponytail: server-side guard via auth(); no edge proxy — prisma/sqlite
 * can't bundle into the Next 16 proxy runtime. Fine: Node runtime is
 * where the data fetches happen anyway.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <>{children}</>
}