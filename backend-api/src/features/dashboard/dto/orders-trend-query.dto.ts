import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 订单趋势查询参数
 */
export class OrdersTrendQueryDto {
  @ApiPropertyOptional({
    description: '时间范围',
    enum: ['today', 'week', 'month'],
    example: 'today',
  })
  @IsOptional()
  @IsEnum(['today', 'week', 'month'])
  @IsString()
  period?: 'today' | 'week' | 'month' = 'today';

  @ApiPropertyOptional({
    description: '时间粒度',
    enum: ['hour', 'day'],
    example: 'hour',
  })
  @IsOptional()
  @IsEnum(['hour', 'day'])
  @IsString()
  granularity?: 'hour' | 'day';
}

/**
 * 趋势数据点
 */
export class TrendDataPointDto {
  @ApiProperty({ description: '时间标签', example: '09:00' })
  time: string;

  @ApiProperty({ description: '订单/用户数量', example: 5 })
  orders?: number;

  @ApiProperty({ description: '订单/用户金额', example: '1500.00' })
  amount?: string;

  @ApiProperty({ description: '用户数量', example: 3 })
  newUsers?: number;

  @ApiProperty({ description: '活跃用户数量', example: 10 })
  activeUsers?: number;
}

/**
 * 订单趋势响应
 */
export class OrdersTrendResponseDto {
  @ApiProperty({ description: '时间范围', example: 'today' })
  period: 'today' | 'week' | 'month';

  @ApiProperty({ description: '时间粒度', example: 'hour' })
  granularity: 'hour' | 'day';

  @ApiProperty({
    description: '趋势数据',
    type: [TrendDataPointDto],
  })
  data: TrendDataPointDto[];

  @ApiProperty({ description: '总订单数', example: 25 })
  totalOrders: number;

  @ApiProperty({ description: '总金额', example: '7500.00' })
  totalAmount: string;
}
