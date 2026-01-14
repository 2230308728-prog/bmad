import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * CreatePaymentDto
 * 创建支付订单 DTO
 * 用户点击"去支付"时调用此接口
 */
export class CreatePaymentDto {
  /**
   * OpenID - 用户在微信小程序中的唯一标识
   *
   * 格式要求：27-32位字母数字字符串（包含下划线和连字符）
   * 示例：oXYZ_abcdefg1234567890hijklmnop
   *
   * 获取方式：
   * 1. 前端调用 wx.login() 获取 code
   * 2. 后端使用 code 调用微信接口换取 openid
   * 3. 参考文档：https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{27,32}$/, {
    message: 'OpenID 格式不正确，应为27-32位字母数字字符串',
  })
  openid!: string;
}
