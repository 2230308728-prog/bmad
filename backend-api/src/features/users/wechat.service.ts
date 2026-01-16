import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface Jscode2sessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly jscode2sessionUrl =
    'https://api.weixin.qq.com/sns/jscode2session';
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.appId = this.configService.get<string>('WECHAT_APP_ID') || '';
    this.appSecret = this.configService.get<string>('WECHAT_APP_SECRET') || '';

    if (!this.appId || !this.appSecret) {
      throw new Error('WECHAT_APP_ID and WECHAT_APP_SECRET must be configured');
    }
  }

  /**
   * 使用微信 code 换取 openid
   * @param code 微信登录 code
   * @returns openid
   * @throws UnauthorizedException 如果微信 API 调用失败
   */
  async jscode2session(code: string): Promise<string> {
    try {
      this.logger.log(
        `Exchanging code for openid: ${code.substring(0, 10)}...`,
      );

      const params = {
        appid: this.appId,
        secret: this.appSecret,
        js_code: code,
        grant_type: 'authorization_code',
      };

      const response = await firstValueFrom(
        this.httpService.get<Jscode2sessionResponse>(this.jscode2sessionUrl, {
          params,
          timeout: 5000,
        }),
      );

      if (response.data.errcode) {
        this.logger.error(
          `WeChat API error: ${response.data.errcode} - ${response.data.errmsg}`,
        );
        throw new UnauthorizedException('微信授权失败，请重试');
      }

      this.logger.log(
        `Successfully obtained openid: ${response.data.openid.substring(0, 10)}...`,
      );

      return response.data.openid;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `WeChat API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new UnauthorizedException('微信授权失败，请重试');
    }
  }
}
