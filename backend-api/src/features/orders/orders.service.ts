import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { maskPhoneNumber } from './dto/order-detail.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { WechatPayService, WechatPayOrderQueryResult } from '../../features/payments/wechat-pay.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Orders Service
 * 处理订单相关的业务逻辑
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly wechatPayService: WechatPayService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 创建订单
   * @param userId 用户 ID
   * @param dto 创建订单 DTO
   * @returns 创建的订单信息
   */
  async create(userId: number, dto: CreateOrderDto) {
    // 1. 验证产品存在且状态为 PUBLISHED
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        status: 'PUBLISHED',
      },
    });

    if (!product) {
      this.logger.warn(`产品不存在或已下架: productId=${dto.productId}`);
      throw new NotFoundException('产品不存在或已下架');
    }

    // 2. 验证库存充足（数据库库存）
    if (product.stock < dto.participantCount) {
      this.logger.warn(
        `产品库存不足: productId=${dto.productId}, stock=${product.stock}, requested=${dto.participantCount}`,
      );
      throw new BadRequestException('库存不足，请选择其他日期或产品');
    }

    // 3. 验证年龄范围
    if (dto.childAge < product.minAge || dto.childAge > product.maxAge) {
      this.logger.warn(
        `孩子年龄不符合产品要求: childAge=${dto.childAge}, minAge=${product.minAge}, maxAge=${product.maxAge}`,
      );
      throw new BadRequestException(
        `产品适用年龄：${product.minAge}-${product.maxAge}岁`,
      );
    }

    // 4. 初始化 Redis 库存（如果不存在）
    const stockKey = `product:stock:${dto.productId}`;
    const currentStock = await this.cacheService.getStock(stockKey);

    if (currentStock === null) {
      // 首次访问，使用数据库库存初始化
      await this.cacheService.setStock(stockKey, product.stock);
      this.logger.debug(`初始化 Redis 库存: productId=${dto.productId}, stock=${product.stock}`);
    }

    // 5. Redis 预扣库存
    const stockPreDeducted = await this.preDeductStock(dto.productId, dto.participantCount);

    if (!stockPreDeducted) {
      this.logger.warn(`Redis 库存预扣失败: productId=${dto.productId}`);
      throw new BadRequestException('库存不足，请选择其他日期或产品');
    }

    // 6. 计算订单总金额
    const totalAmount = product.price.mul(dto.participantCount);

    // 7. 生成订单编号
    const orderNo = this.generateOrderNo();

    // 8. 使用事务创建订单和订单项
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        // 创建订单
        const createdOrder = await tx.order.create({
          data: {
            orderNo,
            userId,
            totalAmount,
            actualAmount: totalAmount,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            remark: dto.remark,
          },
        });

        // 创建订单项（产品快照）
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: product.id,
            productName: product.title,
            productPrice: product.price,
            quantity: dto.participantCount,
            subtotal: totalAmount,
          },
        });

        return createdOrder;
      });

      this.logger.log(`订单创建成功: orderNo=${orderNo}, userId=${userId}`);

      // 9. 返回完整订单信息（包含产品快照）
      return {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        totalAmount: totalAmount.toString(),
        product: {
          id: product.id,
          title: product.title,
          images: product.images,
        },
        bookingDate: dto.bookingDate,
        createdAt: order.createdAt,
      };
    } catch (error) {
      // 回滚 Redis 库存
      await this.rollbackStock(dto.productId, dto.participantCount);
      this.logger.error(
        `订单创建失败，已回滚库存: orderNo=${orderNo}, error=${error}`,
      );
      throw error;
    }
  }

  /**
   * 生成唯一订单编号
   * 格式：ORD + YYYYMMDD + 8位随机数
   * @returns 订单编号
   */
  private generateOrderNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const random = Math.random().toString(10).substring(2, 10).padEnd(8, '0'); // 8位随机数
    return `ORD${date}${random}`;
  }

  /**
   * Redis 库存预扣（原子操作）
   * @param productId 产品 ID
   * @param quantity 扣减数量
   * @returns 是否扣减成功
   */
  private async preDeductStock(productId: number, quantity: number): Promise<boolean> {
    const stockKey = `product:stock:${productId}`;
    const newStock = await this.cacheService.decrby(stockKey, quantity);

    if (newStock === null) {
      this.logger.error(`Redis 库存预扣失败: productId=${productId}`);
      return false;
    }

    if (newStock < 0) {
      // 库存不足，回滚
      await this.cacheService.incrby(stockKey, quantity);
      this.logger.debug(
        `Redis 库存不足，已回滚: productId=${productId}, newStock=${newStock}`,
      );
      return false;
    }

    this.logger.debug(
      `Redis 库存预扣成功: productId=${productId}, quantity=${quantity}, newStock=${newStock}`,
    );
    return true;
  }

  /**
   * Redis 库存回滚
   * @param productId 产品 ID
   * @param quantity 回滚数量
   */
  private async rollbackStock(productId: number, quantity: number): Promise<void> {
    const stockKey = `product:stock:${productId}`;
    await this.cacheService.incrby(stockKey, quantity);
    this.logger.debug(`Redis 库存回滚: productId=${productId}, quantity=${quantity}`);
  }

  /**
   * 检查支付状态查询频率限制
   * @param orderId 订单 ID
   * @returns 是否超过限制（true = 超过限制）
   */
  async checkPaymentQueryRateLimit(orderId: number): Promise<boolean> {
    const currentMinute = Math.floor(Date.now() / 60000); // 当前分钟时间戳
    const rateLimitKey = `payment-query:${orderId}:${currentMinute}`;

    // 获取当前分钟的查询次数
    const count = await this.cacheService.get(rateLimitKey);

    if (count === null) {
      // 首次查询，设置计数为 1，TTL 60 秒
      await this.cacheService.set(rateLimitKey, '1', 60);
      return false;
    }

    const queryCount = parseInt(count || '0', 10);

    if (queryCount >= 10) {
      this.logger.warn(`支付状态查询频率超限: orderId=${orderId}, count=${queryCount}`);
      return true;
    }

    // 递增计数（检查 incr 是否返回 null，表示 Redis 操作失败）
    const newCount = await this.cacheService.incr(rateLimitKey);
    if (newCount === null) {
      this.logger.error(`Redis incr 操作失败: orderId=${orderId}, key=${rateLimitKey}`);
      // Redis 操作失败时，为了安全起见，限制请求
      return true;
    }

    return false;
  }

  /**
   * 检查订单支付状态
   * @param orderId 订单 ID
   * @param userId 当前用户 ID
   * @returns 支付状态响应
   */
  async checkPaymentStatus(orderId: number, userId: number) {
    // 1. 查询订单并验证所有权（包含支付记录以获取 transactionId）
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: {
        items: true,
        payments: {
          where: { status: PaymentStatus.SUCCESS },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      this.logger.warn(`订单不存在: orderId=${orderId}`);
      throw new NotFoundException('订单不存在');
    }

    if (order.userId !== userId) {
      this.logger.warn(`订单不属于当前用户: orderId=${orderId}, userId=${userId}, orderUserId=${order.userId}`);
      throw new ForbiddenException('无权访问此订单');
    }

    // 获取最新的支付记录
    const latestPayment = order.payments[0];
    const transactionId = latestPayment?.transactionId;

    // 2. 如果订单已是 PAID 状态，直接返回成功
    if (order.status === OrderStatus.PAID) {
      this.logger.log(`订单已支付: orderNo=${order.orderNo}`);
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: OrderStatus.PAID,
        paidAt: order.paidAt?.toISOString(),
        paidAmount: order.actualAmount?.toString(),
        transactionId: transactionId || undefined,
      };
    }

    // 3. 如果订单已是 CANCELLED/REFUNDED/COMPLETED 状态，直接返回
    if (order.status === OrderStatus.CANCELLED) {
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: OrderStatus.CANCELLED,
        message: '订单已取消',
      };
    }

    if (order.status === OrderStatus.REFUNDED) {
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: OrderStatus.REFUNDED,
        message: '订单已退款',
      };
    }

    if (order.status === OrderStatus.COMPLETED) {
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: OrderStatus.COMPLETED,
        paidAt: order.paidAt?.toISOString(),
        paidAmount: order.actualAmount?.toString(),
      };
    }

    // 4. 如果订单不是 PENDING 状态，直接返回当前状态
    if (order.status !== OrderStatus.PENDING) {
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: order.status,
      };
    }

    // 5. PENDING 状态：主动查询微信支付状态
    try {
      const wechatResult = await this.wechatPayService.queryOrder(order.orderNo);

      // 6. 根据微信返回状态处理
      if (wechatResult.trade_state === 'SUCCESS') {
        // 支付成功：更新订单状态（复用回调逻辑）
        await this.processPaymentSuccess(order, wechatResult);

        return {
          orderId: order.id,
          orderNo: order.orderNo,
          status: OrderStatus.PAID,
          paidAt: new Date(wechatResult.success_time).toISOString(),
          paidAmount: (wechatResult.amount.total / 100).toFixed(2),
          transactionId: wechatResult.transaction_id,
        };
      }

      if (wechatResult.trade_state === 'USERPAYING') {
        // 支付中
        return {
          status: OrderStatus.PENDING,
          message: '支付处理中，请稍后查询',
        };
      }

      if (wechatResult.trade_state === 'PAYERROR' || wechatResult.trade_state === 'CLOSED') {
        // 支付失败或关闭：更新订单状态，释放库存
        await this.processPaymentFailure(order);

        return {
          orderId: order.id,
          orderNo: order.orderNo,
          status: OrderStatus.CANCELLED,
          message: wechatResult.trade_state === 'CLOSED' ? '支付已关闭' : '支付失败',
        };
      }

      // 其他状态（NOTPAY, REFUND, REVOKED）
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: OrderStatus.PENDING,
        message: '等待支付',
      };
    } catch (error) {
      this.logger.error(`查询微信支付状态失败: orderNo=${order.orderNo}`, error);

      // 对于验证错误（BadRequestException），直接向上抛出
      if (error instanceof BadRequestException) {
        throw error;
      }

      // 微信 API 调用失败，返回订单当前状态
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: order.status,
        message: '无法获取支付状态，请稍后重试',
      };
    }
  }

  /**
   * 处理支付成功（复用 Story 4.4 逻辑）
   * @param order 订单
   * @param wechatResult 微信支付查询结果
   */
  private async processPaymentSuccess(order: any, wechatResult: WechatPayOrderQueryResult): Promise<void> {
    // 验证微信支付响应数据完整性
    this.validateWechatPayResponse(wechatResult);

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. 更新订单状态（不包含 transactionId，它在 PaymentRecord 中）
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.SUCCESS,
            paidAt: new Date(wechatResult.success_time),
          },
        });

        // 2. 创建支付记录（transactionId 在这里存储）
        await tx.paymentRecord.create({
          data: {
            orderId: order.id,
            transactionId: wechatResult.transaction_id,
            outTradeNo: wechatResult.out_trade_no,
            channel: 'WECHAT_JSAPI',
            amount: order.actualAmount,
            status: PaymentStatus.SUCCESS,
            prepayId: null,
            tradeType: wechatResult.trade_type,
            notifyData: wechatResult as any,
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
          `支付成功处理完成（主动查询）: orderNo=${order.orderNo}, transactionId=${wechatResult.transaction_id}`,
        );
      });

      // Story 5.7: 发送订单确认通知
      // NOTE: 通知发送失败不影响主流程（记录日志即可）
      try {
        const firstItem = order.items[0];
        if (firstItem) {
          await this.notificationsService.sendOrderConfirmNotification(
            order.userId,
            order.orderNo,
            firstItem.productName,
            order.bookingDate || new Date(),
            firstItem.quantity,
            order.contactPhone || '',
            parseFloat(order.actualAmount?.toString() || '0'),
          );
        }
      } catch (notificationError) {
        // 通知发送失败不影响主流程，仅记录日志
        this.logger.warn(
          `订单确认通知发送失败（不影响主流程）: orderNo=${order.orderNo}, error=${notificationError}`,
        );
      }
    } catch (error) {
      this.logger.error(`处理支付成功失败: orderNo=${order.orderNo}`, error);
      throw error;
    }
  }

  /**
   * 验证微信支付响应数据完整性
   * @param wechatResult 微信支付查询结果
   * @throws BadRequestException 当响应数据不完整或无效时
   */
  private validateWechatPayResponse(wechatResult: WechatPayOrderQueryResult): void {
    if (!wechatResult.transaction_id || wechatResult.transaction_id.trim() === '') {
      this.logger.error(`微信支付响应缺少 transaction_id: orderNo=${wechatResult.out_trade_no}`);
      throw new BadRequestException('微信支付响应数据无效：缺少交易号');
    }

    if (!wechatResult.success_time || wechatResult.success_time.trim() === '') {
      this.logger.error(`微信支付响应缺少 success_time: orderNo=${wechatResult.out_trade_no}`);
      throw new BadRequestException('微信支付响应数据无效：缺少支付时间');
    }

    if (!wechatResult.amount || typeof wechatResult.amount.total !== 'number' || wechatResult.amount.total <= 0) {
      this.logger.error(`微信支付响应金额无效: orderNo=${wechatResult.out_trade_no}, amount=${JSON.stringify(wechatResult.amount)}`);
      throw new BadRequestException('微信支付响应数据无效：金额异常');
    }
  }

  /**
   * 处理支付失败（复用 Story 4.4 逻辑）
   * @param order 订单
   */
  private async processPaymentFailure(order: any): Promise<void> {
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

      this.logger.log(`支付失败处理完成（主动查询）: orderNo=${order.orderNo}`);
    } catch (error) {
      this.logger.error(`处理支付失败失败: orderNo=${order.orderNo}`, error);
      throw error;
    }
  }

  /**
   * 查询用户订单列表
   * @param userId 用户 ID
   * @param queryDto 查询参数
   * @returns 分页订单列表
   */
  async findAll(userId: number, queryDto: QueryOrdersDto) {
    const { page = 1, pageSize = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建 WHERE 条件
    const where: any = {
      userId,
    };

    // 应用状态筛选（可选）
    if (status) {
      where.status = status;
    }

    // 构建排序参数
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // 并行查询订单数据和总数
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          items: {
            take: 1, // 只取第一个订单项获取产品名称
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // 构建响应数据
    const data = orders.map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      productName: order.items[0]?.productName || '',
      createdAt: order.createdAt.toISOString(),
    }));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询订单详情
   * @param orderId 订单 ID
   * @param userId 当前用户 ID
   * @returns 订单详情
   */
  async findOne(orderId: number, userId: number) {
    // 查询订单（验证所有权）
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      this.logger.warn(`订单不存在或不属于当前用户: orderId=${orderId}, userId=${userId}`);
      throw new NotFoundException('订单不存在');
    }

    // 应用手机号脱敏
    const maskedPhone = maskPhoneNumber(order.contactPhone || '');

    // 构建响应数据
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      actualAmount: order.actualAmount?.toString() || '0.00',
      remark: order.remark,
      contactName: order.contactName,
      contactPhone: maskedPhone,
      childName: order.childName,
      childAge: order.childAge,
      bookingDate: order.bookingDate?.toISOString().split('T')[0] || '',
      paidAt: order.paidAt?.toISOString(),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productPrice: item.productPrice.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        transactionId: payment.transactionId,
        channel: payment.channel,
        amount: payment.amount.toString(),
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      })),
      refunds: order.refunds.map((refund) => ({
        id: refund.id,
        refundNo: refund.refundNo,
        refundAmount: refund.refundAmount.toString(),
        reason: refund.reason,
        status: refund.status,
        createdAt: refund.createdAt.toISOString(),
      })),
    };
  }
}
