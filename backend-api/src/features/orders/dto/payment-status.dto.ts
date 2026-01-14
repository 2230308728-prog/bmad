import { IsNumber, IsString, IsOptional } from 'class-validator';

/**
 * 支付状态响应 DTO
 */
export class PaymentStatusResponseDto {
  /**
   * 订单 ID
   */
  @IsNumber()
  orderId!: number;

  /**
   * 订单编号
   */
  @IsString()
  orderNo!: string;

  /**
   * 订单状态
   */
  @IsString()
  status!: string;

  /**
   * 支付时间（可选，支付成功时存在）
   */
  @IsString()
  @IsOptional()
  paidAt?: string;

  /**
   * 已支付金额（可选，支付成功时存在）
   */
  @IsString()
  @IsOptional()
  paidAmount?: string;

  /**
   * 微信支付订单号（可选，支付成功时存在）
   */
  @IsString()
  @IsOptional()
  transactionId?: string;

  /**
   * 消息（支付中或失败时存在）
   */
  @IsString()
  @IsOptional()
  message?: string;
}

/**
 * 支付中状态响应
 */
export class PaymentPendingResponseDto {
  @IsString()
  status!: string;

  @IsString()
  message!: string;
}

/**
 * 支付失败状态响应
 */
export class PaymentFailedResponseDto {
  @IsString()
  status!: string;

  @IsString()
  message!: string;
}
