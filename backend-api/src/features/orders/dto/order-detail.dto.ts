import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';

/**
 * 订单项详情（产品快照）
 */
export class OrderItemDetailDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '上海科技馆探索之旅' })
  productName!: string;

  @ApiProperty({ example: '299.00' })
  productPrice!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: '598.00' })
  subtotal!: string;
}

/**
 * 支付记录
 */
export class PaymentRecordDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'wx1234567890' })
  transactionId!: string;

  @ApiProperty({ example: 'WECHAT_JSAPI' })
  channel!: string;

  @ApiProperty({ example: '299.00' })
  amount!: string;

  @ApiProperty({ enum: PaymentStatus, example: 'SUCCESS' })
  status!: PaymentStatus;

  @ApiProperty({ example: '2024-01-14T12:30:00Z' })
  createdAt!: string;
}

/**
 * 退款记录
 */
export class RefundRecordDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'REF20240114123456789' })
  refundNo!: string;

  @ApiProperty({ example: '299.00' })
  refundAmount!: string;

  @ApiProperty({ example: '家长原因退款' })
  reason!: string;

  @ApiProperty({ enum: RefundStatus, example: 'PENDING' })
  status!: RefundStatus;

  @ApiProperty({ example: '2024-01-14T14:00:00Z' })
  createdAt!: string;
}

/**
 * 订单详情响应 DTO
 */
export class OrderDetailResponseDto {
  /**
   * 订单 ID
   */
  @ApiProperty({ example: 1 })
  id!: number;

  /**
   * 订单编号
   */
  @ApiProperty({ example: 'ORD20240114123456789' })
  orderNo!: string;

  /**
   * 订单状态
   */
  @ApiProperty({ enum: OrderStatus, example: 'PAID' })
  status!: OrderStatus;

  /**
   * 订单总金额
   */
  @ApiProperty({ example: '299.00' })
  totalAmount!: string;

  /**
   * 实际支付金额
   */
  @ApiProperty({ example: '299.00' })
  actualAmount!: string;

  /**
   * 订单备注
   */
  @ApiProperty({ example: '请提前预约', required: false })
  remark?: string;

  /**
   * 联系人姓名
   */
  @ApiProperty({ example: '张三' })
  contactName!: string;

  /**
   * 联系人手机号（脱敏）
   */
  @ApiProperty({ example: '138****8000' })
  contactPhone!: string;

  /**
   * 孩子姓名
   */
  @ApiProperty({ example: '小明' })
  childName!: string;

  /**
   * 孩子年龄
   */
  @ApiProperty({ example: 8 })
  childAge!: number;

  /**
   * 预订日期
   */
  @ApiProperty({ example: '2024-02-15' })
  bookingDate!: string;

  /**
   * 支付时间
   */
  @ApiProperty({ example: '2024-01-14T12:30:00Z', required: false })
  paidAt?: string;

  /**
   * 创建时间
   */
  @ApiProperty({ example: '2024-01-14T12:00:00Z' })
  createdAt!: string;

  /**
   * 订单项数组（产品快照）
   */
  @ApiProperty({ type: [OrderItemDetailDto] })
  items!: OrderItemDetailDto[];

  /**
   * 支付记录数组
   */
  @ApiProperty({ type: [PaymentRecordDto] })
  payments!: PaymentRecordDto[];

  /**
   * 退款记录数组（如有）
   */
  @ApiProperty({ type: [RefundRecordDto], required: false })
  refunds?: RefundRecordDto[];
}

/**
 * 手机号脱敏工具函数
 * @param phone 原始手机号
 * @returns 脱敏后的手机号（138****8000 格式）
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
