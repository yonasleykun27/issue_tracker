import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { GetUser } from '../auth/auth.decorators';
import { ApiTags, ApiOperation, ApiBody, ApiSecurity } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiSecurity('x-user-id')
@ApiSecurity('x-user-role')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch live notifications for current user' })
  async listNotifications(@GetUser('id') userId: number) {
    return this.notificationsService.listNotifications(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        markAllAsRead: { type: 'boolean', example: true },
        notificationId: { type: 'number', example: 1 },
      },
    },
  })
  async updateNotifications(
    @GetUser('id') userId: number,
    @Body() body: any,
  ) {
    return this.notificationsService.updateNotifications(userId, body);
  }
}
