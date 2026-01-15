import { ApiProperty } from '@nestjs/swagger';

/**
 * 问题统计响应 DTO
 * 返回问题的统计数据
 */
export class IssueStatsResponseDto {
  @ApiProperty({
    description: '总问题数',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: '待处理问题数',
    example: 10,
  })
  open: number;

  @ApiProperty({
    description: '处理中的问题数',
    example: 15,
  })
  inProgress: number;

  @ApiProperty({
    description: '已解决问题数',
    example: 20,
  })
  resolved: number;

  @ApiProperty({
    description: '已关闭问题数',
    example: 5,
  })
  closed: number;

  @ApiProperty({
    description: '紧急问题数',
    example: 2,
  })
  urgent: number;

  @ApiProperty({
    description: '高优先级问题数',
    example: 8,
  })
  high: number;

  @ApiProperty({
    description: '平均解决时间（小时）',
    example: '24小时',
  })
  avgResolutionTime: string;

  @ApiProperty({
    description: '今日新增问题数',
    example: 3,
  })
  todayCreated: number;
}
