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

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(@GetUser('id') userId: number) {
    return this.notificationsService.listNotifications(userId);
  }

  @Patch()
  async updateNotifications(
    @GetUser('id') userId: number,
    @Body() body: any,
  ) {
    return this.notificationsService.updateNotifications(userId, body);
  }
}
