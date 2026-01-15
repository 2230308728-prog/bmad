import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';

/**
 * 管理员用户信息响应（完整信息）
 */
export class AdminUserInfoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '张小明' })
  name!: string;

  @ApiProperty({ example: '13800138000', description: '管理员可见完整手机号' })
  phone!: string;

  @ApiProperty({ example: 'PARENT' })
  role!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt!: string;
}

/**
 * 订单项详情（管理员视角）
 */
export class AdminOrderItemDetailDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  productId!: number;

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
 * 支付记录（管理员视角）
 */
export class AdminPaymentRecordDto {
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
 * 退款记录（管理员视角）
 */
export class AdminRefundRecordDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'REF20240114123456789' })
  refundNo!: string;

  @ApiProperty({ example: '299.00' })
  refundAmount!: string;

  @ApiProperty({ example: '家长原因退款' })
  reason!: string;

  @ApiProperty({ example: '管理员备注' })
  adminNote?: string;

  @ApiProperty({ enum: RefundStatus, example: 'PENDING' })
  status!: RefundStatus;

  @ApiProperty({ example: '2024-01-14T14:00:00Z' })
  appliedAt!: string;

  @ApiProperty({ example: '2024-01-14T14:30:00Z', required: false })
  approvedAt?: string;

  @ApiProperty({ example: 'wx_refund_123' })
  wechatRefundId?: string;
}

/**
 * 订单状态历史记录响应 DTO
 */
export class OrderStatusHistoryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: OrderStatus, example: 'PENDING', required: false })
  fromStatus?: OrderStatus;

  @ApiProperty({ enum: OrderStatus, example: 'PAID' })
  toStatus!: OrderStatus;

  @ApiProperty({ example: '用户完成支付' })
  reason?: string;

  @ApiProperty({ example: 1 })
  changedBy!: number;

  @ApiProperty({ example: '管理员' })
  changedByName!: string;

  @ApiProperty({ example: '2024-01-14T12:30:00Z' })
  changedAt!: string;
}

/**
 * 管理员订单详情响应 DTO
 * 包含完整订单信息，不脱敏任何数据
 */
export class AdminOrderDetailResponseDto {
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
   * 支付状态
   */
  @ApiProperty({ enum: PaymentStatus, example: 'SUCCESS' })
  paymentStatus!: PaymentStatus;

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
   * 联系人手机号（不脱敏 - 管理员权限）
   */
  @ApiProperty({ example: '13800138000' })
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
   * 参与人数
   */
  @ApiProperty({ example: 2 })
  participantCount!: number;

  /**
   * 支付时间
   */
  @ApiProperty({ example: '2024-01-14T12:30:00Z', required: false })
  paidAt?: string;

  /**
   * 完成时间
   */
  @ApiProperty({ example: '2024-02-15T18:00:00Z', required: false })
  completedAt?: string;

  /**
   * 取消时间
   */
  @ApiProperty({ example: '2024-01-14T13:00:00Z', required: false })
  cancelledAt?: string;

  /**
   * 退款时间
   */
  @ApiProperty({ example: '2024-01-14T15:00:00Z', required: false })
  refundedAt?: string;

  /**
   * 创建时间
   */
  @ApiProperty({ example: '2024-01-14T12:00:00Z' })
  createdAt!: string;

  /**
   * 用户信息（完整）
   */
  @ApiProperty({ type: AdminUserInfoDto })
  user!: AdminUserInfoDto;

  /**
   * 订单项数组（产品快照）
   */
  @ApiProperty({ type: [AdminOrderItemDetailDto] })
  items!: AdminOrderItemDetailDto[];

  /**
   * 支付记录数组
   */
  @ApiProperty({ type: [AdminPaymentRecordDto] })
  payments!: AdminPaymentRecordDto[];

  /**
   * 退款记录数组（如有）
   */
  @ApiProperty({ type: [AdminRefundRecordDto], required: false })
  refunds?: AdminRefundRecordDto[];

  /**
   * 状态变更历史记录
   */
  @ApiProperty({ type: [OrderStatusHistoryResponseDto] })
  statusHistory!: OrderStatusHistoryResponseDto[];
}
