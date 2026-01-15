import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationPreferenceResponseDto {
  @ApiProperty({
    description: '用户 ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: '已订阅的通知类型列表',
    enum: NotificationType,
    isArray: true,
  })
  notificationTypes: NotificationType[];

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt: Date;
}
