import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 转化漏斗查询参数
 */
export class ConversionFunnelQueryDto {
  @ApiProperty({
    description: '时间范围',
    enum: ['week', 'month', 'all'],
    default: 'week',
    example: 'week',
  })
  @IsOptional()
  @IsEnum(['week', 'month', 'all'])
  period?: 'week' | 'month' | 'all' = 'week';
}
