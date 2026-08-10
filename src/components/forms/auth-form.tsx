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
  type AuthFormValues = LoginInput & Partial<RegisterInput>
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(isSignup ? RegisterSchema : LoginSchema),
    defaultValues: {},
  })

  async function onSubmit(data: AuthFormValues) {
    setPending(true)
    setError('')
    if (isSignup) {
      const res = await registerAction(data)
      if (!('ok' in res)) {
        setError(res.error)
        setPending(false)
        return
      }
    }
    const s = await signIn('credentials', { email: data.email, password: data.password, redirect: false })
    if (s?.error) {
      setError('Invalid email or password')
      setPending(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const fields: Array<{ id: string; label: string; type?: string; placeholder?: string }> = isSignup
    ? [
        { id: 'businessName', label: 'Business name' },
        { id: 'gstin', label: 'GSTIN', placeholder: '15-character GSTIN' },
        { id: 'brandName', label: 'Brand name' },
        { id: 'returnAddress', label: 'Return address (optional)' },
        { id: 'warehousePin', label: 'Warehouse PIN (optional)' },
      ]
    : []

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register('email')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...form.register('password')} />
      </div>
      {fields.map((f) => (
        <div key={f.id} className="space-y-1">
          <Label htmlFor={f.id}>{f.label}</Label>
          <Input id={f.id} type="text" placeholder={f.placeholder} {...form.register(f.id as 'businessName')} />
        </div>
      ))}
      {error && <p className="text-sm text-brand-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  )
}