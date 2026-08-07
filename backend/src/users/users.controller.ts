import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Public, Roles, GetUser } from '../auth/auth.decorators';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Users / Auth')
@Controller()
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. PUBLIC ROUTES

  @Public()
  @Post('register/send-otp')
  @ApiOperation({ summary: 'Send email OTP verification code for registration' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  async sendOtp(@Body('email') email: string) {
    return this.usersService.sendOtp(email);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account with OTP & activation code' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        name: { type: 'string', example: 'Yonas Leykun' },
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'Password123!' },
        otp: { type: 'string', example: '123456' },
        activationCode: { type: 'string', example: 'TELE_EMPLOYEE' },
      },
    },
  })
  async register(@Body() body: any) {
    return this.usersService.register(body);
  }

  @Public()
  @Post('auth/forgot-password')
  @ApiOperation({ summary: 'Send password reset link via email' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  async forgotPassword(@Body('email') email: string) {
    return this.usersService.forgotPassword(email);
  }

  @Public()
  @Post('auth/reset-password')
  @ApiOperation({ summary: 'Reset user password with reset token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'password'],
      properties: {
        token: { type: 'string', example: 'your-reset-token-here' },
        password: { type: 'string', example: 'NewPassword123!' },
      },
    },
  })
  async resetPassword(@Body() body: any) {
    return this.usersService.resetPassword(body);
  }

  // 2. PROTECTED ROUTES (ANY AUTHENTICATED USER)

  @Post('profile/change-password')
  async changePassword(
    @GetUser('id') userId: number,
    @Body() body: any,
  ) {
    return this.usersService.changePassword(userId, body);
  }

  @Get('users')
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Get('users/agents')
  async listAgents() {
    return this.usersService.listAgents();
  }

  @Get('users/warnings')
  async getUserWarnings(@GetUser('id') userId: number) {
    return this.usersService.getUserWarnings(userId);
  }


  // 3. ADMIN ONLY ROUTES

  @Roles('ADMIN')
  @Get('admin/users')
  async listAdminUsers() {
    return this.usersService.listAdminUsers();
  }

  @Roles('ADMIN')
  @Patch('admin/users/:id')
  async updateAdminUser(
    @GetUser('id') callingUserId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
    @Body() body: any,
  ) {
    return this.usersService.updateAdminUser(callingUserId, targetUserId, body);
  }

  @Roles('ADMIN')
  @Delete('admin/users/:id')
  async deleteAdminUser(
    @GetUser('id') callingUserId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
  ) {
    return this.usersService.deleteAdminUser(callingUserId, targetUserId);
  }
}

