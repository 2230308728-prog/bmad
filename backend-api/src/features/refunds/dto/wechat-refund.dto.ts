import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNotEmpty, Max, Min } from 'class-validator';

/**
 * 微信支付退款请求 DTO
 */
export class WechatRefundRequestDto {
  @ApiProperty({
    example: 'ORD20240114123456789',
    description: '商户订单号',
  })
  @IsString()
  @IsNotEmpty()
  orderNo!: string;

  @ApiProperty({
    example: 'REF20240114123456789',
    description: '商户退款单号',
  })
  @IsString()
  @IsNotEmpty()
  refundNo!: string;

  @ApiProperty({
    example: 29900,
    description: '退款金额（单位：分）',
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(1000000) // 最高 10000 元
  amount!: number;

  @ApiProperty({
    example: '用户申请退款',
    description: '退款原因',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

/**
 * 微信支付退款响应 DTO
 */
export class WechatRefundResponseDto {
  @ApiProperty({
    example: 'REFUND_WX_123456',
    description: '微信退款单号',
  })
  refundId!: string;

  @ApiProperty({
    example: 'REF20240114123456789',
    description: '商户退款单号',
  })
  outRefundNo!: string;

  @ApiProperty({
    example: 'PROCESSING',
    description:
      '退款状态：PROCESSING（处理中）、SUCCESS（成功）、ABNORMAL（异常）',
    enum: ['PROCESSING', 'SUCCESS', 'ABNORMAL'],
  })
  status!: 'PROCESSING' | 'SUCCESS' | 'ABNORMAL';

  @ApiProperty({
    example: '2024-01-15T10:30:00+08:00',
    description: '退款创建时间',
    required: false,
  })
  createTime?: string;
}
