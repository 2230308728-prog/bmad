import {
  IsInt,
  IsOptional,
  IsIn,
  Min,
  Max,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

/**
 * 管理员查询订单列表的 DTO
 * 用于 GET /api/v1/admin/orders 端点的查询参数
 */
export class AdminQueryOrdersDto {
  @ApiPropertyOptional({
    example: 1,
    description: '页码（从 1 开始）',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: '每页数量（范围 1-50）',
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(50, { message: '每页数量不能超过 50' })
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    enum: OrderStatus,
    example: 'PAID',
    description: '订单状态筛选',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: '订单状态无效' })
  status?: OrderStatus;

  @ApiPropertyOptional({
    example: 'ORD20240114123456789',
    description: '订单编号搜索（部分匹配）',
  })
  @IsOptional()
  @IsString({ message: '订单编号必须是字符串' })
  orderNo?: string;

  @ApiPropertyOptional({
    example: 1,
    description: '用户 ID 筛选',
  })
  @IsOptional()
  @IsInt({ message: '用户 ID 必须是整数' })
  @Min(1, { message: '用户 ID 不能小于 1' })
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: '开始日期（YYYY-MM-DD 格式）',
  })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式无效，应为 YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: '结束日期（YYYY-MM-DD 格式）',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式无效，应为 YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: '产品 ID 筛选',
  })
  @IsOptional()
  @IsInt({ message: '产品 ID 必须是整数' })
  @Min(1, { message: '产品 ID 不能小于 1' })
  @Type(() => Number)
  productId?: number;
}

/**
 * 用户基本信息摘要（管理员视角）
 */
export class AdminUserSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '张小明' })
  name!: string;

  @ApiProperty({ example: '13800138000', description: '管理员可见完整手机号' })
  phone!: string;

  @ApiProperty({ example: 'PARENT' })
  role!: string;
}

/**
 * 产品基本信息摘要（订单列表中显示）
 */
export class AdminProductSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '上海科技馆探索之旅' })
  title!: string;

  @ApiProperty({ example: '299.00' })
  price!: string;
}

/**
 * 管理员订单摘要响应 DTO
 * 用于管理员订单列表的每个订单项
 */
export class AdminOrderSummaryResponseDto {
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
   * 用户基本信息
   */
  @ApiProperty({ type: AdminUserSummaryDto })
  user!: AdminUserSummaryDto;

  /**
   * 产品基本信息
   */
  @ApiProperty({ type: AdminProductSummaryDto })
  product!: AdminProductSummaryDto;

  /**
   * 预订日期
   */
  @ApiProperty({ example: '2024-02-15' })
  bookingDate!: string;

  /**
   * 创建时间
   */
  @ApiProperty({ example: '2024-01-14T12:00:00Z' })
  createdAt!: string;
}

/**
 * 管理员分页响应包装器
 */
export class AdminPaginatedOrdersResponseDto {
  /**
   * 订单列表数据
   */
  @ApiProperty({ type: [AdminOrderSummaryResponseDto] })
  data!: AdminOrderSummaryResponseDto[];

  /**
   * 总数量
   */
  @ApiProperty({ example: 50 })
  total!: number;

  /**
   * 当前页码
   */
  @ApiProperty({ example: 1 })
  page!: number;

  /**
   * 每页数量
   */
  @ApiProperty({ example: 20 })
  pageSize!: number;
}
