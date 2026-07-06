import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const logs = await prisma.issueLog.findMany({
      where: { issueId: parseInt(id) },
      include: {
        actor: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
