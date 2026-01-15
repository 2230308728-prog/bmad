import { ApiProperty } from '@nestjs/swagger';

/**
 * 今日统计数据
 */
export class TodayStatsDto {
  @ApiProperty({ description: '今日订单数', example: 25 })
  orders: number;

  @ApiProperty({ description: '今日订单金额（元）', example: '7500.00' })
  ordersAmount: string;

  @ApiProperty({ description: '今日新增用户数', example: 3 })
  newUsers: number;

  @ApiProperty({ description: '今日已支付订单数', example: 20 })
  paidOrders: number;

  @ApiProperty({ description: '今日已完成订单数', example: 15 })
  completedOrders: number;
}

/**
 * 本周统计数据
 */
export class WeekStatsDto {
  @ApiProperty({ description: '本周订单数', example: 150 })
  orders: number;

  @ApiProperty({ description: '本周订单金额（元）', example: '45000.00' })
  ordersAmount: string;

  @ApiProperty({ description: '本周新增用户数', example: 18 })
  newUsers: number;

  @ApiProperty({ description: '本周已支付订单数', example: 120 })
  paidOrders: number;

  @ApiProperty({ description: '本周已完成订单数', example: 100 })
  completedOrders: number;
}

/**
 * 本月统计数据
 */
export class MonthStatsDto {
  @ApiProperty({ description: '本月订单数', example: 600 })
  orders: number;

  @ApiProperty({ description: '本月订单金额（元）', example: '180000.00' })
  ordersAmount: string;

  @ApiProperty({ description: '本月新增用户数', example: 65 })
  newUsers: number;

  @ApiProperty({ description: '本月已支付订单数', example: 480 })
  paidOrders: number;

  @ApiProperty({ description: '本月已完成订单数', example: 400 })
  completedOrders: number;
}

/**
 * 总计统计数据
 */
export class TotalStatsDto {
  @ApiProperty({ description: '总用户数', example: 150 })
  users: number;

  @ApiProperty({ description: '总订单数', example: 2000 })
  orders: number;

  @ApiProperty({ description: '总产品数', example: 50 })
  products: number;

  @ApiProperty({ description: '总收入（元）', example: '600000.00' })
  revenue: string;
}

/**
 * 核心业务指标响应
 */
export class OverviewResponseDto {
  @ApiProperty({ description: '今日数据', type: TodayStatsDto })
  today: TodayStatsDto;

  @ApiProperty({ description: '本周数据', type: WeekStatsDto })
  week: WeekStatsDto;

  @ApiProperty({ description: '本月数据', type: MonthStatsDto })
  month: MonthStatsDto;

  @ApiProperty({ description: '总计数据', type: TotalStatsDto })
  total: TotalStatsDto;
}
