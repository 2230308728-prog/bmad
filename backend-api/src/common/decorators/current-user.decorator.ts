import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface CurrentUserType {
  id: number;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserType | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user || null;
  },
);
