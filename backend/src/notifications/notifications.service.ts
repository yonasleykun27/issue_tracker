import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // GET /api/notifications
  async listNotifications(userId: number) {
    try {
      return await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      throw new InternalServerErrorException('Failed to fetch notifications');
    }
  }

  // PATCH /api/notifications
  async updateNotifications(userId: number, body: any) {
    const { id } = body;
    try {
      if (id) {
        // Mark specific notification as read
        await this.prisma.notification.update({
          where: { id: parseInt(id, 10), userId },
          data: { isRead: true },
        });
      } else {
        // Mark all unread notifications for this user as read
        await this.prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to update notifications:', error);
      throw new InternalServerErrorException('Failed to update notifications');
    }
  }
}
