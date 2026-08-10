import Link from 'next/link'
import { AuthForm } from '@/components/forms/auth-form'

/*
 * LoginPage
 * Credentials login — links to signup.
 */
export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-bold text-3xl tracking-tight">Welcome back</h1>
        <p className="text-sm text-brand-foreground-muted">Sign in to generate your marketplace files.</p>
      </div>
      <AuthForm mode="login" />
      <p className="text-center text-sm text-brand-foreground-muted">
        New to Cake?{' '}
        <Link href="/signup" className="font-medium text-brand-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}