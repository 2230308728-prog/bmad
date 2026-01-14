import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WxPay from 'wechatpay-node-v3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

/**
 * WechatPayService
 * 封装微信支付 API v3 核心功能
 * 使用 JSAPI 支付方式
 */
@Injectable()
export class WechatPayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WechatPayService.name);
  private wxpay: any | null = null;
  private appId: string;
  private mchId: string;
  private apiV3Key: string;
  private serialNo: string;
  private privateKeyPath: string;
  private notifyUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('WECHAT_PAY_APPID', '');
    this.mchId = this.configService.get<string>('WECHAT_PAY_MCHID', '');
    this.serialNo = this.configService.get<string>('WECHAT_PAY_SERIAL_NO', '');
    this.privateKeyPath = this.configService.get<string>('WECHAT_PAY_PRIVATE_KEY_PATH', '');
    this.apiV3Key = this.configService.get<string>('WECHAT_PAY_APIV3_KEY', '');
    this.notifyUrl = this.configService.get<string>('WECHAT_PAY_NOTIFY_URL', '');
  }

  /**
   * 模块初始化时创建微信支付实例
   */
  onModuleInit(): void {
    try {
      // 验证必需的配置
      if (!this.appId || !this.mchId || !this.serialNo || !this.apiV3Key) {
        this.logger.warn('微信支付配置不完整，支付功能将不可用');
        return;
      }

      // 读取商户私钥
      let privateKey: Buffer;
      try {
        const keyPath = join(process.cwd(), this.privateKeyPath);
        privateKey = readFileSync(keyPath);
      } catch (error) {
        this.logger.error(`读取商户私钥失败 [path: ${this.privateKeyPath}]: ${(error as Error).message}`);
        return;
      }

      // 创建微信支付实例（不需要 publicKey，使用私钥初始化）
      this.wxpay = new WxPay({
        appid: this.appId,
        mchid: this.mchId,
        serial_no: this.serialNo,
        publicKey: Buffer.from(''), // 占位，实际不需要
        privateKey: privateKey,
        key: this.apiV3Key,
      });

      this.logger.log('微信支付服务初始化成功');
    } catch (error) {
      this.logger.error(`微信支付服务初始化失败: ${(error as Error).message}`);
      this.wxpay = null;
    }
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy(): void {
    this.wxpay = null;
    this.logger.log('微信支付服务已关闭');
  }

  /**
   * 检查微信支付服务是否可用
   */
  isAvailable(): boolean {
    return this.wxpay !== null;
  }

  /**
   * 创建 JSAPI 支付订单
   * @param description 商品描述
   * @param outTradeNo 商户订单号（使用订单号）
   * @param totalAmount 订单总金额（单位：分）
   * @param openid 用户 openid
   * @returns 微信支付返回的 prepayId
   */
  async createJsapiOrder(
    description: string,
    outTradeNo: string,
    totalAmount: number,
    openid: string,
  ): Promise<string> {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用，请检查配置');
    }

    try {
      const result = await this.wxpay.transactions_jsapi({
        description,
        out_trade_no: outTradeNo,
        notify_url: this.notifyUrl,
        amount: {
          total: totalAmount, // 单位：分
          currency: 'CNY',
        },
        payer: {
          openid,
        },
      });

      // 检查响应状态
      if (result.status !== 200 || !result.data) {
        this.logger.error(`JSAPI 订单创建失败 [orderNo: ${outTradeNo}]: ${JSON.stringify(result)}`);
        throw new Error('微信支付下单失败');
      }

      const prepayId = result.data.prepay_id;
      this.logger.log(`JSAPI 订单创建成功 [orderNo: ${outTradeNo}, prepayId: ${prepayId}]`);

      return prepayId;
    } catch (error) {
      this.logger.error(
        `JSAPI 订单创建失败 [orderNo: ${outTradeNo}]: ${(error as Error).message}`,
      );
      throw new Error(`微信支付下单失败: ${(error as Error).message}`);
    }
  }

  /**
   * 生成随机字符串
   * @param length 字符串长度
   * @returns 随机字符串
   */
  private generateNonceStr(length = 32): string {
    return randomBytes(length / 2).toString('hex');
  }

  /**
   * 生成 JSAPI 支付参数（供小程序调起支付）
   * @param prepayId 预支付交易会话标识
   * @returns JSAPI 支付参数
   */
  generateJsapiParams(prepayId: string): {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  } {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const timeStamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const packageStr = `prepay_id=${prepayId}`;
      const signType = 'RSA';

      // 构建签名字符串
      const signStr = [
        this.appId,
        timeStamp,
        nonceStr,
        packageStr,
        '',
      ].join('\n');

      // 使用私钥签名
      const paySign = this.wxpay.sha256WithRsa(signStr);

      this.logger.debug(`JSAPI 支付参数生成成功 [prepayId: ${prepayId}]`);

      return {
        timeStamp,
        nonceStr,
        package: packageStr,
        signType,
        paySign,
      };
    } catch (error) {
      this.logger.error(`JSAPI 支付参数生成失败: ${(error as Error).message}`);
      throw new Error(`生成支付参数失败: ${(error as Error).message}`);
    }
  }

  /**
   * 查询订单
   * @param outTradeNo 商户订单号
   * @returns 订单信息
   */
  async queryOrder(outTradeNo: string): Promise<any> {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const result = await this.wxpay.query({
        out_trade_no: outTradeNo,
      });

      if (result.status !== 200 || !result.data) {
        this.logger.error(`订单查询失败 [orderNo: ${outTradeNo}]: ${JSON.stringify(result)}`);
        throw new Error('查询订单失败');
      }

      const tradeState = result.data.trade_state;
      this.logger.log(`订单查询成功 [orderNo: ${outTradeNo}, tradeState: ${tradeState}]`);
      return result.data;
    } catch (error) {
      this.logger.error(`订单查询失败 [orderNo: ${outTradeNo}]: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 验证支付回调通知签名
   * @param timestamp 微信传递时间戳
   * @param nonce 微信传递随机串
   * @param body 回调请求体
   * @param signature 微信传递签名
   * @param serial 微信传递证书序列号
   * @returns 验证结果
   */
  async verifyNotify(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    serial: string,
  ): Promise<boolean> {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const isValid = await this.wxpay.verifySign({
        timestamp,
        nonce,
        body,
        serial,
        signature,
        apiSecret: this.apiV3Key,
      });

      if (isValid) {
        this.logger.log('支付回调签名验证成功');
      } else {
        this.logger.warn('支付回调签名验证失败');
      }

      return isValid;
    } catch (error) {
      this.logger.error(`支付回调验证失败: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * 解密支付回调通知数据
   * @param ciphertext Base64编码的密文
   * @param associatedData 附加数据
   * @param nonce 加密随机串
   * @returns 解密后的数据
   */
  decipherNotify(ciphertext: string, associatedData: string, nonce: string): any {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const result = this.wxpay.decipher_gcm(ciphertext, associatedData, nonce, this.apiV3Key);
      this.logger.log('支付回调数据解密成功');
      return result;
    } catch (error) {
      this.logger.error(`支付回调数据解密失败: ${(error as Error).message}`);
      throw new Error('解密支付回调数据失败');
    }
  }

  /**
   * 关闭订单
   * @param outTradeNo 商户订单号
   */
  async closeOrder(outTradeNo: string): Promise<void> {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const result = await this.wxpay.close(outTradeNo);

      if (result.status !== 200) {
        this.logger.error(`订单关闭失败 [orderNo: ${outTradeNo}]: ${JSON.stringify(result)}`);
        throw new Error('关闭订单失败');
      }

      this.logger.log(`订单关闭成功 [orderNo: ${outTradeNo}]`);
    } catch (error) {
      this.logger.error(`订单关闭失败 [orderNo: ${outTradeNo}]: ${(error as Error).message}`);
      throw error;
    }
  }
}
