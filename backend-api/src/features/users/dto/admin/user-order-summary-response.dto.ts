import { ApiProperty } from '@nestjs/swagger';

/**
 * 最常预订分类 DTO
 */
export class FavoriteCategoryDto {
  @ApiProperty({
    description: '分类 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '分类名称',
    example: '自然科学',
  })
  name: string;

  @ApiProperty({
    description: '预订次数',
    example: 8,
  })
  orderCount: number;
}

/**
 * 月度统计 DTO
 */
export class MonthlyStatsDto {
  @ApiProperty({
    description: '月份 (YYYY-MM 格式)',
    example: '2024-01',
  })
  month: string;

  @ApiProperty({
    description: '订单数量',
    example: 5,
  })
  orders: number;

  @ApiProperty({
    description: '订单金额',
    example: '1495.00',
  })
  amount: string;
}

/**
 * 用户订单汇总统计响应 DTO
 */
export class UserOrderSummaryResponseDto {
  @ApiProperty({
    description: '总订单数',
    example: 15,
  })
  totalOrders: number;

  @ApiProperty({
    description: '已支付订单数',
    example: 12,
  })
  paidOrders: number;

  @ApiProperty({
    description: '已完成订单数',
    example: 10,
  })
  completedOrders: number;

  @ApiProperty({
    description: '已取消订单数',
    example: 2,
  })
  cancelledOrders: number;

  @ApiProperty({
    description: '已退款订单数',
    example: 1,
  })
  refundedOrders: number;

  @ApiProperty({
    description: '总消费金额',
    example: '4485.00',
  })
  totalSpent: string;

  @ApiProperty({
    description: '平均订单金额',
    example: '299.00',
  })
  avgOrderAmount: string;

  @ApiProperty({
    description: '首次订单日期',
    example: '2023-12-01T00:00:00Z',
    nullable: true,
  })
  firstOrderDate: Date | null;

  @ApiProperty({
    description: '最后订单日期',
    example: '2024-01-08T00:00:00Z',
    nullable: true,
  })
  lastOrderDate: Date | null;

  @ApiProperty({
    description: '最常预订的分类',
    type: FavoriteCategoryDto,
  })
  favoriteCategory: FavoriteCategoryDto;

  @ApiProperty({
    description: '最近6个月的订单趋势',
    type: [MonthlyStatsDto],
  })
  monthlyStats: MonthlyStatsDto[];
}
