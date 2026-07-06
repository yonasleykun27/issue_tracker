import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface CustomUser {
  id: string
  role: string
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const issue = await prisma.issue.findUnique({
      where: { id: parseInt(id) },
      include: { assignedTo: true, reportedBy: true }
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const user = session.user as CustomUser
    const userId = parseInt(user.id)
    const userRole = user.role

    // Standard employees (USER) can only view their own issues
    if (userRole === 'USER' && issue.reportedById !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(issue)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

interface UpdateIssueData {
  title?: string
  description?: string
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  assignedToId?: number | null
  imageUrl?: string | null
  phone?: string | null
  address?: string | null
  rejectionReason?: string | null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, status, priority, assignedToId, imageUrl, phone, address, rejectionReason } = body

    const user = session.user as CustomUser
    const userId = parseInt(user.id)
    const userRole = user.role

    const existingIssue = await prisma.issue.findUnique({
      where: { id: parseInt(id) },
      include: {
        reportedBy: { select: { email: true, name: true } },
        assignedTo: { select: { id: true, role: true } }
      }
    })

    if (!existingIssue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const isAssignedToAgent = !!(existingIssue.assignedToId && existingIssue.assignedTo?.role === 'AGENT')

    // Role restrictions:
    if (userRole === 'USER') {
      // Only the reporter can edit their own ticket
      if (existingIssue.reportedById !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (existingIssue.status === 'RESOLVED' || existingIssue.status === 'REJECTED') {
        return NextResponse.json({ error: 'Cannot modify a closed or rejected issue' }, { status: 400 })
      }
      // Once assigned to an agent, employees can ONLY change priority — block title/desc/image/status changes
      if (isAssignedToAgent) {
        const tryingToChangeLockedField = (
          (title !== undefined && title !== existingIssue.title) ||
          (description !== undefined && description !== existingIssue.description) ||
          (imageUrl !== undefined && imageUrl !== existingIssue.imageUrl) ||
          status !== undefined ||
          assignedToId !== undefined
        )
        if (tryingToChangeLockedField) {
          return NextResponse.json({ error: 'Cannot modify title, description, or attachments once assigned to an agent' }, { status: 400 })
        }
      }
    } else if (userRole === 'AGENT') {
      if (existingIssue.assignedToId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (title !== undefined || description !== undefined || imageUrl !== undefined || assignedToId !== undefined) {
        return NextResponse.json({ error: 'Agents can only modify status and priority of their assigned tickets' }, { status: 400 })
      }
    }

    // Build update data based on role
    const updateData: UpdateIssueData = {}
    if (userRole === 'ADMIN') {
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (status !== undefined) updateData.status = status
      if (priority !== undefined) updateData.priority = priority
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId ? Number(assignedToId) : null
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason
    } else if (userRole === 'AGENT') {
      if (status !== undefined) updateData.status = status
      if (priority !== undefined) updateData.priority = priority
    } else {
      // USER role — can always update priority on their own tickets
      if (priority !== undefined) updateData.priority = priority
      // Can edit these only while ticket is NOT assigned to an AGENT
      if (!isAssignedToAgent) {
        if (title !== undefined) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl
        if (phone !== undefined) updateData.phone = phone
        if (address !== undefined) updateData.address = address
      }
    }

    const updatedIssue = await prisma.issue.update({
      where: { id: parseInt(id) },
      data: updateData
    })

    // Build audit log entries for each changed field
    const logEntries: { issueId: number; actorId: number; action: string }[] = []

    if (updateData.status && updateData.status !== existingIssue.status) {
      logEntries.push({
        issueId: parseInt(id),
        actorId: userId,
        action: `Status changed from ${existingIssue.status} to ${updateData.status}`
      })
    }
    if (updateData.priority && updateData.priority !== existingIssue.priority) {
      logEntries.push({
        issueId: parseInt(id),
        actorId: userId,
        action: `Priority changed from ${existingIssue.priority} to ${updateData.priority}`
      })
    }
    if (updateData.title && updateData.title !== existingIssue.title) {
      logEntries.push({
        issueId: parseInt(id),
        actorId: userId,
        action: `Title updated`
      })
    }
    if (updateData.description && updateData.description !== existingIssue.description) {
      logEntries.push({
        issueId: parseInt(id),
        actorId: userId,
        action: `Description updated`
      })
    }
    if (updateData.assignedToId !== undefined && updateData.assignedToId !== existingIssue.assignedToId) {
      logEntries.push({
        issueId: parseInt(id),
        actorId: userId,
        action: updateData.assignedToId ? `Ticket assigned to staff member` : `Ticket unassigned`
      })
    }
    if (updateData.imageUrl !== undefined && updateData.imageUrl !== existingIssue.imageUrl) {
      logEntries.push({
        issueId: parseInt(id),
        actorId: userId,
        action: updateData.imageUrl ? `Screenshot attachment updated` : `Screenshot attachment removed`
      })
    }

    // Write all audit log entries (fire-and-forget, don't block response)
    if (logEntries.length > 0) {
      prisma.issueLog.createMany({ data: logEntries }).catch(console.error)
    }

    // Send email notification if status changed (fire-and-forget)
    const newStatus = updateData.status
    if (newStatus && newStatus !== existingIssue.status && existingIssue.reportedBy?.email) {
      import('@/app/lib/email').then(({ sendStatusChangeEmail }) => {
        sendStatusChangeEmail({
          to: existingIssue.reportedBy.email,
          recipientName: existingIssue.reportedBy.name,
          issueId: parseInt(id),
          issueTitle: existingIssue.title,
          newStatus
        }).catch(console.error)
      }).catch(console.error)
    }

    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
}


export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as CustomUser
    const userRole = user.role
    const userId = parseInt(user.id)

    const { id } = await params
    const issueId = parseInt(id)

    const existingIssue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { assignedTo: true }
    })

    if (!existingIssue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // When report is assigned to an AGENT, deleting is forbidden
    const isAssigned = !!(existingIssue.assignedToId && existingIssue.assignedTo?.role === 'AGENT')
    if (isAssigned) {
      return NextResponse.json({ error: 'Deleting assigned reports is forbidden' }, { status: 400 })
    }

    // Only Admin or the reporter themselves can delete the ticket
    if (userRole !== 'ADMIN' && existingIssue.reportedById !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.issue.delete({
      where: { id: issueId }
    })
    return NextResponse.json({ message: 'Issue deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
}
