import { ApiProperty } from '@nestjs/swagger';

/**
 * 产品表现统计
 */
export class ProductPerformanceStatsDto {
  @ApiProperty({ description: '总浏览量', example: 2000 })
  totalViews: number;

  @ApiProperty({ description: '总订单数', example: 100 })
  totalOrders: number;

  @ApiProperty({ description: '总收入（元）', example: '29900.00' })
  totalRevenue: string;

  @ApiProperty({ description: '转化率（%）', example: 5.0 })
  conversionRate: number;

  @ApiProperty({ description: '平均订单价值（元）', example: '299.00' })
  avgOrderValue: string;

  @ApiProperty({ description: '取消率（%）', example: 10 })
  cancelRate: number;

  @ApiProperty({ description: '退款率（%）', example: 5 })
  refundRate: number;
}

/**
 * 产品趋势数据
 */
export class ProductTrendDto {
  @ApiProperty({ description: '最近7天每日订单数', example: [15, 20, 18, 25, 22, 30, 28] })
  last7Days: number[];

  @ApiProperty({ description: '最近30天每周订单数', example: [100, 120, 110, 130, 125, 140, 135] })
  last30Days: number[];
}

/**
 * 年龄分布
 */
export class AgeDistributionDto {
  @ApiProperty({ description: '年龄范围', example: '3-6' })
  range: string;

  @ApiProperty({ description: '数量', example: 20 })
  count: number;
}

/**
 * 用户人群统计
 */
export class DemographicsDto {
  @ApiProperty({ description: '平均年龄', example: 8.5 })
  avgAge: number;

  @ApiProperty({
    description: '年龄分布',
    type: [AgeDistributionDto],
  })
  ageDistribution: AgeDistributionDto[];
}

/**
 * 产品基本信息
 */
export class ProductBasicInfoDto {
  @ApiProperty({ description: '产品ID', example: 1 })
  id: number;

  @ApiProperty({ description: '产品标题', example: '上海科技馆探索之旅' })
  title: string;
}

/**
 * 产品表现响应
 */
export class ProductPerformanceResponseDto {
  @ApiProperty({ description: '产品信息', type: ProductBasicInfoDto })
  product: ProductBasicInfoDto;

  @ApiProperty({ description: '统计数据', type: ProductPerformanceStatsDto })
  stats: ProductPerformanceStatsDto;

  @ApiProperty({ description: '趋势数据', type: ProductTrendDto })
  trend: ProductTrendDto;

  @ApiProperty({ description: '人群统计', type: DemographicsDto })
  demographics: DemographicsDto;
}
