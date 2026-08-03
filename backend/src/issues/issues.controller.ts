import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IssuesService } from './issues.service';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { GetUser, Roles } from '../auth/auth.decorators';

@Controller('issues')
@UseGuards(AuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  async listIssues(
    @GetUser() user: AuthenticatedUser,
    @Query('scope') scope?: string,
  ) {
    return this.issuesService.listIssues(user.id, user.role, scope);
  }

  @Roles('USER', 'ADMIN')
  @Post()
  async createIssue(
    @GetUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.issuesService.createIssue(user.id, user.role, body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed (PNG, JPG, WEBP, AVIF)');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be under 5MB');
    }

    return this.issuesService.uploadImage(file.buffer, file.mimetype);
  }

  @Get(':id')
  async getIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.issuesService.getIssue(id, user.id, user.role);
  }

  @Patch(':id')
  async updateIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.issuesService.updateIssue(id, user.id, user.role, body);
  }

  @Delete(':id')
  async deleteIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.issuesService.deleteIssue(id, user.id, user.role);
  }

  @Get(':id/logs')
  async getIssueLogs(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.issuesService.getIssueLogs(id);
  }

  @Roles('ADMIN')
  @Post(':id/approve')
  async approveIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.issuesService.approveIssue(id, userId);
  }

  @Roles('ADMIN')
  @Get('/admin/analytics')
  async listAnalytics() {
    return this.issuesService.listAnalytics();
  }
}

