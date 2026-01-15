import { ApiProperty } from '@nestjs/swagger';

/**
 * 订单统计数据响应 DTO
 */
export class OrderStatsResponseDto {
  /**
   * 总订单数
   */
  @ApiProperty({ example: 1000 })
  total!: number;

  /**
   * 待支付订单数
   */
  @ApiProperty({ example: 50 })
  pending!: number;

  /**
   * 已支付订单数
   */
  @ApiProperty({ example: 800 })
  paid!: number;

  /**
   * 已完成订单数
   */
  @ApiProperty({ example: 100 })
  completed!: number;

  /**
   * 已取消订单数
   */
  @ApiProperty({ example: 30 })
  cancelled!: number;

  /**
   * 已退款订单数
   */
  @ApiProperty({ example: 20 })
  refunded!: number;

  /**
   * 今日订单数
   */
  @ApiProperty({ example: 25 })
  todayCount!: number;

  /**
   * 今日订单金额
   */
  @ApiProperty({ example: '7500.00' })
  todayAmount!: string;
}
