import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WxPay from 'wechatpay-node-v3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

/**
 * 微信支付 JSAPI 支付参数
 */
export interface JsapiPaymentParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

/**
 * 微信支付订单查询结果
 */
export interface WechatPayOrderQueryResult {
  appid: string;
  mchid: string;
  out_trade_no: string;
  transaction_id: string;
  trade_type: string;
  trade_state: 'SUCCESS' | 'REFUND' | 'NOTPAY' | 'CLOSED' | 'REVOKED' | 'USERPAYING' | 'PAYERROR';
  trade_state_desc: string;
  bank_type: string;
  attach: string;
  success_time: string;
  payer: {
    openid: string;
  };
  amount: {
    total: number;
    payer_total: number;
    currency: string;
    payer_currency: string;
  };
}

/**
 * 微信支付回调通知数据
 */
export interface WechatPayNotifyData {
  appid: string;
  mchid: string;
  out_trade_no: string;
  transaction_id: string;
  trade_type: string;
  trade_state: string;
  trade_state_desc: string;
  bank_type: string;
  attach: string;
  success_time: string;
  payer: {
    openid: string;
  };
  amount: {
    total: number;
    payer_total: number;
    currency: string;
    payer_currency: string;
  };
  scene_info: {
    device_id: string;
  };
  promote_info: string;
}

/**
 * 微信支付退款申请结果
 */
export interface WechatRefundResult {
  refund_id: string;
  out_refund_no: string;
  transaction_id: string;
  out_trade_no: string;
  channel: string;
  user_received_account: string;
  success_time: string;
  create_time: string;
  status: 'SUCCESS' | 'ABNORMAL' | 'PROCESSING';
  amount: {
    total: number;
    refund: number;
    payer_total: number;
    payer_refund: number;
    settlement_refund: number;
    settlement_total: number;
    currency: string;
    refund_fee: number;
    payer_refund_fee: number;
    settlement_refund_fee: number;
  };
}

/**
 * 微信支付退款查询结果
 */
export interface WechatRefundQueryResult {
  refund_id: string;
  out_refund_no: string;
  transaction_id: string;
  out_trade_no: string;
  channel: string;
  user_received_account: string;
  success_time: string;
  create_time: string;
  status: 'SUCCESS' | 'ABNORMAL' | 'PROCESSING';
  amount: {
    total: number;
    refund: number;
    payer_total: number;
    payer_refund: number;
    settlement_refund: number;
    settlement_total: number;
    currency: string;
  };
}

/**
 * 微信支付退款回调通知数据
 */
export interface WechatRefundNotifyData {
  refund_id: string;
  out_refund_no: string;
  transaction_id: string;
  out_trade_no: string;
  channel: string;
  user_received_account: string;
  success_time: string;
  create_time: string;
  status: 'SUCCESS' | 'ABNORMAL' | 'PROCESSING';
  amount: {
    total: number;
    refund: number;
    payer_total: number;
    payer_refund: number;
    settlement_refund: number;
    settlement_total: number;
    currency: string;
    refund_fee: number;
    payer_refund_fee: number;
    settlement_refund_fee: number;
  };
}

/**
 * 微信支付随机字符串长度（微信支付要求）
 */
const WECHAT_NONCE_LENGTH = 32;

/**
 * WechatPayService
 * 封装微信支付 API v3 核心功能
 * 使用 JSAPI 支付方式
 */
@Injectable()
export class WechatPayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WechatPayService.name);
  /**
   * 微信支付 SDK 实例
   * 注意：使用 any 类型是因为 wechatpay-node-v3 的类型定义与实际使用不完全匹配
   * SDK 要求 publicKey 但 API v3 实际不需要（只需私钥签名）
   */
  private wxpay: {
    transactions_jsapi: (params: any) => Promise<any>;
    query: (params: any) => Promise<any>;
    close: (outTradeNo: string) => Promise<any>;
    verifySign: (params: any) => Promise<boolean>;
    decipher_gcm: (ciphertext: string, associatedData: string, nonce: string, key: string) => any;
    sha256WithRsa: (data: string) => string;
    refund: (params: any) => Promise<any>;
    query_refund: (params: any) => Promise<any>;
  } | null = null;
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

      // 创建微信支付实例
      // 注意：SDK 类型定义要求 publicKey，但微信支付 API v3 实际只需要私钥进行签名
      // publicKey 仅用于验证服务器证书（可选功能），因此传空 Buffer 作为占位
      this.wxpay = new WxPay({
        appid: this.appId,
        mchid: this.mchId,
        serial_no: this.serialNo,
        publicKey: Buffer.from(''), // 占位：API v3 不需要公钥，仅需私钥签名
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
        const errorMsg = `微信支付 API 返回错误: status=${result.status}, data=${JSON.stringify(result.data || {})}`;
        this.logger.error(`JSAPI 订单创建失败 [orderNo: ${outTradeNo}]: ${errorMsg}`);
        throw new Error('微信支付下单失败，请稍后重试');
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
   * @param length 字符串长度（默认为微信支付要求的 32 位）
   * @returns 随机字符串
   */
  private generateNonceStr(length: number = WECHAT_NONCE_LENGTH): string {
    return randomBytes(length / 2).toString('hex');
  }

  /**
   * 生成 JSAPI 支付参数（供小程序调起支付）
   * @param prepayId 预支付交易会话标识
   * @returns JSAPI 支付参数
   */
  generateJsapiParams(prepayId: string): JsapiPaymentParams {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const timeStamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const packageStr = `prepay_id=${prepayId}`;
      const signType = 'RSA';

      // 构建签名字符串（微信支付 JSAPI 签名规范）
      // 格式：appId\n timeStamp\n nonceStr\n packageStr\n （注意末尾的 \n）
      // 末尾的空字符串是微信签名规范要求的，不能省略
      const signStr = [
        this.appId,
        timeStamp,
        nonceStr,
        packageStr,
        '', // 末尾空字符串，符合微信签名规范
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
  async queryOrder(outTradeNo: string): Promise<WechatPayOrderQueryResult> {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const result = await this.wxpay.query({
        out_trade_no: outTradeNo,
      });

      if (result.status !== 200 || !result.data) {
        const errorMsg = `微信支付 API 返回错误: status=${result.status}, data=${JSON.stringify(result.data || {})}`;
        this.logger.error(`订单查询失败 [orderNo: ${outTradeNo}]: ${errorMsg}`);
        throw new Error('查询订单失败，请稍后重试');
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
  decipherNotify(ciphertext: string, associatedData: string, nonce: string): WechatPayNotifyData {
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

  /**
   * 申请退款
   * @param orderNo 商户订单号
   * @param refundNo 商户退款单号
   * @param amount 退款金额（单位：分）
   * @param totalAmount 订单总金额（单位：分）
   * @param reason 退款原因
   * @returns 退款结果
   */
  async refund(
    orderNo: string,
    refundNo: string,
    amount: number,
    totalAmount: number,
    reason: string,
  ): Promise<WechatRefundResult> {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const result = await this.wxpay.refund({
        out_trade_no: orderNo,
        out_refund_no: refundNo,
        reason,
        notify_url: this.notifyUrl.replace('/notify', '/refund/notify'),
        amount: {
          refund: amount,
          total: totalAmount,
          currency: 'CNY',
        },
      });

      // 检查响应状态
      if (result.status !== 200 || !result.data) {
        const errorMsg = `微信支付 API 返回错误: status=${result.status}, data=${JSON.stringify(result.data || {})}`;
        this.logger.error(`退款申请失败 [orderNo: ${orderNo}, refundNo: ${refundNo}]: ${errorMsg}`);
        throw new Error('微信退款申请失败，请稍后重试');
      }

      const refundResult: WechatRefundResult = result.data;
      this.logger.log(
        `退款申请成功 [orderNo: ${orderNo}, refundNo: ${refundNo}, refundId: ${refundResult.refund_id}, status: ${refundResult.status}]`,
      );

      return refundResult;
    } catch (error) {
      this.logger.error(
        `退款申请失败 [orderNo: ${orderNo}, refundNo: ${refundNo}]: ${(error as Error).message}`,
      );
      throw new Error(`微信退款申请失败: ${(error as Error).message}`);
    }
  }

  /**
   * 查询退款
   * @param outRefundNo 商户退款单号
   * @returns 退款信息
   */
  async queryRefund(outRefundNo: string): Promise<WechatRefundQueryResult> {
    if (!this.wxpay) {
      throw new Error('微信支付服务不可用');
    }

    try {
      const result = await this.wxpay.query_refund({
        out_refund_no: outRefundNo,
      });

      if (result.status !== 200 || !result.data) {
        const errorMsg = `微信支付 API 返回错误: status=${result.status}, data=${JSON.stringify(result.data || {})}`;
        this.logger.error(`退款查询失败 [refundNo: ${outRefundNo}]: ${errorMsg}`);
        throw new Error('查询退款失败，请稍后重试');
      }

      const refundResult: WechatRefundQueryResult = result.data;
      this.logger.log(
        `退款查询成功 [refundNo: ${outRefundNo}, refundId: ${refundResult.refund_id}, status: ${refundResult.status}]`,
      );

      return refundResult;
    } catch (error) {
      this.logger.error(`退款查询失败 [refundNo: ${outRefundNo}]: ${(error as Error).message}`);
      throw error;
    }
  }
}
