import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

/**
 * 用户列表响应 DTO
 * 用户列表项（手机号脱敏）
 */
export class UserListResponseDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiPropertyOptional({ description: '用户昵称', example: '张小明' })
  nickname: string | null;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl: string | null;

  @ApiProperty({ description: '用户角色', enum: Role, example: Role.PARENT })
  role: Role;

  @ApiProperty({
    description: '用户状态',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    description: '手机号（脱敏）',
    example: '138****8000',
  })
  phone: string | null;

  @ApiProperty({ description: '订单数', example: 5 })
  orderCount: number;

  @ApiProperty({ description: '总消费金额（元）', example: '1495.00' })
  totalSpent: string;

  @ApiPropertyOptional({
    description: '最后下单时间',
    example: '2024-01-15T10:30:00Z',
  })
  lastOrderAt: Date | null;

  @ApiProperty({ description: '注册时间', example: '2024-01-01T08:00:00Z' })
  createdAt: Date;
}
