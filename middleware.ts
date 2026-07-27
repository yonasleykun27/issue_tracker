import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl

        // ── Public routes — always accessible without login ──
        const publicPaths = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/auth/forgot-password',
          '/auth/reset-password',
        ]

        const isPublic = publicPaths.some(
          (p) => pathname === p || pathname.startsWith(p + '?')
        )

        if (isPublic) return true   // no redirect, show the page

        // ── Protected routes — require a valid JWT token ──
        return !!token
      },
    },
  }
)

export const config = {
  // Run middleware on every route EXCEPT Next.js internals and static files
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|Et-logo.png|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.webp).*)',
  ],
}
