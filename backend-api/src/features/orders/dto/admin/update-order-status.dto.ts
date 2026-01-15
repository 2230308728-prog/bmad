import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

/**
 * 订单状态更新请求 DTO
 */
export class UpdateOrderStatusDto {
  /**
   * 新的订单状态
   */
  @ApiProperty({
    enum: OrderStatus,
    example: 'COMPLETED',
    description: '新的订单状态（必须符合状态转换规则）',
  })
  @IsEnum(OrderStatus, { message: '订单状态无效' })
  status!: OrderStatus;

  /**
   * 状态变更原因（可选）
   */
  @ApiPropertyOptional({
    example: '活动已完成',
    description: '状态变更原因或备注',
  })
  @IsOptional()
  @IsString({ message: '原因必须是字符串' })
  @MaxLength(500, { message: '原因长度不能超过 500 字符' })
  reason?: string;
}

/**
 * 状态转换规则定义
 * PENDING → CANCELLED（允许）
 * PAID → COMPLETED（允许）
 * PAID → REFUNDED（允许，需创建退款记录）
 * 其他转换：不允许
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

/**
 * 验证状态转换是否合法
 * @param fromStatus 当前状态
 * @param toStatus 目标状态
 * @returns 是否允许转换
 */
export function isValidStatusTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
}

/**
 * 订单状态更新响应 DTO
 */
export class OrderStatusUpdateResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ORD20240114123456789' })
  orderNo!: string;

  @ApiProperty({ enum: OrderStatus, example: 'COMPLETED' })
  status!: OrderStatus;

  @ApiProperty({ example: '2024-02-15T18:00:00Z', required: false })
  completedAt?: string;

  @ApiProperty({ example: '2024-01-14T13:00:00Z', required: false })
  cancelledAt?: string;

  @ApiProperty({ example: '2024-01-14T15:00:00Z', required: false })
  refundedAt?: string;

  @ApiProperty({ example: '状态已更新' })
  message!: string;
}
