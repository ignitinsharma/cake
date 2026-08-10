import Link from 'next/link'
import { AuthForm } from '@/components/forms/auth-form'

/*
 * Signup page
 * Collects company details once (PRD §6) alongside credentials.
 */
export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-bold text-3xl tracking-tight">Create your account</h1>
        <p className="text-sm text-brand-foreground-muted">
          We ask seller details once — never per product.
        </p>
      </div>
      <AuthForm mode="signup" />
      <p className="text-center text-sm text-brand-foreground-muted">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}