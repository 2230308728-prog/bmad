import { IsNotEmpty, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 微信支付回调资源数据 DTO
 * 加密的支付结果
 */
export class WechatPayResourceDto {
  /**
   * 加密算法（固定值：AEAD_AES_256_GCM）
   */
  @IsNotEmpty()
  @IsString()
  algorithm!: string;

  /**
   * Base64 编码的密文
   */
  @IsNotEmpty()
  @IsString()
  ciphertext!: string;

  /**
   * 加密随机串
   */
  @IsNotEmpty()
  @IsString()
  nonce!: string;

  /**
   * 附加数据
   */
  @IsString()
  @IsOptional()
  associated_data!: string;
}

/**
 * 微信支付回调通知 DTO
 * 微信支付回调请求的原始数据结构
 *
 * 微信支付通知格式：
 * {
 *   "id": "通知ID",
 *   "create_time": "通知创建时间",
 *   "resource_type": "encrypt-resource",
 *   "event_type": "TRANSACTION.SUCCESS",
 *   "resource": {
 *     "algorithm": "AEAD_AES_256_GCM",
 *     "ciphertext": "Base64编码的密文",
 *     "nonce": "加密随机串",
 *     "associated_data": "附加数据"
 *   }
 * }
 */
export class WechatPayNotifyDto {
  /**
   * 通知ID
   */
  @IsNotEmpty()
  @IsString()
  id!: string;

  /**
   * 通知创建时间
   */
  @IsNotEmpty()
  @IsString()
  create_time!: string;

  /**
   * 资源类型（固定值：encrypt-resource）
   */
  @IsNotEmpty()
  @IsString()
  resource_type!: string;

  /**
   * 事件类型
   * - TRANSACTION.SUCCESS: 支付成功
   * - TRANSACTION.CLOSED: 订单关闭
   * - TRANSACTION.REFUND: 退款
   */
  @IsNotEmpty()
  @IsString()
  event_type!: string;

  /**
   * 资源数据（加密的支付结果）
   */
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => WechatPayResourceDto)
  resource!: WechatPayResourceDto;
}
