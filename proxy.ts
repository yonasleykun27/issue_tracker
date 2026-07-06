import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(_req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && token.status !== 'BANNED'  // block if not logged in or banned
    }
  }
)

// Protect these routes — require login
export const config = {
  matcher: [
    '/',               // dashboard
    '/issues/:path*',  // all issue pages
  ]
}
