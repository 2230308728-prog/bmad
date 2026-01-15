import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueType, IssueStatus, IssuePriority } from '@prisma/client';

/**
 * 问题详情响应 DTO
 * 返回单个问题的完整信息
 */
export class IssueResponseDto {
  @ApiProperty({
    description: '问题 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '用户 ID',
    example: 1,
  })
  userId: number;

  @ApiPropertyOptional({
    description: '关联的订单 ID',
    example: 5,
  })
  orderId: number | null;

  @ApiPropertyOptional({
    description: '关联的订单号',
    example: 'ORD20240114123456789',
  })
  orderNo: string | null;

  @ApiProperty({
    description: '问题类型',
    enum: IssueType,
    example: IssueType.COMPLAINT,
  })
  type: IssueType;

  @ApiProperty({
    description: '问题标题',
    example: '活动时间变更问题',
  })
  title: string;

  @ApiProperty({
    description: '问题详细描述',
    example: '用户反映活动时间临时变更，与预订时间不符...',
  })
  description: string;

  @ApiProperty({
    description: '问题状态',
    enum: IssueStatus,
    example: IssueStatus.OPEN,
  })
  status: IssueStatus;

  @ApiProperty({
    description: '优先级',
    enum: IssuePriority,
    example: IssuePriority.HIGH,
  })
  priority: IssuePriority;

  @ApiPropertyOptional({
    description: '分配给的管理员 ID',
    example: 2,
  })
  assignedTo: number | null;

  @ApiPropertyOptional({
    description: '分配的管理员名称',
    example: '管理员A',
  })
  assignedToName: string | null;

  @ApiPropertyOptional({
    description: '解决方案',
    example: '已联系用户协调，已达成一致',
  })
  resolution: string | null;

  @ApiPropertyOptional({
    description: '解决时间',
    example: '2024-01-15T10:00:00Z',
  })
  resolvedAt: Date | null;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-14T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-15T10:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: '用户昵称',
    example: '张小明',
  })
  userName: string;

  @ApiPropertyOptional({
    description: '用户手机号',
    example: '138****8000',
  })
  userPhone: string | null;

  @ApiPropertyOptional({
    description: '用户头像',
    example: 'https://example.com/avatar.jpg',
  })
  userAvatarUrl: string | null;
}
