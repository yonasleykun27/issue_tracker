import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const NESTJS_URL = 'http://localhost:4000'

const PUBLIC_API_PATHS = [
  '/api/register',
  '/api/register/send-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password'
]

async function handleProxy(request: Request) {
  try {
    const url = new URL(request.url)
    const apiPath = url.pathname // e.g. /api/issues or /api/admin/divisions
    const search = url.search // e.g. ?scope=all or ?tab=users

    // 1. Check if public route
    const isPublic = PUBLIC_API_PATHS.some(p => apiPath.startsWith(p))

    let userId: string | null = null
    let userRole: string | null = null
    let userStatus: string | null = null

    if (!isPublic) {
      // Fetch session
      const session = await getServerSession(authOptions)
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = (session.user as any).id
      userRole = (session.user as any).role
      userStatus = (session.user as any).status

      if (!userId || !userRole) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
    }

    // 2. Build NestJS target url
    // Next.js API paths start with /api, e.g. /api/issues.
    // NestJS also maps global prefix 'api', so a call to /api/issues goes to /api/issues on NestJS
    const targetUrl = `${NESTJS_URL}${apiPath}${search}`

    // 3. Prepare headers
    const headers = new Headers()
    
    // Copy select headers
    const headersToCopy = ['content-type', 'accept', 'authorization']
    headersToCopy.forEach(h => {
      const val = request.headers.get(h)
      if (val) headers.set(h, val)
    })

    // Inject user context headers if authenticated
    if (userId && userRole) {
      headers.set('x-user-id', userId)
      headers.set('x-user-role', userRole)
      headers.set('x-user-status', userStatus || 'ACTIVE')
    }

    // 4. Read body
    let body: ArrayBuffer | undefined = undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const arrayBuffer = await request.arrayBuffer().catch(() => null)
      if (arrayBuffer && arrayBuffer.byteLength > 0) {
        body = arrayBuffer
      }
    }

    // 5. Forward request to NestJS
    const targetResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // Prevents caching of requests
      cache: 'no-store'
    })

    // 6. Return response to client
    const responseBody = await targetResponse.arrayBuffer()
    
    const responseHeaders = new Headers()
    const contentType = targetResponse.headers.get('content-type')
    if (contentType) responseHeaders.set('content-type', contentType)

    return new NextResponse(responseBody, {
      status: targetResponse.status,
      statusText: targetResponse.statusText,
      headers: responseHeaders
    })
  } catch (error) {
    console.error('BFF Proxy Error:', error)
    return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 })
  }
}

export {
  handleProxy as GET,
  handleProxy as POST,
  handleProxy as PUT,
  handleProxy as PATCH,
  handleProxy as DELETE
}
