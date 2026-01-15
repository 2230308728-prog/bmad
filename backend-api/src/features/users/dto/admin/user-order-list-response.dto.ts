import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * 订单项响应 DTO (产品基本信息)
 */
export class OrderItemResponseDto {
  @ApiProperty({
    description: '订单项 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '产品 ID',
    example: 1,
  })
  productId: number;

  @ApiProperty({
    description: '产品名称',
    example: '上海科技馆探索之旅',
  })
  productName: string;

  @ApiProperty({
    description: '产品单价',
    example: '299.00',
  })
  productPrice: string;

  @ApiProperty({
    description: '数量',
    example: 1,
  })
  quantity: number;

  @ApiProperty({
    description: '小计金额',
    example: '299.00',
  })
  subtotal: string;
}

/**
 * 用户订单列表响应 DTO
 */
export class UserOrderListResponseDto {
  @ApiProperty({
    description: '订单 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '订单号',
    example: 'ORD20240114123456789',
  })
  orderNo: string;

  @ApiProperty({
    description: '订单状态',
    enum: OrderStatus,
    example: OrderStatus.PAID,
  })
  status: OrderStatus;

  @ApiProperty({
    description: '支付状态',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCESS,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: '订单总金额',
    example: '299.00',
  })
  totalAmount: string;

  @ApiProperty({
    description: '实际支付金额',
    example: '299.00',
  })
  actualAmount: string;

  @ApiProperty({
    description: '预订日期',
    example: '2024-02-15T00:00:00Z',
    required: false,
  })
  bookingDate?: Date;

  @ApiProperty({
    description: '订单项列表',
    type: [OrderItemResponseDto],
  })
  items: OrderItemResponseDto[];

  @ApiProperty({
    description: '支付时间',
    example: '2024-01-14T12:30:00Z',
    required: false,
  })
  paidAt?: Date;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-14T12:00:00Z',
  })
  createdAt: Date;
}
