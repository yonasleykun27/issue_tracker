import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(_req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl

        // ── Public routes — accessible WITHOUT login ──
        const publicPaths = [
          '/auth/signin',
          '/auth/signup',
          '/auth/forgot-password',
          '/auth/reset-password',
        ]

        const isPublic = publicPaths.some(
          (p) => pathname === p || pathname.startsWith(p + '?')
        )

        if (isPublic) return true

        // ── Root "/" — always show landing page, no redirect ──
        if (pathname === '/') return true

        // ── All other routes require a valid session ──
        return !!token && token.status !== 'BANNED'
      }
    }
  }
)

// Protect these routes — require login
export const config = {
  matcher: [
    '/issues/:path*',
    '/profile/:path*',
    '/approvals/:path*',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
  ]
}
