import {
  IsInt,
  IsOptional,
  IsIn,
  Min,
  Max,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

/**
 * 查询订单列表的 DTO
 * 用于 GET /api/v1/orders 端点的查询参数
 */
export class QueryOrdersDto {
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
    description: '每页数量（范围 1-100）',
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(100, { message: '每页数量不能超过 100' })
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
    example: 'createdAt',
    description: '排序字段',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  @IsIn(['createdAt', 'totalAmount'], {
    message: '排序字段必须是 createdAt 或 totalAmount',
  })
  sortBy?: 'createdAt' | 'totalAmount' = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: '排序方向',
    default: 'desc',
  })
  @IsOptional()
  @IsString({ message: '排序方向必须是字符串' })
  @IsIn(['asc', 'desc'], { message: '排序方向必须是 asc 或 desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * 订单摘要响应 DTO
 * 用于订单列表的每个订单项
 */
export class OrderSummaryResponseDto {
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
   * 产品名称（从订单项获取）
   */
  @ApiProperty({ example: '上海科技馆探索之旅' })
  productName!: string;

  /**
   * 创建时间
   */
  @ApiProperty({ example: '2024-01-14T12:00:00Z' })
  createdAt!: string;
}

/**
 * 分页响应包装器
 */
export class PaginatedOrdersResponseDto {
  /**
   * 订单列表数据
   */
  @ApiProperty({ type: [OrderSummaryResponseDto] })
  data!: OrderSummaryResponseDto[];

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
