import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 退款金额信息
 */
class RefundAmountDto {
  @ApiProperty({
    example: 29900,
    description: '订单总金额（单位：分）',
  })
  @IsString()
  total!: string;

  @ApiProperty({
    example: 100,
    description: '退款金额（单位：分）',
  })
  @IsString()
  refund!: string;

  @ApiProperty({
    example: 29900,
    description: '用户支付金额（单位：分）',
  })
  @IsString()
  payer_total!: string;

  @ApiProperty({
    example: 100,
    description: '用户退款金额（单位：分）',
  })
  @IsString()
  payer_refund!: string;

  @ApiProperty({
    example: 'CNY',
    description: '货币类型',
  })
  @IsString()
  currency!: string;
}

/**
 * 微信支付退款回调资源数据
 */
class RefundResourceDto {
  @ApiProperty({
    example: 'REFUND_WX_123456',
    description: '微信退款单号',
  })
  @IsString()
  @IsNotEmpty()
  refund_id!: string;

  @ApiProperty({
    example: 'REF20240114123456789',
    description: '商户退款单号',
  })
  @IsString()
  @IsNotEmpty()
  out_refund_no!: string;

  @ApiProperty({
    example: 'TXN123',
    description: '微信支付订单号',
  })
  @IsString()
  transaction_id!: string;

  @ApiProperty({
    example: 'ORD20240114123456789',
    description: '商户订单号',
  })
  @IsString()
  out_trade_no!: string;

  @ApiProperty({
    example: 'ORIGINAL',
    description: '退款渠道',
  })
  @IsString()
  channel!: string;

  @ApiProperty({
    example: '用户微信零钱',
    description: '退款入账账户',
  })
  @IsString()
  user_received_account!: string;

  @ApiProperty({
    example: 'SUCCESS',
    description: '退款状态：SUCCESS（成功）、ABNORMAL（异常）、PROCESSING（处理中）',
    enum: ['SUCCESS', 'ABNORMAL', 'PROCESSING'],
  })
  @IsString()
  status!: 'SUCCESS' | 'ABNORMAL' | 'PROCESSING';

  @ApiProperty({
    example: '2024-01-15T10:30:00+08:00',
    description: '退款成功时间',
    required: false,
  })
  @IsString()
  @IsOptional()
  success_time?: string;

  @ApiProperty({
    description: '金额信息',
    type: () => RefundAmountDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => RefundAmountDto)
  amount!: RefundAmountDto;
}

/**
 * 微信支付退款回调加密数据
 */
class EncryptedDataDto {
  @ApiProperty({
    example: 'encrypted_data',
    description: 'Base64编码的密文',
  })
  @IsString()
  @IsNotEmpty()
  ciphertext!: string;

  @ApiProperty({
    example: 'refund',
    description: '附加数据',
  })
  @IsString()
  @IsNotEmpty()
  associated_data!: string;

  @ApiProperty({
    example: 'random_nonce',
    description: '加密使用的随机串',
  })
  @IsString()
  @IsNotEmpty()
  nonce!: string;
}

/**
 * 微信支付退款回调请求 DTO
 */
export class RefundNotifyRequestDto {
  @ApiProperty({
    example: '1234567890',
    description: '微信传递的时间戳',
  })
  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @ApiProperty({
    example: 'abc123',
    description: '微信传递的随机串',
  })
  @IsString()
  @IsNotEmpty()
  nonce!: string;

  @ApiProperty({
    example: 'signature',
    description: '微信传递的签名',
  })
  @IsString()
  @IsNotEmpty()
  signature!: string;

  @ApiProperty({
    example: 'serial_no',
    description: '微信传递的证书序列号',
  })
  @IsString()
  @IsNotEmpty()
  serial!: string;

  @ApiProperty({
    description: '加密的退款回调数据',
    type: EncryptedDataDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => EncryptedDataDto)
  resource!: EncryptedDataDto;
}
