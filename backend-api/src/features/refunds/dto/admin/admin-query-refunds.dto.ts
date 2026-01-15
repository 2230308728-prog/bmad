import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';

/**
 * 管理员查询退款列表的 DTO
 * 用于 GET /api/v1/admin/refunds 端点
 */
export class AdminQueryRefundsDto {
  @ApiProperty({
    example: 1,
    description: '页码（默认 1，最小 1，最大 10000）',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于 1' })
  @Max(10000, { message: '页码不能大于 10000' })
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    example: 20,
    description: '每页数量（默认 20，范围 1-50）',
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(50, { message: '每页数量不能大于 50' })
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiProperty({
    enum: RefundStatus,
    description: '退款状态筛选',
    required: false,
  })
  @IsOptional()
  @IsEnum(RefundStatus, { message: '退款状态无效' })
  status?: RefundStatus;

  @ApiProperty({
    example: 'REF20240114123456789',
    description: '退款编号搜索（部分匹配）',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '退款编号必须是字符串' })
  refundNo?: string;

  @ApiProperty({
    example: '2024-01-01',
    description: '申请开始日期（YYYY-MM-DD）',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式无效' })
  startDate?: string;

  @ApiProperty({
    example: '2024-12-31',
    description: '申请结束日期（YYYY-MM-DD）',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式无效' })
  endDate?: string;
}

/**
 * 退款列表项响应 DTO（管理员视角）
 * 包含用户基本信息、订单基本信息、退款基本信息
 */
export class AdminRefundSummaryResponseDto {
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

  @ApiProperty({ example: '2024-01-14T12:00:00Z', description: '申请时间' })
  appliedAt!: string;

  @ApiProperty({
    description: '用户信息',
    type: 'object',
    example: {
      id: 1,
      name: '张三',
      phone: '13800138000',
    },
  })
  user!: {
    id: number;
    name: string;
    phone: string; // 管理员可见完整手机号
  };

  @ApiProperty({
    description: '订单信息',
    type: 'object',
    example: {
      orderNo: 'ORD20240114123456789',
      productName: '上海科技馆探索之旅',
    },
  })
  order!: {
    orderNo: string;
    productName: string;
  };
}

/**
 * 分页退款列表响应 DTO（管理员视角）
 */
export class AdminPaginatedRefundsResponseDto {
  @ApiProperty({
    description: '退款列表',
    type: [AdminRefundSummaryResponseDto],
  })
  data!: AdminRefundSummaryResponseDto[];

  @ApiProperty({ example: 100, description: '总记录数' })
  total!: number;

  @ApiProperty({ example: 1, description: '当前页码' })
  page!: number;

  @ApiProperty({ example: 20, description: '每页数量' })
  pageSize!: number;
}
