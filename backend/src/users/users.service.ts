import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';
import { validatePassword } from '../common/validate-password';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // POST /api/register/send-otp
  async sendOtp(email: string) {
    if (!email) {
      throw new BadRequestException('Email address is required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.otpCode.upsert({
      where: { email },
      update: { code: otp, expiresAt },
      create: { email, code: otp, expiresAt },
    });

    await this.emailService.sendOtpEmail({ to: email, otp });
    return { message: 'Verification code sent to your email address' };
  }

  // POST /api/register
  async register(body: any) {
    const { name, email, password, otp } = body;

    if (!name || !email || !password) {
      throw new BadRequestException('Missing name, email, or password');
    }

    if (!otp) {
      throw new BadRequestException('Email verification code is required');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('An account with this email already exists');
    }

    const otpRecord = await this.prisma.otpCode.findUnique({ where: { email } });
    if (!otpRecord || otpRecord.code !== otp || otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification code. Please request a new one.');
    }

    await this.prisma.otpCode.delete({ where: { email } });

    const complexity = validatePassword(password);
    if (!complexity.valid) {
      throw new BadRequestException(
        'Password must have at least 8 characters, one uppercase, one lowercase, one number, and one symbol.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'USER',
        status: 'PENDING',
      },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  // POST /api/auth/forgot-password
  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If this email is registered, you will receive an OTP code.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.passwordReset.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt },
    });

    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (smtpEmail && smtpPass) {
      await this.emailService.sendPasswordResetEmail({ to: email, otp });
    } else {
      console.log(`\n🔑 [DEVELOPMENT RESET OTP] Email: ${email} | OTP: ${otp}\n`);
    }

    return { message: 'If this email is registered, you will receive an OTP code.' };
  }

  // POST /api/auth/reset-password
  async resetPassword(body: any) {
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      throw new BadRequestException('All fields are required');
    }

    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { email },
    });

    if (!resetRecord) {
      throw new BadRequestException('No password reset request found');
    }

    if (resetRecord.otp !== otp) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('OTP code has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.delete({
        where: { email },
      }),
    ]);

    return { message: 'Password reset successfully!' };
  }

  // POST /api/profile/change-password
  async changePassword(userId: number, body: any) {
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new BadRequestException('All fields are required');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const complexity = validatePassword(newPassword);
    if (!complexity.valid) {
      const issues = [
        !complexity.minLength && 'at least 8 characters',
        !complexity.hasUppercase && 'an uppercase letter',
        !complexity.hasLowercase && 'a lowercase letter',
        !complexity.hasNumber && 'a number',
        !complexity.hasSymbol && 'a special symbol',
      ].filter(Boolean);
      throw new BadRequestException(`Password must contain ${issues.join(', ')}.`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

  // GET /api/users
  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // GET /api/users/agents
  async listAgents() {
    return this.prisma.user.findMany({
      where: {
        role: 'AGENT',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // GET /api/users/warnings
  async getUserWarnings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        warningCount: true,
        statusReason: true,
        warningLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }


  // GET /api/admin/users
  async listAdminUsers() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        warningCount: true,
        statusReason: true,
        warningLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // PATCH /api/admin/users/:id
  async updateAdminUser(callingUserId: number, targetUserId: number, body: any) {
    const { role, status, statusReason, warningCount } = body;

    // Cannot modify oneself (prevent admin locking themselves out)
    if (targetUserId === callingUserId) {
      throw new BadRequestException('Cannot modify your own account status');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role === 'ADMIN') {
      if (status !== undefined && status !== 'ACTIVE' && status !== 'ON_LEAVE') {
        throw new BadRequestException('Cannot warn or ban another administrator');
      }
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (warningCount !== undefined) updateData.warningCount = Number(warningCount);
    if (statusReason !== undefined) updateData.statusReason = statusReason || null;

    if (status === 'WARNED' && statusReason) {
      await this.prisma.warningHistory.create({
        data: {
          userId: targetUserId,
          reason: statusReason,
        },
      });
      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Account Warning Issued',
          message: `An administrator issued a warning to your account: "${statusReason}".`,
        },
      }).catch(console.error);
    } else if (status === 'BANNED') {
      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Account Suspended (Banned)',
          message: `Your account status has been set to BANNED due to: "${statusReason || 'Policy violations'}".`,
        },
      }).catch(console.error);
    } else if (status && status !== targetUser.status) {
      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Account Status Update',
          message: `Your account status has been updated to ${status.replace('_', ' ')}.`,
        },
      }).catch(console.error);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        warningCount: true,
        statusReason: true,
      },
    });

    return updatedUser;
  }

  // DELETE /api/admin/users/:id
  async deleteAdminUser(callingUserId: number, targetUserId: number) {
    if (targetUserId === callingUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Cascade delete user history and relations in transaction
    await this.prisma.$transaction(async (tx) => {
      const reportedIssues = await tx.issue.findMany({
        where: { reportedById: targetUserId },
        select: { id: true },
      });
      const reportedIssueIds = reportedIssues.map((i) => i.id);

      if (reportedIssueIds.length > 0) {
        await tx.issueLog.deleteMany({
          where: { issueId: { in: reportedIssueIds } },
        });
      }

      await tx.issueLog.deleteMany({
        where: { actorId: targetUserId },
      });

      if (reportedIssueIds.length > 0) {
        await tx.issue.deleteMany({
          where: { id: { in: reportedIssueIds } },
        });
      }

      await tx.issue.updateMany({
        where: { assignedToId: targetUserId },
        data: { assignedToId: null },
      });

      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    return { message: 'User deleted successfully' };
  }
}

