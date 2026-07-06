import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { UserStatus, Role } from '@prisma/client'

interface CustomUser {
  id: string
  role: string
}

interface UpdateUserData {
  status?: UserStatus
  warningCount?: number
  role?: Role
  statusReason?: string | null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || (session.user as CustomUser).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, warningCount, role, statusReason } = body

    const userId = parseInt(id)

    // Cannot modify oneself (prevent admin locking themselves out)
    if (userId === parseInt((session.user as CustomUser).id)) {
      return NextResponse.json({ error: 'Cannot modify your own account status' }, { status: 400 })
    }

    // Fetch the target user to ensure they are not an administrator
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role === 'ADMIN') {
      if (status !== 'ACTIVE' && status !== 'ON_LEAVE') {
        return NextResponse.json({ error: 'Cannot warn or ban another administrator' }, { status: 400 })
      }
    }

    const updateData: UpdateUserData = {}
    if (status !== undefined) updateData.status = status
    if (warningCount !== undefined) updateData.warningCount = Number(warningCount)
    if (role !== undefined) updateData.role = role
    if (statusReason !== undefined) updateData.statusReason = statusReason || null

    if (status === 'WARNED' && statusReason) {
      await prisma.warningHistory.create({
        data: {
          userId: userId,
          reason: statusReason
        }
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        warningCount: true,
        statusReason: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || (session.user as CustomUser).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)

    if (userId === parseInt((session.user as CustomUser).id)) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }



    // Cascade delete user history and relations in transaction
    await prisma.$transaction(async (tx) => {
      const reportedIssues = await tx.issue.findMany({
        where: { reportedById: userId },
        select: { id: true }
      })
      const reportedIssueIds = reportedIssues.map(i => i.id)

      if (reportedIssueIds.length > 0) {
        await tx.issueLog.deleteMany({
          where: { issueId: { in: reportedIssueIds } }
        })
      }

      await tx.issueLog.deleteMany({
        where: { actorId: userId }
      })

      if (reportedIssueIds.length > 0) {
        await tx.issue.deleteMany({
          where: { id: { in: reportedIssueIds } }
        })
      }

      await tx.issue.updateMany({
        where: { assignedToId: userId },
        data: { assignedToId: null }
      })

      await tx.user.delete({
        where: { id: userId }
      })
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
