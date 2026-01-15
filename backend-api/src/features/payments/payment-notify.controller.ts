import {
  Controller,
  Post,
  Headers,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, PaymentChannel, Prisma, Order } from '@prisma/client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { WechatPayService, WechatPayNotifyData } from './wechat-pay.service';
import { WechatPayNotifyDto } from './dto/wechat-pay-notify.dto';
import { CacheService } from '../../redis/cache.service';

/**
 * 订单类型（包含 items）
 */
type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

/**
 * 微信支付回调响应类型
 */
interface WechatPayNotifyResponse {
  code: 'SUCCESS' | 'FAIL';
  message: string;
}

/**
 * Payment Notify Controller
 * 处理微信支付回调通知（无需认证，微信服务器调用）
 */
@ApiTags('payment-notify')
@Controller('v1/orders/payment')
export class PaymentNotifyController {
  private readonly logger = new Logger(PaymentNotifyController.name);

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 处理微信支付回调通知
   * @param notifyDto 回调通知数据
   * @param headers 微信支付回调头
   * @returns JSON 响应（微信兼容）
   */
  @Post('notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '微信支付回调通知',
    description: `接收并处理微信支付结果通知。

**重要说明：**
- 此端点不需要认证（微信服务器直接调用）
- 必须验证签名确保数据来源可信
- 返回 JSON 格式（微信要求兼容）

**回调流程：**
1. 微信支付服务器调用此端点
2. 验证签名和数据完整性
3. 解密回调数据
4. 更新订单状态
5. 返回成功响应

**幂等性保证：**
- 重复通知直接返回成功
- 订单已处理则跳过`,
  })
  @ApiResponse({
    status: 200,
    description: '处理成功',
    schema: {
      example: {
        code: 'SUCCESS',
        message: '成功',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '幂等性响应（订单已处理）',
    schema: {
      example: {
        code: 'SUCCESS',
        message: '成功',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '处理失败（微信会重试通知）',
    schema: {
      example: {
        code: 'FAIL',
        message: '处理失败',
      },
    },
  })
  @ApiHeader({
    name: 'wechatpay-timestamp',
    description: '微信支付传递时间戳',
    required: true,
    example: '1645123456',
  })
  @ApiHeader({
    name: 'wechatpay-nonce',
    description: '微信支付传递随机串',
    required: true,
    example: 'abc123',
  })
  @ApiHeader({
    name: 'wechatpay-signature',
    description: '微信支付传递签名',
    required: true,
    example: 'signature...',
  })
  @ApiHeader({
    name: 'wechatpay-serial',
    description: '微信支付传递证书序列号',
    required: true,
    example: 'serial123',
  })
  @ApiResponse({
    status: 200,
    description: '请求体示例',
    schema: {
      example: {
        id: 'notify-id-123',
        create_time: '2024-01-14T10:00:00+08:00',
        resource_type: 'encrypt-resource',
        event_type: 'TRANSACTION.SUCCESS',
        resource: {
          algorithm: 'AEAD_AES_256_GCM',
          ciphertext: 'encrypted-data...',
          nonce: 'nonce123',
          associated_data: 'associated-data',
        },
      },
    },
  })
  async handlePaymentNotify(
    @Body() notifyDto: WechatPayNotifyDto,
    @Headers() headers: {
      'wechatpay-timestamp'?: string;
      'wechatpay-nonce'?: string;
      'wechatpay-signature'?: string;
      'wechatpay-serial'?: string;
    },
  ): Promise<WechatPayNotifyResponse> {
    try {
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const signature = headers['wechatpay-signature'];
      const serial = headers['wechatpay-serial'];

      // 验证必需的请求头
      if (!timestamp || !nonce || !signature || !serial) {
        this.logger.warn(`支付回调缺少必需的请求头`);
        throw new HttpException('Invalid request headers', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      this.logger.log(
        `收到支付回调通知: notifyId=${notifyDto.id}, eventType=${notifyDto.event_type}`,
      );

      // 1. 验证签名
      const isValid = await this.wechatPayService.verifyNotify(
        timestamp,
        nonce,
        JSON.stringify(notifyDto),
        signature,
        serial,
      );

      if (!isValid) {
        this.logger.warn(`支付回调签名验证失败`);
        throw new HttpException('Signature verification failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // 2. 解密数据
      const { ciphertext, nonce: encryptNonce, associated_data } = notifyDto.resource;
      const notifyData: WechatPayNotifyData = this.wechatPayService.decipherNotify(
        ciphertext,
        associated_data,
        encryptNonce,
      );

      this.logger.log(
        `支付回调数据解密成功: orderNo=${notifyData.out_trade_no}, tradeState=${notifyData.trade_state}`,
      );

      // 3. 查询订单
      const order = await this.prisma.order.findFirst({
        where: {
          orderNo: notifyData.out_trade_no,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        this.logger.error(`订单不存在: orderNo=${notifyData.out_trade_no}`);
        throw new HttpException('Order not found', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // 4. 幂等性检查：订单已处理则直接返回成功
      if (
        (notifyData.trade_state === 'SUCCESS' &&
          order.status === OrderStatus.PAID &&
          order.paymentStatus === PaymentStatus.SUCCESS) ||
        (notifyData.trade_state !== 'SUCCESS' &&
          (order.status === OrderStatus.CANCELLED ||
            order.paymentStatus === PaymentStatus.CANCELLED))
      ) {
        this.logger.log(`订单已处理，直接返回成功: orderNo=${order.orderNo}, status=${order.status}`);
        return { code: 'SUCCESS', message: '成功' };
      }

      // 5. 验证金额
      const notifyAmount = notifyData.amount.total;
      const orderAmount = Prisma.Decimal.mul(order.actualAmount, 100).toNumber();

      if (notifyAmount !== orderAmount) {
        this.logger.error(
          `金额不匹配: orderNo=${order.orderNo}, notifyAmount=${notifyAmount}, orderAmount=${orderAmount}`,
        );
        throw new HttpException('Amount mismatch', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // 6. 处理支付结果
      if (notifyData.trade_state === 'SUCCESS') {
        await this.processPaymentSuccess(order, notifyData);
      } else {
        await this.processPaymentFailure(order, notifyData);
      }

      return { code: 'SUCCESS', message: '成功' };
    } catch (error) {
      // 记录详细错误但不暴露给调用者
      this.logger.error(
        `处理支付回调失败: notifyId=${notifyDto.id}`,
        error,
      );

      // 重新抛出让 NestJS 返回 500
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 处理支付成功
   */
  private async processPaymentSuccess(
    order: OrderWithItems,
    notifyData: WechatPayNotifyData,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. 更新订单状态
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.SUCCESS,
            paidAt: new Date(notifyData.success_time),
          },
        });

        // 2. 创建支付记录
        await tx.paymentRecord.create({
          data: {
            orderId: order.id,
            transactionId: notifyData.transaction_id,
            outTradeNo: notifyData.out_trade_no,
            channel: PaymentChannel.WECHAT_JSAPI,
            amount: order.actualAmount,
            status: PaymentStatus.SUCCESS,
            prepayId: null,
            tradeType: notifyData.trade_type,
            notifyData: notifyData as any,
            notifiedAt: new Date(),
          },
        });

        // 3. 更新产品预订计数
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              bookingCount: {
                increment: item.quantity,
              },
            },
          });

          // 4. 清除产品相关缓存
          await this.cacheService.del(`product:detail:${item.productId}`);
        }

        this.logger.log(
          `支付成功处理完成: orderNo=${order.orderNo}, transactionId=${notifyData.transaction_id}`,
        );
      });

      // TODO: 5. 发送支付成功通知（Story 5.7 完善）
      this.logger.log(`占位：发送支付成功通知: orderNo=${order.orderNo}`);
    } catch (error) {
      this.logger.error(
        `处理支付成功失败: orderNo=${order.orderNo}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 处理支付失败（使用事务保护确保一致性）
   */
  private async processPaymentFailure(
    order: OrderWithItems,
    notifyData: WechatPayNotifyData,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. 更新订单状态
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        // 2. 释放 Redis 预扣库存
        for (const item of order.items) {
          const stockKey = `product:stock:${item.productId}`;
          await this.cacheService.incrby(stockKey, item.quantity);
          this.logger.debug(
            `释放预扣库存: productId=${item.productId}, quantity=${item.quantity}`,
          );
        }
      });

      this.logger.log(`支付失败处理完成: orderNo=${order.orderNo}, tradeState=${notifyData.trade_state}`);
    } catch (error) {
      this.logger.error(
        `处理支付失败失败: orderNo=${order.orderNo}`,
        error,
      );
      throw error;
    }
  }
}
