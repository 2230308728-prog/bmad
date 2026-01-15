import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationTemplateResponseDto {
  @ApiProperty({
    description: '通知类型',
    enum: NotificationType,
  })
  type: NotificationType;

  @ApiProperty({
    description: '模板名称',
    example: '订单确认通知',
  })
  name: string;

  @ApiProperty({
    description: '模板描述',
    example: '支付成功后发送的订单确认通知',
  })
  description: string;

  @ApiProperty({
    description: '模板 ID',
    example: 'ABC123',
  })
  templateId: string;
}
