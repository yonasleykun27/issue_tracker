import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from './auth.guard';

// Decorator to mark a route as public
export const Public = () => SetMetadata('isPublic', true);

// Decorator to restrict routes by role
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Decorator to get the current user context
export const GetUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
