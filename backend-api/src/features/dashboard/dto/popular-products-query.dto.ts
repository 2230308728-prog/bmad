import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 热门产品查询参数
 */
export class PopularProductsQueryDto {
  @ApiPropertyOptional({
    description: '时间范围',
    enum: ['week', 'month', 'all'],
    example: 'week',
  })
  @IsOptional()
  @IsEnum(['week', 'month', 'all'])
  period?: 'week' | 'month' | 'all' = 'week';

  @ApiPropertyOptional({
    description: '返回数量（默认10，最大50）',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
