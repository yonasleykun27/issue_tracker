import NextAuth, { User, Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { PrismaAdapter } from '@next-auth/prisma-adapter'

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password')
        }

         const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

         if (!isValid) {
           throw new Error('Invalid email or password')
         }

         if (user.status === 'BANNED') {
           const reason = user.statusReason ? ` Reason: ${user.statusReason}` : ''
           throw new Error(`Your account has been banned by the administrator.${reason}`)
         }

         return {
           id: user.id.toString(),
           name: user.name,
           email: user.email,
           role: user.role,
           status: user.status,
           statusReason: user.statusReason
         }
       }
     })
   ],
   session: {
     strategy: 'jwt' as const
   },
   callbacks: {
     async jwt({ token, user }: { token: JWT; user?: User & { role?: string; status?: string; statusReason?: string | null } }) {
       if (user) {
         token.id = user.id
         token.role = user.role
         token.status = user.status
         token.statusReason = user.statusReason
       }
       return token
     },
     async session({ session, token }: { session: Session & { user?: { id?: string; role?: string; status?: string; statusReason?: string | null } }; token: JWT }) {
       if (token && session.user) {
         session.user.id = token.id as string
         session.user.role = token.role as string
         session.user.status = token.status as string
         session.user.statusReason = token.statusReason as string
       }
       return session
     }
   },
  pages: {
    signIn: '/auth/signin'
  },
  secret: process.env.NEXTAUTH_SECRET
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
