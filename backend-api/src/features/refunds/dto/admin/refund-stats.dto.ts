import { ApiProperty } from '@nestjs/swagger';

/**
 * 退款统计数据响应 DTO
 */
export class RefundStatsResponseDto {
  @ApiProperty({ example: 150, description: '总退款数' })
  total!: number;

  @ApiProperty({ example: 12, description: '待审核数' })
  pending!: number;

  @ApiProperty({ example: 80, description: '已批准数' })
  approved!: number;

  @ApiProperty({ example: 30, description: '已拒绝数' })
  rejected!: number;

  @ApiProperty({ example: 15, description: '处理中数' })
  processing!: number;

  @ApiProperty({ example: 10, description: '已完成数' })
  completed!: number;

  @ApiProperty({ example: 3, description: '失败数' })
  failed!: number;

  @ApiProperty({ example: '15000.00', description: '总退款金额' })
  totalAmount!: string;

  @ApiProperty({ example: '3500.00', description: '待处理金额' })
  pendingAmount!: string;
}
