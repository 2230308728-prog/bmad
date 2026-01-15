import { ApiProperty } from '@nestjs/swagger';

/**
 * 热门产品单项
 */
export class PopularProductDto {
  @ApiProperty({ description: '产品ID', example: 1 })
  id: number;

  @ApiProperty({ description: '产品标题', example: '上海科技馆探索之旅' })
  title: string;

  @ApiProperty({ description: '产品图片', example: 'https://...' })
  image: string;

  @ApiProperty({ description: '产品分类', example: '自然科学' })
  category: string;

  @ApiProperty({ description: '价格（元）', example: '299.00' })
  price: string;

  @ApiProperty({ description: '订单数', example: 25 })
  orders: number;

  @ApiProperty({ description: '订单金额（元）', example: '7475.00' })
  amount: string;

  @ApiProperty({ description: '浏览次数', example: 500 })
  views: number;

  @ApiProperty({ description: '转化率（%）', example: 5.0 })
  conversionRate: number;

  @ApiProperty({ description: '平均评分', example: 4.8 })
  avgRating: number;

  @ApiProperty({ description: '排名', example: 1 })
  rank: number;
}

/**
 * 热门产品汇总统计
 */
export class PopularProductsSummaryDto {
  @ApiProperty({ description: '总订单数', example: 150 })
  totalOrders: number;

  @ApiProperty({ description: '总金额（元）', example: '45000.00' })
  totalAmount: string;

  @ApiProperty({ description: '平均转化率（%）', example: 3.5 })
  avgConversionRate: number;
}

/**
 * 热门产品响应
 */
export class PopularProductsResponseDto {
  @ApiProperty({ description: '时间范围', example: 'week' })
  period: 'week' | 'month' | 'all';

  @ApiProperty({
    description: '热门产品列表',
    type: [PopularProductDto],
  })
  products: PopularProductDto[];

  @ApiProperty({ description: '汇总统计', type: PopularProductsSummaryDto })
  summary: PopularProductsSummaryDto;
}
