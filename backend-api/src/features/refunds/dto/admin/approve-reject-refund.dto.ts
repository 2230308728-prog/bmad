import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 批准退款请求 DTO
 */
export class ApproveRefundDto {
  @ApiProperty({
    example: '已核实用户凭证，同意退款',
    description: '管理员备注（可选）',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '管理员备注必须是字符串' })
  @MaxLength(500, { message: '管理员备注不能超过 500 字符' })
  adminNote?: string;
}

/**
 * 拒绝退款请求 DTO
 */
export class RejectRefundDto {
  @ApiProperty({
    example: '不符合退款条件：活动开始前 48 小时内不可退款',
    description: '拒绝原因（必填）',
  })
  @IsString({ message: '拒绝原因必须是字符串' })
  @MaxLength(500, { message: '拒绝原因不能超过 500 字符' })
  rejectedReason!: string;
}

/**
 * 退款审核响应 DTO
 */
export class RefundReviewResponseDto {
  @ApiProperty({ example: 1, description: '退款 ID' })
  id!: number;

  @ApiProperty({ example: 'REF20240114123456789', description: '退款编号' })
  refundNo!: string;

  @ApiProperty({ description: '退款状态', enum: ['APPROVED', 'REJECTED'] })
  status!: 'APPROVED' | 'REJECTED';

  @ApiProperty({ example: '2024-01-14T14:00:00Z', description: '审核时间' })
  reviewedAt!: string;

  @ApiProperty({ example: '已核实用户凭证，同意退款', description: '管理员备注', required: false })
  adminNote?: string | null;

  @ApiProperty({ example: '不符合退款条件', description: '拒绝原因', required: false })
  rejectedReason?: string | null;
}
