import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取装饰器定义的角色要求
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有角色要求，允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 从请求中提取用户信息（由 JWT strategy 附加）
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 验证用户已认证
    if (!user) {
      this.logger.warn('访问被拒绝: 用户未认证');
      throw new ForbiddenException('用户未认证');
    }

    // 验证用户角色存在
    if (user.role === undefined) {
      this.logger.warn(`访问被拒绝: 用户 ${user.id} 缺少角色信息`);
      throw new ForbiddenException('用户角色信息缺失');
    }

    // 验证用户角色
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(`访问被拒绝: 用户 ${user.id} 角色 ${user.role} 不满足要求 ${requiredRoles.join(', ')}`);
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
