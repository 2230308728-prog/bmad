import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { RefundStatus, OrderStatus, Prisma } from '@prisma/client';
import { AdminQueryRefundsDto } from './dto/admin';

/**
 * Extended Order type with items and payments relations
 */
interface OrderWithItems extends Prisma.OrderGetPayload<{ include: { items: true; payments?: true } }> {
  bookingDate?: Date | null;
}

/**
 * 管理员退款服务
 * 处理管理员视角的退款查询、审核和统计功能
 */
@Injectable()
export class AdminRefundsService {
  private readonly logger = new Logger(AdminRefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 查询所有退款（管理员视角）
   * @param queryDto 查询参数
   * @returns 分页退款列表（PENDING 优先，然后按 appliedAt 降序）
   */
  async findAll(queryDto: AdminQueryRefundsDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      refundNo,
      startDate,
      endDate,
    } = queryDto;

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建 WHERE 条件
    const where: Prisma.RefundRecordWhereInput = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 退款编号搜索（部分匹配）
    if (refundNo) {
      where.refundNo = {
        contains: refundNo,
      };
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 结束日期设为当天的 23:59:59
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateObj;
      }
    }

    // 并行查询退款数据和总数
    const [refunds, total] = await Promise.all([
      this.prisma.refundRecord.findMany({
        where,
        skip,
        take,
        orderBy: [
          { status: 'asc' }, // PENDING 状态在前（RefundStatus enum: PENDING=0, APPROVED=1, REJECTED=2...）
          { createdAt: 'desc' }, // 按申请时间降序
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
          order: {
            include: {
              items: {
                take: 1, // 只取第一个订单项获取产品信息
              },
            },
          },
        },
      }),
      this.prisma.refundRecord.count({ where }),
    ]);

    // 构建响应数据
    const data = refunds.map((refund) => ({
      id: refund.id,
      refundNo: refund.refundNo,
      status: refund.status,
      refundAmount: refund.amount.toString(),
      reason: refund.reason,
      appliedAt: refund.createdAt.toISOString(),
      user: {
        id: refund.user.id,
        name: refund.user.name,
        phone: refund.user.phone, // 管理员可见完整手机号
      },
      order: {
        orderNo: refund.order.orderNo,
        productName: refund.order.items[0]?.productName || '',
      },
    }));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询退款详情（管理员视角）
   * @param refundId 退款 ID
   * @returns 完整退款详情（不脱敏）
   */
  async findOne(refundId: number) {
    const refund = await this.prisma.refundRecord.findUnique({
      where: { id: refundId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        order: {
          include: {
            items: true,
            payments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!refund) {
      this.logger.warn(`退款记录不存在: refundId=${refundId}`);
      throw new NotFoundException('退款记录不存在');
    }

    // 获取第一个订单项的产品信息
    const firstItem = (refund.order as OrderWithItems).items?.[0];
    let product = null;
    if (firstItem) {
      const productData = await this.prisma.product.findUnique({
        where: { id: firstItem.productId },
        select: {
          id: true,
          title: true,
          images: true,
        },
      });
      if (productData) {
        product = {
          id: productData.id,
          title: productData.title,
          images: productData.images,
        };
      }
    }

    // 构建响应数据
    return {
      id: refund.id,
      refundNo: refund.refundNo,
      status: refund.status,
      refundAmount: refund.amount.toString(),
      reason: refund.reason,
      description: refund.description,
      images: refund.images,
      appliedAt: refund.createdAt.toISOString(),
      approvedAt: refund.approvedAt?.toISOString(),
      adminNote: refund.adminNote,
      rejectedReason: refund.rejectedReason,
      rejectedAt: refund.rejectedAt?.toISOString(),
      refundedAt: refund.refundedAt?.toISOString(),
      wechatRefundId: refund.wechatRefundId,
      user: {
        id: refund.user.id,
        name: refund.user.name,
        phone: refund.user.phone, // 管理员可见完整手机号
        role: refund.user.role,
      },
      order: {
        id: refund.order.id,
        orderNo: refund.order.orderNo,
        status: refund.order.status,
        totalAmount: refund.order.totalAmount.toString(),
        actualAmount: refund.order.actualAmount.toString(),
        paymentStatus: refund.order.paymentStatus,
        bookingDate: (refund.order as OrderWithItems).bookingDate?.toISOString().split('T')[0] || null,
        items: (refund.order as OrderWithItems).items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productPrice: item.productPrice.toString(),
          quantity: item.quantity,
          subtotal: item.subtotal.toString(),
        })),
      },
      payments: (refund.order as OrderWithItems).payments?.map((payment) => ({
        id: payment.id,
        transactionId: payment.transactionId,
        channel: payment.channel,
        amount: payment.amount.toString(),
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      })) || [],
      product,
    };
  }

  /**
   * 批准退款
   * @param refundId 退款 ID
   * @param adminNote 管理员备注（可选）
   * @param adminId 管理员 ID
   * @returns 更新后的退款信息
   */
  async approve(refundId: number, adminNote: string | undefined, adminId: number) {
    // 查询退款记录
    const refund = await this.prisma.refundRecord.findUnique({
      where: { id: refundId },
      include: {
        order: true,
      },
    });

    if (!refund) {
      this.logger.warn(`退款记录不存在: refundId=${refundId}`);
      throw new NotFoundException('退款记录不存在');
    }

    // 验证退款状态为 PENDING
    if (refund.status !== RefundStatus.PENDING) {
      this.logger.warn(`退款状态不允许批准: refundId=${refundId}, status=${refund.status}`);
      throw new BadRequestException('只有待审核的退款可以批准');
    }

    // 使用事务更新退款状态和订单状态
    const result = await this.prisma.$transaction(async (tx) => {
      // 更新退款状态为 APPROVED
      const updatedRefund = await tx.refundRecord.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: adminId,
          adminNote: adminNote || null,
        },
      });

      // 更新订单状态为 REFUNDED
      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          status: OrderStatus.REFUNDED,
        },
      });

      return updatedRefund;
    });

    this.logger.log(`退款已批准: refundNo=${result.refundNo}, adminId=${adminId}`);

    // NOTE: 微信退款流程将在 Story 5.6 中实现
    // 当前实现：退款状态已更新为 APPROVED，订单状态已更新为 REFUNDED
    // 后续实现：调用 WechatPayService.refund() 执行实际退款到用户微信账户
    // 退款状态转换流程：APPROVED -> PROCESSING -> SUCCESS/FAILED/COMPLETED

    // 清除相关 Redis 缓存
    try {
      await this.cacheService.del(`refund:${refundId}`);
      await this.cacheService.del(`refund:list:*`);
      await this.cacheService.del(`order:${refund.orderId}`);
      this.logger.log(`已清除退款 ${refundId} 的相关缓存`);
    } catch (error) {
      this.logger.error(`清除缓存失败:`, error);
      // 缓存清除失败不影响退款批准操作
    }

    // 返回更新后的退款详情
    return this.findOne(refundId);
  }

  /**
   * 拒绝退款
   * @param refundId 退款 ID
   * @param rejectedReason 拒绝原因
   * @param adminId 管理员 ID
   * @returns 更新后的退款信息
   */
  async reject(refundId: number, rejectedReason: string, adminId: number) {
    // 验证拒绝原因不为空
    if (!rejectedReason || rejectedReason.trim().length === 0) {
      throw new BadRequestException('拒绝原因不能为空');
    }

    // 查询退款记录
    const refund = await this.prisma.refundRecord.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      this.logger.warn(`退款记录不存在: refundId=${refundId}`);
      throw new NotFoundException('退款记录不存在');
    }

    // 验证退款状态为 PENDING
    if (refund.status !== RefundStatus.PENDING) {
      this.logger.warn(`退款状态不允许拒绝: refundId=${refundId}, status=${refund.status}`);
      throw new BadRequestException('只有待审核的退款可以拒绝');
    }

    // 更新退款状态为 REJECTED（订单状态保持 PAID）
    const result = await this.prisma.refundRecord.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.REJECTED,
        rejectedReason,
        rejectedAt: new Date(),
        // 注意：不修改订单状态，订单保持 PAID 可继续使用
      },
    });

    this.logger.log(`退款已拒绝: refundNo=${result.refundNo}, adminId=${adminId}`);

    // NOTE: 用户通知将在 Story 5.7（微信订阅消息通知）中实现
    // 当前实现：退款状态已更新为 REJECTED，拒绝原因已记录
    // 后续实现：通过微信订阅消息向用户发送退款拒绝通知
    // 用户可在退款列表中查看拒绝原因和详情

    // 清除相关 Redis 缓存
    try {
      await this.cacheService.del(`refund:${refundId}`);
      await this.cacheService.del(`refund:list:*`);
      this.logger.log(`已清除退款 ${refundId} 的相关缓存`);
    } catch (error) {
      this.logger.error(`清除缓存失败:`, error);
      // 缓存清除失败不影响退款拒绝操作
    }

    // 返回更新后的退款详情
    return this.findOne(refundId);
  }

  /**
   * 获取退款统计数据
   * @returns 统计数据
   */
  async getStats() {
    // 并行查询各状态退款数量和金额统计
    const [
      total,
      pendingCount,
      approvedCount,
      rejectedCount,
      processingCount,
      completedCount,
      failedCount,
      pendingRefunds,
      allRefunds,
    ] = await Promise.all([
      // 总退款数
      this.prisma.refundRecord.count(),
      // 各状态退款数
      this.prisma.refundRecord.count({ where: { status: RefundStatus.PENDING } }),
      this.prisma.refundRecord.count({ where: { status: RefundStatus.APPROVED } }),
      this.prisma.refundRecord.count({ where: { status: RefundStatus.REJECTED } }),
      this.prisma.refundRecord.count({ where: { status: RefundStatus.PROCESSING } }),
      this.prisma.refundRecord.count({ where: { status: RefundStatus.COMPLETED } }),
      this.prisma.refundRecord.count({ where: { status: RefundStatus.FAILED } }),
      // 待处理退款（PENDING）的金额统计
      this.prisma.refundRecord.findMany({
        where: { status: RefundStatus.PENDING },
        select: { amount: true },
      }),
      // 所有退款的总金额统计
      this.prisma.refundRecord.findMany({
        select: { amount: true },
      }),
    ]);

    // 计算总退款金额和待处理金额
    const totalAmount = allRefunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );
    const pendingAmount = pendingRefunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );

    return {
      total,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      processing: processingCount,
      completed: completedCount,
      failed: failedCount,
      totalAmount: totalAmount.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
    };
  }
}
