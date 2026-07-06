import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface CustomUser {
  role: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || (session.user as CustomUser).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        warningCount: true,
        statusReason: true,
        warningLogs: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { id: 'asc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
