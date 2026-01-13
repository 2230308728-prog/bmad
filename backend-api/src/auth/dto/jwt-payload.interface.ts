import { Role } from '@prisma/client';

/**
 * JWT 访问令牌 Payload 结构
 *
 * 访问令牌包含用户ID、角色和令牌类型
 * 用于 API 认证和授权
 */
export interface JwtPayload {
  sub: number; // 用户ID (subject)
  role: Role; // 用户角色: PARENT | ADMIN
  type: 'access'; // 令牌类型标识
  iat?: number; // issued at (JWT 自动添加)
  exp?: number; // expiration (JWT 自动添加)
}

/**
 * JWT 刷新令牌 Payload 结构
 *
 * 刷新令牌仅包含用户ID和令牌类型
 * 用于获取新的访问令牌
 */
export interface RefreshTokenPayload {
  sub: number; // 用户ID (subject)
  type: 'refresh'; // 令牌类型标识
  iat?: number; // issued at
  exp?: number; // expiration
}
