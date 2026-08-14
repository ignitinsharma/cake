'use client'
import { useState } from 'react'
import { updateCompanyAction } from '@/lib/actions/update-company'
import { ALL_PLATFORMS } from '@/data/templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/*
 * SettingsForm
 * Editable company fields + one seller-ID input per platform.
 */
export function SettingsForm({ initial }: { initial: {
  businessName: string
  gstin: string
  brandName: string
  returnAddress: string
  warehousePin: string
  platformSellerIds: Record<string, string>
} }) {
  const [businessName, setBusinessName] = useState(initial.businessName)
  const [gstin, setGstin] = useState(initial.gstin)
  const [brandName, setBrandName] = useState(initial.brandName)
  const [returnAddress, setReturnAddress] = useState(initial.returnAddress)
  const [warehousePin, setWarehousePin] = useState(initial.warehousePin)
  const [sellerIds, setSellerIds] = useState<Record<string, string>>(
    Object.fromEntries(ALL_PLATFORMS.map((p) => [p, initial.platformSellerIds[p] ?? ''])),
  )
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit() {
    setPending(true)
    setError('')
    setSaved(false)
    const res = await updateCompanyAction({
      businessName,
      gstin,
      brandName,
      returnAddress,
      warehousePin,
      platformSellerIds: sellerIds,
    })
    setPending(false)
    if ('error' in res) setError(res.error)
    else setSaved(true)
  }

  return (
    <Card className="rounded-xl border border-brand-border bg-white p-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-semibold tracking-tight">Company details</CardTitle>
      </CardHeader>
      <CardContent className="mt-4 space-y-4 p-0">
        <div className="space-y-1">
          <Label htmlFor="settings-business">Business name</Label>
          <Input id="settings-business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="settings-gstin">GSTIN</Label>
            <Input id="settings-gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="settings-brand">Brand name</Label>
            <Input id="settings-brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="settings-return">Return address</Label>
          <Input id="settings-return" value={returnAddress} onChange={(e) => setReturnAddress(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="settings-pin">Warehouse PIN</Label>
          <Input id="settings-pin" value={warehousePin} onChange={(e) => setWarehousePin(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ALL_PLATFORMS.map((platform) => (
            <div key={platform} className="space-y-1">
              <Label htmlFor={`seller-${platform}`}>{platform} Seller ID</Label>
              <Input
                id={`seller-${platform}`}
                value={sellerIds[platform] ?? ''}
                onChange={(e) => setSellerIds((prev) => ({ ...prev, [platform]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        {saved && <p className="text-sm text-brand-primary">Saved</p>}
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </CardContent>
    </Card>
  )
}