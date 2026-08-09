import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from './db'
import { verifyPassword } from './password'

/*
 * auth
 * NextAuth v5 with credentials provider (JWT sessions).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null
        const ok = await verifyPassword(String(credentials?.password ?? ''), user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
})