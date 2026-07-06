import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface CustomUser {
  role?: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as CustomUser)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get last 14 days date range
    const days = 14
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - (days - 1))
    dateFrom.setHours(0, 0, 0, 0)

    const issues = await prisma.issue.findMany({
      where: {
        createdAt: { gte: dateFrom }
      },
      select: {
        createdAt: true,
        status: true
      }
    })

    // Build a map of date → { open, inProgress, resolved }
    const dateMap: Record<string, { date: string; open: number; inProgress: number; resolved: number }> = {}

    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const key = d.toISOString().split('T')[0]
      dateMap[key] = { date: key, open: 0, inProgress: 0, resolved: 0 }
    }

    for (const issue of issues) {
      const key = issue.createdAt.toISOString().split('T')[0]
      if (!dateMap[key]) continue
      if (issue.status === 'OPEN') dateMap[key].open++
      else if (issue.status === 'IN_PROGRESS') dateMap[key].inProgress++
      else if (issue.status === 'RESOLVED') dateMap[key].resolved++
    }

    const result = Object.values(dateMap).map(d => ({
      ...d,
      // Format date as "Jul 5" for chart labels
      label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
