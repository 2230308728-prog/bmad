import { ApiProperty } from '@nestjs/swagger';

/**
 * 队列留存数据
 */
export class CohortRetentionDto {
  @ApiProperty({ description: '周期（如 2023-12-W1）', example: '2023-12-W1' })
  period: string;

  @ApiProperty({ description: '新用户数', example: 50 })
  newUsers: number;

  @ApiProperty({ description: '留存率', example: { day1: 80, day7: 40, day30: 20 } })
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

/**
 * 平均留存率
 */
export class AvgRetentionDto {
  @ApiProperty({ description: '次日留存率（%）', example: 75 })
  day1: number;

  @ApiProperty({ description: '7日留存率（%）', example: 35 })
  day7: number;

  @ApiProperty({ description: '30日留存率（%）', example: 18 })
  day30: number;
}

/**
 * 用户留存响应
 */
export class UserRetentionResponseDto {
  @ApiProperty({
    description: '队列分析',
    type: [CohortRetentionDto],
  })
  cohortAnalysis: CohortRetentionDto[];

  @ApiProperty({ description: '平均留存率', type: AvgRetentionDto })
  avgRetention: AvgRetentionDto;
}
