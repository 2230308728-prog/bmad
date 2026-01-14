import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

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
}
