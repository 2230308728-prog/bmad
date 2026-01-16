import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';

/**
 * 退款信息响应 DTO
 * 用于 POST /api/v1/refunds 创建成功响应
 */
export class RefundResponseDto {
  @ApiProperty({ example: 1, description: '退款记录 ID' })
  id!: number;

  @ApiProperty({ example: 'REF20240114123456789', description: '退款单号' })
  refundNo!: string;

  @ApiProperty({
    example: 'PENDING',
    description: '退款状态',
    enum: RefundStatus,
  })
  status!: RefundStatus;

  @ApiProperty({ example: '299.00', description: '退款金额（元）' })
  refundAmount!: string;

  @ApiProperty({ example: '2024-01-14T12:00:00Z', description: '申请时间' })
  appliedAt!: string;
}

/**
 * 退款详情响应 DTO
 * 用于 GET /api/v1/refunds/:id 端点
 */
export class RefundDetailResponseDto {
  @ApiProperty({ example: 1, description: '退款记录 ID' })
  id!: number;

  @ApiProperty({ example: 'REF20240114123456789', description: '退款单号' })
  refundNo!: string;

  @ApiProperty({
    example: 'PENDING',
    description: '退款状态',
    enum: RefundStatus,
  })
  status!: RefundStatus;

  @ApiProperty({ example: '299.00', description: '退款金额（元）' })
  refundAmount!: string;

  @ApiProperty({ example: '行程有变，无法参加', description: '退款原因' })
  reason!: string | null;

  @ApiProperty({
    example: '由于孩子临时生病，需要请假复诊，无法参加预订的活动',
    description: '退款详细说明',
    required: false,
  })
  description?: string | null;

  @ApiProperty({
    example: ['https://oss.example.com/refunds/proof1.jpg'],
    description: '凭证图片 URL 数组',
    required: false,
  })
  images?: string[];

  @ApiProperty({ example: '2024-01-14T12:00:00Z', description: '申请时间' })
  appliedAt!: string;

  @ApiProperty({
    example: '2024-01-14T14:00:00Z',
    description: '审批时间',
    required: false,
  })
  approvedAt?: string | null;

  @ApiProperty({
    example: '已批准退款',
    description: '管理员备注',
    required: false,
  })
  adminNote?: string | null;

  @ApiProperty({
    example: '不符合退款条件',
    description: '拒绝原因',
    required: false,
  })
  rejectedReason?: string | null;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: '退款完成时间',
    required: false,
  })
  refundedAt?: string | null;

  @ApiProperty({
    description: '关联订单信息',
    example: {
      id: 1,
      orderNo: 'ORD20240114123456789',
      status: 'PAID',
      totalAmount: '299.00',
      bookingDate: '2024-02-15',
    },
  })
  order!: {
    id: number;
    orderNo: string;
    status: string;
    totalAmount: string;
    bookingDate: string | null;
  };

  @ApiProperty({
    description: '关联产品信息',
    example: {
      id: 1,
      title: '上海科技馆探索之旅',
      images: ['https://oss.example.com/products/1/image1.jpg'],
    },
  })
  product!: {
    id: number;
    title: string;
    images: string[];
  };
}
