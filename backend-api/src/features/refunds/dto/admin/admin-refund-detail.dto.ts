import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus, PaymentStatus } from '@prisma/client';

/**
 * 完整退款详情响应 DTO（管理员视角）
 * 不脱敏手机号，包含完整用户、订单、支付记录信息
 */
export class AdminRefundDetailResponseDto {
  @ApiProperty({ example: 1, description: '退款 ID' })
  id!: number;

  @ApiProperty({ example: 'REF20240114123456789', description: '退款编号' })
  refundNo!: string;

  @ApiProperty({ enum: RefundStatus, description: '退款状态' })
  status!: RefundStatus;

  @ApiProperty({ example: '299.00', description: '退款金额' })
  refundAmount!: string;

  @ApiProperty({ example: '行程有变', description: '退款原因' })
  reason!: string | null;

  @ApiProperty({ example: '由于孩子临时生病', description: '详细说明' })
  description!: string | null;

  @ApiProperty({
    example: ['https://oss.example.com/proof.jpg'],
    description: '凭证图片',
  })
  images!: string[];

  @ApiProperty({ example: '2024-01-14T12:00:00Z', description: '申请时间' })
  appliedAt!: string;

  @ApiProperty({ example: '2024-01-14T14:00:00Z', description: '批准时间', required: false })
  approvedAt!: string | null;

  @ApiProperty({ example: '已核实用户凭证，同意退款', description: '管理员备注', required: false })
  adminNote!: string | null;

  @ApiProperty({ example: '不符合退款条件', description: '拒绝原因', required: false })
  rejectedReason!: string | null;

  @ApiProperty({ example: '2024-01-14T13:00:00Z', description: '拒绝时间', required: false })
  rejectedAt!: string | null;

  @ApiProperty({ example: '2024-01-14T15:00:00Z', description: '退款完成时间', required: false })
  refundedAt!: string | null;

  @ApiProperty({ example: 'REFUND_WX_123456', description: '微信退款单号', required: false })
  wechatRefundId!: string | null;

  @ApiProperty({
    description: '用户信息（管理员可见完整信息）',
  })
  user!: {
    id: number;
    name: string;
    phone: string; // 管理员可见完整手机号
    role: string;
  };

  @ApiProperty({
    description: '订单信息',
  })
  order!: {
    id: number;
    orderNo: string;
    status: string;
    totalAmount: string;
    actualAmount: string;
    paymentStatus: PaymentStatus;
    bookingDate: string | null;
    items: Array<{
      id: number;
      productId: number;
      productName: string;
      productPrice: string;
      quantity: number;
      subtotal: string;
    }>;
  };

  @ApiProperty({
    description: '支付记录',
    type: 'array',
    required: false,
  })
  payments?: Array<{
    id: number;
    transactionId: string;
    channel: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;

  @ApiProperty({
    description: '产品信息',
    required: false,
  })
  product?: {
    id: number;
    title: string;
    images: string[];
  };
}
