import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

/**
 * 用户详情响应 DTO
 * 完整用户信息（手机号不脱敏）
 */
export class UserDetailResponseDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiPropertyOptional({ description: '微信OpenID', example: 'oXabcdefg1234567890' })
  openid: string | null;

  @ApiPropertyOptional({ description: '管理员邮箱', example: 'admin@example.com' })
  email: string | null;

  @ApiPropertyOptional({ description: '用户昵称', example: '张小明' })
  nickname: string | null;

  @ApiPropertyOptional({ description: '头像URL', example: 'https://example.com/avatar.jpg' })
  avatarUrl: string | null;

  @ApiPropertyOptional({ description: '手机号（不脱敏）', example: '13800138000' })
  phone: string | null;

  @ApiProperty({ description: '用户角色', enum: Role, example: Role.PARENT })
  role: Role;

  @ApiProperty({ description: '用户状态', enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ description: '订单数', example: 5 })
  orderCount: number;

  @ApiProperty({ description: '总消费金额（元）', example: '1495.00' })
  totalSpent: string;

  @ApiPropertyOptional({ description: '最后登录时间', example: '2024-01-15T10:30:00Z' })
  lastLoginAt: Date | null;

  @ApiProperty({ description: '注册时间', example: '2024-01-01T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}
