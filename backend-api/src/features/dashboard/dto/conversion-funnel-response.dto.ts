import { ApiProperty } from '@nestjs/swagger';

/**
 * 转化漏斗阶段
 */
export class FunnelStageDto {
  @ApiProperty({ description: '阶段名称', example: '浏览产品' })
  stage: string;

  @ApiProperty({ description: '用户数', example: 1000 })
  users: number;

  @ApiProperty({ description: '转化率（%）', example: 100 })
  percentage: number;
}

/**
 * 转化流失
 */
export class FunnelDropoffDto {
  @ApiProperty({ description: '流失阶段', example: '浏览产品→查看详情' })
  stage: string;

  @ApiProperty({ description: '流失用户数', example: 400 })
  users: number;

  @ApiProperty({ description: '流失率（%）', example: 40 })
  percentage: number;
}

/**
 * 转化漏斗响应
 */
export class ConversionFunnelResponseDto {
  @ApiProperty({ description: '时间范围', example: 'week' })
  period: 'week' | 'month' | 'all';

  @ApiProperty({
    description: '转化漏斗',
    type: [FunnelStageDto],
  })
  funnel: FunnelStageDto[];

  @ApiProperty({ description: '总体转化率（%）', example: 15 })
  overallConversion: number;

  @ApiProperty({
    description: '流失数据',
    type: [FunnelDropoffDto],
  })
  dropoffs: FunnelDropoffDto[];
}
