import { IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class SubscribeNotificationsDto {
  @ApiProperty({
    description: '要订阅的通知类型列表',
    example: [
      NotificationType.ORDER_CONFIRM,
      NotificationType.TRAVEL_REMINDER,
      NotificationType.REFUND_APPROVED,
      NotificationType.REFUND_REJECTED,
      NotificationType.REFUND_COMPLETED,
    ],
    enum: NotificationType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  @IsNotEmpty()
  notificationTypes: NotificationType[];
}
