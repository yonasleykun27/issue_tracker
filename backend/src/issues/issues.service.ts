import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // GET /api/issues
  async listIssues(userId: number, role: string, scope?: string) {
    if (role === 'USER') {
      return this.prisma.issue.findMany({
        where: { reportedById: userId },
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: true, reportedBy: true, projectDivision: true },
      });
    } else if (role === 'ADMIN') {
      if (scope === 'all') {
        return this.prisma.issue.findMany({
          orderBy: { createdAt: 'desc' },
          include: { assignedTo: true, reportedBy: true, projectDivision: true },
        });
      } else {
        return this.prisma.issue.findMany({
          where: {
            OR: [
              { assignedAdminId: userId },
              {
                assignedAdminId: null,
                assignedToId: userId,
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
          include: { assignedTo: true, reportedBy: true, projectDivision: true },
        });
      }
    } else {
      // AGENT role
      return this.prisma.issue.findMany({
        where: { assignedToId: userId },
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: true, reportedBy: true, projectDivision: true },
      });
    }
  }

  // POST /api/issues
  async createIssue(userId: number, role: string, body: any) {
    const { title, description, priority, imageUrl, phone, address, projectDivisionId } = body;

    if (!title || !description) {
      throw new BadRequestException('Title and description are required');
    }

    if (!projectDivisionId) {
      throw new BadRequestException('Project is required');
    }

    let finalAssignedToId: number | null = null;
    let finalAssignedAdminId: number | null = null;

    if (role === 'ADMIN') {
      finalAssignedAdminId = userId;
      finalAssignedToId = body.assignedToId ? parseInt(body.assignedToId, 10) : userId;
    } else {
      // Round-Robin Assignment for active Admins (excluding ON_LEAVE, PENDING, BANNED)
      const activeAdmins = await this.prisma.user.findMany({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        orderBy: { id: 'asc' },
      });

      if (activeAdmins.length === 1) {
        finalAssignedToId = activeAdmins[0].id;
        finalAssignedAdminId = activeAdmins[0].id;
      } else if (activeAdmins.length > 1) {
        const lastAssignedIssue = await this.prisma.issue.findFirst({
          where: {
            assignedToId: {
              in: activeAdmins.map((a) => a.id),
            },
          },
          orderBy: { id: 'desc' },
        });

        if (lastAssignedIssue && lastAssignedIssue.assignedToId) {
          const lastIndex = activeAdmins.findIndex((a) => a.id === lastAssignedIssue.assignedToId);
          if (lastIndex !== -1) {
            const nextIndex = (lastIndex + 1) % activeAdmins.length;
            finalAssignedToId = activeAdmins[nextIndex].id;
            finalAssignedAdminId = activeAdmins[nextIndex].id;
          } else {
            finalAssignedToId = activeAdmins[0].id;
            finalAssignedAdminId = activeAdmins[0].id;
          }
        } else {
          finalAssignedToId = activeAdmins[0].id;
          finalAssignedAdminId = activeAdmins[0].id;
        }
      }
    }

    const issue = await this.prisma.issue.create({
      data: {
        title,
        description,
        status: 'OPEN',
        priority: priority || 'MEDIUM',
        imageUrl: imageUrl || null,
        phone: phone || null,
        address: address || null,
        projectDivisionId: projectDivisionId ? parseInt(projectDivisionId, 10) : null,
        reportedById: userId,
        assignedToId: finalAssignedToId,
        assignedAdminId: finalAssignedAdminId,
      },
      include: {
        projectDivision: true,
      },
    });

    // Log assignment
    await this.prisma.issueLog.create({
      data: {
        issueId: issue.id,
        actorId: userId,
        action: finalAssignedToId
          ? `Ticket reported and assigned to ${role === 'ADMIN' ? 'agent' : 'administrator'}`
          : `Ticket reported`,
      },
    }).catch(console.error);

    return issue;
  }

  // GET /api/issues/:id
  async getIssue(id: number, userId: number, role: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { assignedTo: true, reportedBy: true, projectDivision: true },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Standard employees (USER) can only view their own issues
    if (role === 'USER' && issue.reportedById !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    return issue;
  }

  // PATCH /api/issues/:id
  async updateIssue(id: number, userId: number, role: string, body: any) {
    const {
      title,
      description,
      status,
      priority,
      assignedToId,
      imageUrl,
      phone,
      address,
      rejectionReason,
      projectDivisionId,
    } = body;

    const existingIssue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { email: true, name: true } },
        assignedTo: { select: { id: true, role: true } },
      },
    });

    if (!existingIssue) {
      throw new NotFoundException('Issue not found');
    }

    if (existingIssue.status === 'RESOLVED' && role === 'ADMIN') {
      throw new BadRequestException('Cannot modify a resolved issue');
    }

    const isAssignedToAgent = !!(
      existingIssue.assignedToId && existingIssue.assignedTo?.role === 'AGENT'
    );

    // Status flow step-back prevention:
    if (status !== undefined && status !== existingIssue.status) {
      if (existingIssue.status === 'RESOLVED' || existingIssue.status === 'REJECTED') {
        throw new BadRequestException('Cannot change status of a resolved or rejected issue');
      }
      if (existingIssue.status === 'IN_PROGRESS' && status !== 'RESOLVED') {
        throw new BadRequestException('In-progress tickets can only be transitioned to RESOLVED');
      }
      if (existingIssue.status === 'OPEN' && status !== 'IN_PROGRESS' && status !== 'REJECTED') {
        throw new BadRequestException('Open tickets can only transition to IN_PROGRESS or REJECTED');
      }
    }

    // Role restrictions:
    if (role === 'USER') {
      if (existingIssue.reportedById !== userId) {
        throw new ForbiddenException('Forbidden');
      }
      if (existingIssue.status === 'RESOLVED' || existingIssue.status === 'REJECTED') {
        throw new BadRequestException('Cannot modify a closed or rejected issue');
      }
      if (isAssignedToAgent) {
        const tryingToChangeLockedField =
          (title !== undefined && title !== existingIssue.title) ||
          (description !== undefined && description !== existingIssue.description) ||
          (imageUrl !== undefined && imageUrl !== existingIssue.imageUrl) ||
          status !== undefined ||
          assignedToId !== undefined;
        if (tryingToChangeLockedField) {
          throw new BadRequestException(
            'Cannot modify title, description, or attachments once assigned to an agent',
          );
        }
      }
    } else if (role === 'AGENT') {
      if (existingIssue.assignedToId !== userId) {
        throw new ForbiddenException('Forbidden');
      }
      if (
        title !== undefined ||
        description !== undefined ||
        imageUrl !== undefined ||
        assignedToId !== undefined ||
        priority !== undefined
      ) {
        throw new BadRequestException('Agents can only modify status of their assigned tickets');
      }
      if (status !== undefined && status !== 'IN_PROGRESS' && status !== 'RESOLVED') {
        throw new BadRequestException('Agents can only transition status to IN_PROGRESS or RESOLVED');
      }
    } else if (role === 'ADMIN') {
      if (status !== undefined && status !== existingIssue.status && status !== 'REJECTED') {
        throw new BadRequestException('Administrators cannot change ticket status');
      }
    }

    // Build update data based on role
    const updateData: any = {};
    if (role === 'ADMIN') {
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (assignedToId !== undefined) {
        updateData.assignedToId = assignedToId ? Number(assignedToId) : null;
      }
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
      if (projectDivisionId !== undefined) {
        updateData.projectDivisionId = projectDivisionId ? Number(projectDivisionId) : null;
      }
    } else if (role === 'AGENT') {
      if (status !== undefined) updateData.status = status;
    } else {
      // USER role
      if (priority !== undefined) updateData.priority = priority;
      if (!isAssignedToAgent) {
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (projectDivisionId !== undefined) {
          updateData.projectDivisionId = projectDivisionId ? Number(projectDivisionId) : null;
        }
      }
    }

    const updatedIssue = await this.prisma.issue.update({
      where: { id },
      data: updateData,
    });

    // Build audit log entries
    const logEntries: { issueId: number; actorId: number; action: string }[] = [];

    if (updateData.status && updateData.status !== existingIssue.status) {
      logEntries.push({
        issueId: id,
        actorId: userId,
        action: `Status changed from ${existingIssue.status} to ${updateData.status}`,
      });
    }
    if (updateData.priority && updateData.priority !== existingIssue.priority) {
      logEntries.push({
        issueId: id,
        actorId: userId,
        action: `Priority changed from ${existingIssue.priority} to ${updateData.priority}`,
      });
    }
    if (updateData.title && updateData.title !== existingIssue.title) {
      logEntries.push({
        issueId: id,
        actorId: userId,
        action: `Title updated`,
      });
    }
    if (updateData.description && updateData.description !== existingIssue.description) {
      logEntries.push({
        issueId: id,
        actorId: userId,
        action: `Description updated`,
      });
    }
    if (
      updateData.assignedToId !== undefined &&
      updateData.assignedToId !== existingIssue.assignedToId
    ) {
      logEntries.push({
        issueId: id,
        actorId: userId,
        action: updateData.assignedToId ? `Ticket assigned to staff member` : `Ticket unassigned`,
      });
    }
    if (updateData.imageUrl !== undefined && updateData.imageUrl !== existingIssue.imageUrl) {
      logEntries.push({
        issueId: id,
        actorId: userId,
        action: updateData.imageUrl ? `Screenshot attachment updated` : `Screenshot attachment removed`,
      });
    }
    if (
      updateData.projectDivisionId !== undefined &&
      updateData.projectDivisionId !== existingIssue.projectDivisionId
    ) {
      logEntries.push({
        issueId: id,
        actorId: userId,
        action: `Project Division updated`,
      });
    }

    if (logEntries.length > 0) {
      this.prisma.issueLog.createMany({ data: logEntries }).catch(console.error);
    }

    // Send email notification for status changes
    const newStatus = updateData.status;
    if (newStatus && newStatus !== existingIssue.status && existingIssue.reportedBy?.email) {
      this.emailService
        .sendStatusChangeEmail({
          to: existingIssue.reportedBy.email,
          recipientName: existingIssue.reportedBy.name,
          issueId: id,
          issueTitle: existingIssue.title,
          newStatus,
        })
        .catch(console.error);
    }

    // Create database notifications
    if (updateData.assignedToId && updateData.assignedToId !== existingIssue.assignedToId) {
      await this.prisma.notification
        .create({
          data: {
            userId: updateData.assignedToId,
            title: 'New Ticket Assigned',
            message: `Ticket TKT-${String(updatedIssue.id).padStart(4, '0')} has been assigned to you.`,
          },
        })
        .catch(console.error);
    }

    if (newStatus && newStatus !== existingIssue.status) {
      const msg =
        newStatus === 'REJECTED'
          ? `Your ticket TKT-${String(updatedIssue.id).padStart(4, '0')} was rejected by the administrator: "${updateData.rejectionReason || 'No reason specified'}".`
          : `Your ticket TKT-${String(updatedIssue.id).padStart(4, '0')} status has been updated to ${newStatus.replace('_', ' ')}.`;

      await this.prisma.notification
        .create({
          data: {
            userId: existingIssue.reportedById,
            title: newStatus === 'REJECTED' ? 'Ticket Rejected' : 'Ticket Status Updated',
            message: msg,
          },
        })
        .catch(console.error);
    }

    return updatedIssue;
  }

  // DELETE /api/issues/:id
  async deleteIssue(id: number, userId: number, role: string) {
    const existingIssue = await this.prisma.issue.findUnique({
      where: { id },
      include: { assignedTo: true },
    });

    if (!existingIssue) {
      throw new NotFoundException('Issue not found');
    }

    const isAssigned = !!(
      existingIssue.assignedToId && existingIssue.assignedTo?.role === 'AGENT'
    );
    if (isAssigned && role !== 'ADMIN') {
      throw new BadRequestException('Deleting assigned reports is forbidden');
    }

    if (role !== 'ADMIN' && existingIssue.reportedById !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    await this.prisma.issue.delete({ where: { id } });
    return { message: 'Issue deleted successfully' };
  }

  // GET /api/issues/:id/logs
  async getIssueLogs(issueId: number) {
    return this.prisma.issueLog.findMany({
      where: { issueId },
      include: {
        actor: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // POST /api/issues/:id/approve
  async approveIssue(id: number, userId: number) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { name: true, email: true } },
      },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const activeAgents = await this.prisma.user.findMany({
      where: {
        role: 'AGENT',
        status: 'ACTIVE',
      },
      orderBy: { id: 'asc' },
    });

    if (activeAgents.length === 0) {
      throw new BadRequestException(
        'No active support agents are available at the moment to receive this ticket. Please set an agent status to ACTIVE first.',
      );
    }

    let assignedAgentId = activeAgents[0].id;

    if (activeAgents.length > 1) {
      const lastAssignedIssue = await this.prisma.issue.findFirst({
        where: {
          assignedToId: {
            in: activeAgents.map((a) => a.id),
          },
        },
        orderBy: { id: 'desc' },
      });

      if (lastAssignedIssue && lastAssignedIssue.assignedToId) {
        const lastIdx = activeAgents.findIndex((a) => a.id === lastAssignedIssue.assignedToId);
        if (lastIdx !== -1) {
          const nextIdx = (lastIdx + 1) % activeAgents.length;
          assignedAgentId = activeAgents[nextIdx].id;
        }
      }
    }

    const updatedIssue = await this.prisma.issue.update({
      where: { id },
      data: {
        status: 'OPEN',
        assignedToId: assignedAgentId,
        rejectionReason: null,
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
      },
    });

    await this.prisma.issueLog.create({
      data: {
        issueId: id,
        actorId: userId,
        action: `Ticket approved and automatically assigned to agent ${updatedIssue.assignedTo?.name}`,
      },
    }).catch(console.error);

    await this.prisma.notification
      .create({
        data: {
          userId: issue.reportedById,
          title: 'Ticket Approved',
          message: `Your ticket TKT-${String(id).padStart(4, '0')} has been approved and assigned to an agent.`,
        },
      })
      .catch(console.error);

    await this.prisma.notification
      .create({
        data: {
          userId: assignedAgentId,
          title: 'New Ticket Assignment',
          message: `Ticket TKT-${String(id).padStart(4, '0')} has been assigned to you.`,
        },
      })
      .catch(console.error);

    if (issue.reportedBy?.email) {
      this.emailService
        .sendStatusChangeEmail({
          to: issue.reportedBy.email,
          recipientName: issue.reportedBy.name,
          issueId: id,
          issueTitle: issue.title,
          newStatus: 'OPEN',
        })
        .catch(console.error);
    }

    if (updatedIssue.assignedTo?.email) {
      this.emailService
        .sendStatusChangeEmail({
          to: updatedIssue.assignedTo.email,
          recipientName: updatedIssue.assignedTo.name,
          issueId: id,
          issueTitle: issue.title,
          newStatus: 'OPEN',
        })
        .catch(console.error);
    }

    return updatedIssue;
  }

  // Upload to Cloudinary helper
  async uploadImage(fileBuffer: Buffer, mimeType: string) {
    const base64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    try {
      const result = await cloudinary.uploader.upload(base64, {
        folder: 'ethio-telecom-issues',
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      return { url: result.secure_url };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  // GET /api/admin/analytics
  async listAnalytics() {
    // Get last 14 days date range
    const days = 14;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - (days - 1));
    dateFrom.setHours(0, 0, 0, 0);

    const issues = await this.prisma.issue.findMany({
      where: {
        createdAt: { gte: dateFrom },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Build a map of date → { open, inProgress, resolved }
    const dateMap: Record<
      string,
      { date: string; open: number; inProgress: number; resolved: number }
    > = {};

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      dateMap[key] = { date: key, open: 0, inProgress: 0, resolved: 0 };
    }

    for (const issue of issues) {
      const key = issue.createdAt.toISOString().split('T')[0];
      if (!dateMap[key]) continue;
      if (issue.status === 'OPEN') dateMap[key].open++;
      else if (issue.status === 'IN_PROGRESS') dateMap[key].inProgress++;
      else if (issue.status === 'RESOLVED') dateMap[key].resolved++;
    }

    return Object.values(dateMap).map((d) => ({
      ...d,
      label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }
}

