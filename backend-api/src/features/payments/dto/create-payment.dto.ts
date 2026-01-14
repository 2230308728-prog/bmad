import { IsNotEmpty, IsString } from 'class-validator';

/**
 * CreatePaymentDto
 * 创建支付订单 DTO
 * 用户点击"去支付"时调用此接口
 */
export class CreatePaymentDto {
  /**
   * OpenID - 用户在微信小程序中的唯一标识
   * 由于使用静默登录，前端需要从 wx.login() 获取 code 并后端换取 openid
   */
  @IsNotEmpty()
  @IsString()
  openid!: string;
}
