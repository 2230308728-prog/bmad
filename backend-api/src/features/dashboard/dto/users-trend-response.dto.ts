import { ApiProperty } from '@nestjs/swagger';
import { TrendDataPointDto, OrdersTrendResponseDto } from './orders-trend-query.dto';

/**
 * 用户趋势响应
 */
export class UsersTrendResponseDto {
  @ApiProperty({ description: '时间范围', example: 'today' })
  period: 'today' | 'week' | 'month';

  @ApiProperty({ description: '时间粒度', example: 'hour' })
  granularity: 'hour' | 'day';

  @ApiProperty({
    description: '新增用户趋势',
    type: [TrendDataPointDto],
  })
  newUsers: TrendDataPointDto[];

  @ApiProperty({
    description: '活跃用户趋势',
    type: [TrendDataPointDto],
  })
  activeUsers: TrendDataPointDto[];
}
