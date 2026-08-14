import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SettingsForm } from '@/components/forms/settings-form'

/*
 * SettingsPage
 * Company profile + platform seller IDs. Signup creates the company row, so
 * it should exist; render empty defaults if it somehow doesn't.
 */
export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const company = await db.company.findUnique({ where: { userId: session.user.id as string } })
  const initial = {
    businessName: company?.businessName ?? '',
    gstin: company?.gstin ?? '',
    brandName: company?.brandName ?? '',
    returnAddress: company?.returnAddress ?? '',
    warehousePin: company?.warehousePin ?? '',
    platformSellerIds: (company?.platformSellerIds ?? {}) as Record<string, string>,
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <SettingsForm initial={initial} />
    </div>
  )
}