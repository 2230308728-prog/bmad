import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { AdminQueryOrdersDto } from './dto/admin/admin-query-orders.dto';
import { UpdateOrderStatusDto } from './dto/admin/update-order-status.dto';
import { OrderStatus } from '@prisma/client';
import { isValidStatusTransition } from './dto/admin/update-order-status.dto';

/**
 * 管理员订单服务
 * 处理管理员视角的订单查询、状态更新和统计功能
 */
@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 查询所有订单（管理员视角）
   * @param queryDto 查询参数
   * @returns 分页订单列表
   */
  async findAll(queryDto: AdminQueryOrdersDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      orderNo,
      userId,
      startDate,
      endDate,
      productId,
    } = queryDto;

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建 WHERE 条件
    const where: import('@prisma/client').Prisma.OrderWhereInput = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 订单编号搜索（部分匹配）
    if (orderNo) {
      where.orderNo = {
        contains: orderNo,
      };
    }

    // 用户 ID 筛选
    if (userId) {
      where.userId = userId;
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

    // 产品 ID 筛选（通过订单项关联）
    if (productId) {
      where.items = {
        some: {
          productId,
        },
      };
    }

    // 并行查询订单数据和总数
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              createdAt: true,
            },
          },
          items: {
            take: 1, // 只取第一个订单项获取产品信息
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
      actualAmount: order.actualAmount?.toString() || '0.00',
      user: {
        id: order.user.id,
        name: order.user.name,
        phone: order.user.phone, // 管理员可见完整手机号
        role: order.user.role,
      },
      product: order.items[0]
        ? {
            id: order.items[0].productId,
            title: order.items[0].productName,
            price: order.items[0].productPrice.toString(),
          }
        : null,
      bookingDate: order.bookingDate?.toISOString().split('T')[0] || '',
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
   * 查询订单详情（管理员视角）
   * @param orderId 订单 ID
   * @returns 完整订单详情（不脱敏）
   */
  async findOne(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        refunds: {
          orderBy: { appliedAt: 'desc' },
        },
        statusHistory: {
          include: {
            changedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!order) {
      this.logger.warn(`订单不存在: orderId=${orderId}`);
      throw new NotFoundException('订单不存在');
    }

    // 构建响应数据
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount.toString(),
      actualAmount: order.actualAmount?.toString() || '0.00',
      remark: order.remark,
      contactName: order.contactName,
      contactPhone: order.contactPhone || '', // 管理员可见完整手机号
      childName: order.childName,
      childAge: order.childAge,
      bookingDate: order.bookingDate?.toISOString().split('T')[0] || '',
      participantCount: order.participantCount,
      paidAt: order.paidAt?.toISOString(),
      completedAt: order.completedAt?.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString(),
      refundedAt: order.refundedAt?.toISOString(),
      createdAt: order.createdAt.toISOString(),
      user: {
        id: order.user.id,
        name: order.user.name,
        phone: order.user.phone,
        role: order.user.role,
        createdAt: order.user.createdAt.toISOString(),
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
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
        adminNote: refund.adminNote,
        status: refund.status,
        appliedAt: refund.appliedAt.toISOString(),
        approvedAt: refund.approvedAt?.toISOString(),
        wechatRefundId: refund.wechatRefundId,
      })),
      statusHistory: order.statusHistory.map((history) => ({
        id: history.id,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        reason: history.reason,
        changedBy: history.changedBy,
        changedByName: history.changedByUser.name,
        changedAt: history.changedAt.toISOString(),
      })),
    };
  }

  /**
   * 更新订单状态
   * @param orderId 订单 ID
   * @param updateDto 状态更新请求
   * @param adminId 管理员 ID
   * @returns 更新后的订单
   */
  async updateStatus(orderId: number, updateDto: UpdateOrderStatusDto, adminId: number) {
    const { status, reason } = updateDto;

    // 查询订单
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      this.logger.warn(`订单不存在: orderId=${orderId}`);
      throw new NotFoundException('订单不存在');
    }

    // 验证状态转换合法性
    if (!isValidStatusTransition(order.status, status)) {
      throw new BadRequestException(
        `不允许从状态 ${order.status} 转换到 ${status}`,
      );
    }

    // 构建更新数据
    const updateData: import('@prisma/client').Prisma.OrderUpdateInput = {
      status,
    };

    // 根据新状态设置相应时间戳
    if (status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    } else if (status === OrderStatus.REFUNDED) {
      updateData.refundedAt = new Date();
    }

    // 使用事务更新订单和创建状态历史
    const result = await this.prisma.$transaction(async (tx) => {
      // 更新订单
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      // 创建状态历史记录
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: status,
          reason: reason || `状态从 ${order.status} 更新为 ${status}`,
          changedBy: adminId,
        },
      });

      // 如果状态为 REFUNDED，创建初始退款记录
      if (status === OrderStatus.REFUNDED) {
        // 检查是否已有 PENDING 或 PROCESSING 状态的退款记录（唯一约束验证）
        const existingActiveRefund = await tx.refundRecord.findFirst({
          where: {
            orderId,
            status: {
              in: ['PENDING', 'PROCESSING'],
            },
          },
        });

        if (existingActiveRefund) {
          throw new BadRequestException(
            `该订单已存在退款申请（退款单号: ${existingActiveRefund.refundNo}），无法重复创建`,
          );
        }

        // 检查是否已有其他状态的退款记录
        const existingRefund = await tx.refundRecord.findFirst({
          where: { orderId },
        });

        if (!existingRefund) {
          // 生成退款编号
          const refundNo = `REF${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

          await tx.refundRecord.create({
            data: {
              refundNo,
              orderId,
              userId: order.userId,
              status: 'PENDING',
              amount: order.actualAmount,
              reason: reason || '管理员发起退款',
              description: '订单状态更新为退款时自动创建',
            },
          });
        }
      }

      return updatedOrder;
    });

    this.logger.log(
      `订单状态已更新: orderId=${orderId}, ${order.status} → ${status}`,
    );

    // 清除相关 Redis 缓存
    try {
      await this.cacheService.del(`order:${orderId}`);
      await this.cacheService.del(`order:list:*`);
      this.logger.log(`已清除订单 ${orderId} 的相关缓存`);
    } catch (error) {
      this.logger.error(`清除缓存失败:`, error);
      // 缓存清除失败不影响订单更新操作
    }

    // 返回更新后的订单详情
    return this.findOne(orderId);
  }

  /**
   * 获取订单统计数据
   * @returns 统计数据
   */
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 并行查询各状态订单数量和今日数据
    const [
      total,
      pendingCount,
      paidCount,
      completedCount,
      cancelledCount,
      refundedCount,
      todayOrders,
    ] = await Promise.all([
      // 总订单数
      this.prisma.order.count(),
      // 各状态订单数
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PAID } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.order.count({ where: { status: OrderStatus.REFUNDED } }),
      // 今日订单
      this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        select: {
          totalAmount: true,
        },
      }),
    ]);

    // 计算今日订单数和金额
    const todayCount = todayOrders.length;
    const todayAmount = todayOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );

    return {
      total,
      pending: pendingCount,
      paid: paidCount,
      completed: completedCount,
      cancelled: cancelledCount,
      refunded: refundedCount,
      todayCount,
      todayAmount: todayAmount.toFixed(2),
    };
  }
}
