import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface ExtendedUser {
  id: string
  role: string
  name?: string | null
  email?: string | null
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((session.user as ExtendedUser).id)
    const userRole = (session.user as ExtendedUser).role

    // Admins can pass ?scope=all to fetch all issues (for round-robin calculation)
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')

    let issues;
    if (userRole === 'USER') {
      // Standard Employees only see issues they reported
      issues = await prisma.issue.findMany({
        where: { reportedById: userId },
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: true, reportedBy: true }
      })
    } else if (userRole === 'ADMIN') {
      if (scope === 'all') {
        // Admin fetching all issues for round-robin calculation
        issues = await prisma.issue.findMany({
          orderBy: { createdAt: 'desc' },
          include: { assignedTo: true, reportedBy: true }
        })
      } else {
        // Admins default: see issues originally assigned to them (via round-robin)
        // Fallback to assignedToId if assignedAdminId is not yet set
        issues = await prisma.issue.findMany({
          where: {
            OR: [
              { assignedAdminId: userId },
              {
                assignedAdminId: null,
                assignedToId: userId
              }
            ]
          },
          orderBy: { createdAt: 'desc' },
          include: { assignedTo: true, reportedBy: true }
        })
      }
    } else {
      // Agents see only their assigned issues
      issues = await prisma.issue.findMany({
        where: { assignedToId: userId },
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: true, reportedBy: true }
      })
    }

    return NextResponse.json(issues)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database offline' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as ExtendedUser).role

    // Only standard employees (USER) can report issues
    if (userRole !== 'USER') {
      return NextResponse.json({ error: 'Only employees can report issues' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, priority, imageUrl, phone, address } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }
    if (!address) {
      return NextResponse.json({ error: 'Problem address is required' }, { status: 400 })
    }

    const userId = parseInt((session.user as ExtendedUser).id)

    // Round-Robin Assignment for active Admins (excluding ON_LEAVE, PENDING, BANNED)
    const activeAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      orderBy: {
        id: 'asc'
      }
    })

    let assignedToId: number | null = null
    if (activeAdmins.length === 1) {
      assignedToId = activeAdmins[0].id
    } else if (activeAdmins.length > 1) {
      // Find the last issue created that was assigned to one of the active admins
      const lastAssignedIssue = await prisma.issue.findFirst({
        where: {
          assignedToId: {
            in: activeAdmins.map(a => a.id)
          }
        },
        orderBy: {
          id: 'desc'
        }
      })

      if (lastAssignedIssue && lastAssignedIssue.assignedToId) {
        const lastIndex = activeAdmins.findIndex(a => a.id === lastAssignedIssue.assignedToId)
        if (lastIndex !== -1) {
          const nextIndex = (lastIndex + 1) % activeAdmins.length
          assignedToId = activeAdmins[nextIndex].id
        } else {
          assignedToId = activeAdmins[0].id
        }
      } else {
        assignedToId = activeAdmins[0].id
      }
    }

    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        status: 'OPEN',
        priority: priority || 'MEDIUM',
        imageUrl: imageUrl || null,
        phone: phone || null,
        address: address || null,
        reportedById: userId,
        assignedToId: assignedToId,
        assignedAdminId: assignedToId
      }
    })

    // Log the automatic assignment
    await prisma.issueLog.create({
      data: {
        issueId: issue.id,
        actorId: userId,
        action: assignedToId
          ? `Ticket reported and automatically assigned to administrator (Round-Robin)`
          : `Ticket reported`
      }
    }).catch(console.error)

    return NextResponse.json(issue)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
