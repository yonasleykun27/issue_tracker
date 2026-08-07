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
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiQuery, ApiConsumes, ApiSecurity } from '@nestjs/swagger';

@ApiTags('Incidents / Issues')
@ApiSecurity('x-user-id')
@ApiSecurity('x-user-role')
@Controller('issues')
@UseGuards(AuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  @ApiOperation({ summary: 'List incidents (filtered by user role & optional scope)' })
  @ApiQuery({ name: 'scope', required: false, example: 'all', description: 'Filter scope: all, unassigned, assigned, etc.' })
  async listIssues(
    @GetUser() user: AuthenticatedUser,
    @Query('scope') scope?: string,
  ) {
    return this.issuesService.listIssues(user.id, user.role, scope);
  }

  @Roles('USER', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a new incident report' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'description', 'projectDivisionId'],
      properties: {
        title: { type: 'string', example: 'Network outage in Bole area' },
        description: { type: 'string', example: 'Fiber link disconnected since 2 PM' },
        priority: { type: 'string', example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        projectDivisionId: { type: 'number', example: 1 },
        phone: { type: 'string', example: '+251 91 123 4567' },
        address: { type: 'string', example: 'Bole, Addis Ababa' },
        imageUrl: { type: 'string', example: 'https://res.cloudinary.com/demo/image.png' },
        assignedToId: { type: 'number', example: 2 },
      },
    },
  })
  async createIssue(
    @GetUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.issuesService.createIssue(user.id, user.role, body);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload an incident screenshot image (Max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PNG, JPG, WEBP or AVIF image file' },
      },
    },
  })
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
  @ApiOperation({ summary: 'Get single incident details by ID' })
  @ApiParam({ name: 'id', example: 1 })
  async getIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.issuesService.getIssue(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an incident report status, priority, or fields' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'IN_PROGRESS', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] },
        priority: { type: 'string', example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        title: { type: 'string', example: 'Updated title' },
        description: { type: 'string', example: 'Updated description' },
        rejectionReason: { type: 'string', example: 'Duplicate ticket' },
      },
    },
  })
  async updateIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.issuesService.updateIssue(id, user.id, user.role, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an incident report' })
  @ApiParam({ name: 'id', example: 1 })
  async deleteIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.issuesService.deleteIssue(id, user.id, user.role);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get audit activity logs for an incident' })
  @ApiParam({ name: 'id', example: 1 })
  async getIssueLogs(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.issuesService.getIssueLogs(id);
  }

  @Roles('ADMIN')
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve incident report & auto-assign to agent (Admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  async approveIssue(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.issuesService.approveIssue(id, userId);
  }

  @Roles('ADMIN')
  @Get('/admin/analytics')
  @ApiOperation({ summary: 'Get incident metrics & analytics breakdown (Admin only)' })
  async listAnalytics() {
    return this.issuesService.listAnalytics();
  }
}

