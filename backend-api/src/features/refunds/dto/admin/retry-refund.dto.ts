import { ApiProperty } from '@nestjs/swagger';

/**
 * 管理员重试退款请求 DTO
 * 用于手动重试失败的退款申请
 */
export class RetryRefundDto {
  // 空DTO，因为重试不需要额外参数
  // 所有信息从退款记录中获取
}

/**
 * 重试退款响应 DTO
 */
export class RetryRefundResponseDto {
  @ApiProperty({
    example: true,
    description: '重试是否成功',
  })
  success!: boolean;

  @ApiProperty({
    example: '退款重试成功，等待微信回调',
    description: '响应消息',
  })
  message!: string;

  @ApiProperty({
    example: 'REFUND_WX_123456',
    description: '微信退款单号',
    required: false,
  })
  wechatRefundId?: string;

  @ApiProperty({
    example: 'PROCESSING',
    description: '退款状态',
    required: false,
  })
  status?: string;
}
