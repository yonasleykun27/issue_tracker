import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface CustomUser {
  id: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((session.user as CustomUser).id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        warningCount: true,
        statusReason: true,
        warningLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Warnings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch warning status' }, { status: 500 })
  }
}
