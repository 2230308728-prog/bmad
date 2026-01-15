import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';

/**
 * 用户退款记录响应 DTO
 */
export class UserRefundListResponseDto {
  @ApiProperty({
    description: '退款记录 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '订单 ID',
    example: 5,
  })
  orderId: number;

  @ApiProperty({
    description: '订单号',
    example: 'ORD20240114123456789',
  })
  orderNo: string;

  @ApiProperty({
    description: '退款金额',
    example: '299.00',
  })
  amount: string;

  @ApiProperty({
    description: '退款状态',
    enum: RefundStatus,
    example: RefundStatus.SUCCESS,
  })
  status: RefundStatus;

  @ApiProperty({
    description: '退款原因',
    example: '活动时间变更',
    required: false,
  })
  reason?: string;

  @ApiProperty({
    description: '申请时间',
    example: '2024-01-14T12:00:00Z',
  })
  requestedAt: Date;

  @ApiProperty({
    description: '处理时间',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  processedAt?: Date;
}
