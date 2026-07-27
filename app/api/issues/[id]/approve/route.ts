import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendStatusChangeEmail } from '@/app/lib/email'

interface CustomUser {
  id: string
  role: string
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || (session.user as CustomUser).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const issueId = parseInt(id)

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        reportedBy: { select: { name: true, email: true } }
      }
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Find active Agents (skip ON_LEAVE, PENDING, BANNED agents)
    const activeAgents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
        status: 'ACTIVE'
      },
      orderBy: { id: 'asc' }
    })

    if (activeAgents.length === 0) {
      return NextResponse.json({ error: 'No active support agents are available at the moment to receive this ticket. Please set an agent status to ACTIVE first.' }, { status: 400 })
    }

    let assignedAgentId = activeAgents[0].id

    // Round-robin selection among active agents
    if (activeAgents.length > 1) {
      const lastAssignedIssue = await prisma.issue.findFirst({
        where: {
          assignedToId: {
            in: activeAgents.map(a => a.id)
          }
        },
        orderBy: {
          id: 'desc'
        }
      })

      if (lastAssignedIssue && lastAssignedIssue.assignedToId) {
        const lastIdx = activeAgents.findIndex(a => a.id === lastAssignedIssue.assignedToId)
        if (lastIdx !== -1) {
          const nextIdx = (lastIdx + 1) % activeAgents.length
          assignedAgentId = activeAgents[nextIdx].id
        }
      }
    }

    const updatedIssue = await prisma.issue.update({
      where: { id: issueId },
      data: {
        status: 'OPEN',
        assignedToId: assignedAgentId,
        rejectionReason: null
      },
      include: {
        assignedTo: { select: { name: true, email: true } }
      }
    })

    // Log the assignment
    await prisma.issueLog.create({
      data: {
        issueId,
        actorId: parseInt((session.user as CustomUser).id),
        action: `Ticket approved and automatically assigned to agent ${updatedIssue.assignedTo?.name}`
      }
    }).catch(console.error)

    // Create DB notifications
    await prisma.notification.create({
      data: {
        userId: issue.reportedById,
        title: 'Ticket Approved',
        message: `Your ticket TKT-${String(issueId).padStart(4, '0')} has been approved and assigned to an agent.`
      }
    }).catch(console.error)

    await prisma.notification.create({
      data: {
        userId: assignedAgentId,
        title: 'New Ticket Assignment',
        message: `Ticket TKT-${String(issueId).padStart(4, '0')} has been assigned to you.`
      }
    }).catch(console.error)

    // Send Email to Reporter
    if (issue.reportedBy?.email) {
      sendStatusChangeEmail({
        to: issue.reportedBy.email,
        recipientName: issue.reportedBy.name,
        issueId,
        issueTitle: issue.title,
        newStatus: 'OPEN'
      }).catch(console.error)
    }

    // Send Email to Assigned Agent
    if (updatedIssue.assignedTo?.email) {
      sendStatusChangeEmail({
        to: updatedIssue.assignedTo.email,
        recipientName: updatedIssue.assignedTo.name,
        issueId,
        issueTitle: issue.title,
        newStatus: 'OPEN'
      }).catch(console.error)
    }

    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error('Failed to approve issue:', error)
    return NextResponse.json({ error: 'Failed to approve issue' }, { status: 500 })
  }
}
