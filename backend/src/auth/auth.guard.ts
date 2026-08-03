import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export class AuthenticatedUser {
  id: number;
  role: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the route is public
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    const request = context.switchToHttp().getRequest<Request>();

    const userIdStr = request.headers['x-user-id'];
    const userRoleStr = request.headers['x-user-role'];
    const userStatusStr = request.headers['x-user-status'];

    if (isPublic) {
      // If there is user context, attach it anyway in case public routes want to check it
      if (userIdStr && userRoleStr) {
        request.user = {
          id: parseInt(userIdStr as string, 10),
          role: userRoleStr as string,
          status: (userStatusStr as string) || 'ACTIVE',
        };
      }
      return true;
    }

    if (!userIdStr || !userRoleStr) {
      throw new UnauthorizedException('Missing authentication credentials');
    }

    const user: AuthenticatedUser = {
      id: parseInt(userIdStr as string, 10),
      role: userRoleStr as string,
      status: (userStatusStr as string) || 'ACTIVE',
    };

    if (user.status === 'BANNED') {
      throw new ForbiddenException('Your account has been banned by the administrator.');
    }

    request.user = user;

    // Check roles
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }
}
