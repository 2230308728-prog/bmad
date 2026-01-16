import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '@/redis/cache.service';
import { QueryUsersDto } from './dto/admin/query-users.dto';
import { QueryUserOrdersDto } from './dto/admin/query-user-orders.dto';
import { UpdateUserStatusDto } from './dto/admin/update-user-status.dto';
import { UserDetailResponseDto } from './dto/admin/user-detail-response.dto';
import { UserStatsResponseDto } from './dto/admin/user-stats-response.dto';
import { UserOrderListResponseDto } from './dto/admin/user-order-list-response.dto';
import { UserOrderSummaryResponseDto } from './dto/admin/user-order-summary-response.dto';
import { UserRefundListResponseDto } from './dto/admin/user-refund-list-response.dto';
import {
  UserStatus,
  Role,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

/**
 * 管理员用户服务
 * 处理管理员视角的用户查询、状态更新和统计功能
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 查询用户列表（管理员视角）
   * @param queryDto 查询参数
   * @returns 分页用户列表
   */
  async findAll(queryDto: QueryUsersDto) {
    const {
      page = 1,
      pageSize = 20,
      role,
      status,
      keyword,
      startDate,
      endDate,
    } = queryDto;

    // 验证日期范围
    this.validateDateRange(startDate, endDate);

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建 WHERE 条件
    const where: import('@prisma/client').Prisma.UserWhereInput = {};

    // 角色筛选
    if (role) {
      where.role = role;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 关键词搜索（昵称或手机号）
    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword } },
      ];
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 使用下一天的 00:00:00 作为结束边界，避免时区问题
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        endDateObj.setHours(0, 0, 0, 0);
        where.createdAt.lt = endDateObj;
      }
    }

    // 并行查询用户数据和总数
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          role: true,
          status: true,
          phone: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // 为每个用户统计订单数和总消费
    const userIds = users.map((u) => u.id);
    const userStats = await this.getUserStatistics(userIds);

    // 构建响应数据
    const data = users.map((user) => {
      const stats = userStats.get(user.id) || {
        orderCount: 0,
        totalSpent: '0.00',
        lastOrderAt: null,
      };
      return {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        phone: this.maskPhone(user.phone), // 手机号脱敏
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        lastOrderAt: stats.lastOrderAt,
        createdAt: user.createdAt,
      };
    });

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询用户详情（管理员视角）
   * @param userId 用户 ID
   * @returns 完整用户信息（不脱敏）
   */
  async findOne(userId: number): Promise<UserDetailResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        openid: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      this.logger.warn(`用户不存在: userId=${userId}`);
      throw new NotFoundException('用户不存在');
    }

    // 统计用户订单信息
    const stats = await this.getUserStatistics([userId]);
    const userStat = stats.get(userId) || {
      orderCount: 0,
      totalSpent: '0.00',
      lastOrderAt: null,
    };

    // 构建响应数据（手机号不脱敏）
    return {
      id: user.id,
      openid: user.openid,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phone: user.phone, // 管理员可见完整手机号
      role: user.role,
      status: user.status,
      orderCount: userStat.orderCount,
      totalSpent: userStat.totalSpent,
      lastLoginAt: userStat.lastOrderAt, // 使用最近订单时间作为参考
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * 更新用户状态
   * @param userId 用户 ID
   * @param updateDto 状态更新请求
   * @returns 更新后的用户信息
   */
  async updateStatus(
    userId: number,
    updateDto: UpdateUserStatusDto,
  ): Promise<UserDetailResponseDto> {
    const { status } = updateDto;

    // 查询用户
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      this.logger.warn(`用户不存在: userId=${userId}`);
      throw new NotFoundException('用户不存在');
    }

    // 验证状态转换（所有转换都允许，无需特别验证）
    if (user.status === status) {
      throw new BadRequestException(`用户状态已是 ${status}`);
    }

    // 更新用户状态
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        openid: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(
      `用户状态已更新: userId=${userId}, ${user.status} → ${status}`,
    );

    // 清除相关 Redis 缓存
    try {
      await this.cacheService.del(`user:detail:${userId}`);
      await this.cacheService.del(`user:stats`);
      this.logger.log(`已清除用户 ${userId} 的相关缓存`);
    } catch (error) {
      this.logger.error(`清除缓存失败:`, error);
      // 缓存清除失败不影响状态更新操作
    }

    // 统计用户订单信息
    const stats = await this.getUserStatistics([userId]);
    const userStat = stats.get(userId) || {
      orderCount: 0,
      totalSpent: '0.00',
      lastOrderAt: null,
    };

    // 返回更新后的用户信息
    return {
      id: updatedUser.id,
      openid: updatedUser.openid,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      avatarUrl: updatedUser.avatarUrl,
      phone: updatedUser.phone,
      role: updatedUser.role,
      status: updatedUser.status,
      orderCount: userStat.orderCount,
      totalSpent: userStat.totalSpent,
      lastLoginAt: userStat.lastOrderAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * 获取用户统计数据
   * @returns 统计数据
   */
  async getStats(): Promise<UserStatsResponseDto> {
    // 尝试从缓存获取
    const cached =
      await this.cacheService.get<UserStatsResponseDto>('user:stats');
    if (cached) {
      this.logger.debug('返回缓存的用户统计数据');
      return cached;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 本周日（或周一）
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 并行查询各项统计数据
    const [
      total,
      roleStats,
      statusStats,
      todayRegistered,
      weekRegistered,
      monthRegistered,
    ] = await Promise.all([
      // 总用户数
      this.prisma.user.count(),
      // 按角色统计
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      // 按状态统计
      this.prisma.user.groupBy({
        by: ['status'],
        _count: true,
      }),
      // 今日注册
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      // 本周注册
      this.prisma.user.count({
        where: { createdAt: { gte: weekStart } },
      }),
      // 本月注册
      this.prisma.user.count({
        where: { createdAt: { gte: monthStart } },
      }),
    ]);

    // 从角色统计中提取家长和管理员数量
    const parents = roleStats.find((s) => s.role === Role.PARENT)?._count || 0;
    const admins = roleStats.find((s) => s.role === Role.ADMIN)?._count || 0;

    // 从状态统计中提取各状态数量
    const active =
      statusStats.find((s) => s.status === UserStatus.ACTIVE)?._count || 0;
    const inactive =
      statusStats.find((s) => s.status === UserStatus.INACTIVE)?._count || 0;
    const banned =
      statusStats.find((s) => s.status === UserStatus.BANNED)?._count || 0;

    const stats = {
      total,
      parents,
      admins,
      active,
      inactive,
      banned,
      todayRegistered,
      weekRegistered,
      monthRegistered,
    };

    // 缓存统计结果（TTL: 5分钟）
    await this.cacheService.set('user:stats', stats, this.CACHE_TTL_SECONDS);
    this.logger.debug('用户统计数据已缓存');

    return stats;
  }

  /**
   * 批量获取用户统计信息（订单数、总消费、最近订单时间）
   * @param userIds 用户ID数组
   * @returns Map<userId, { orderCount, totalSpent, lastOrderAt }>
   */
  private async getUserStatistics(userIds: number[]) {
    if (userIds.length === 0) {
      return new Map();
    }

    // 查询所有已支付订单（PAID, COMPLETED）
    const orders = await this.prisma.order.findMany({
      where: {
        userId: { in: userIds },
        paymentStatus: { in: [PaymentStatus.SUCCESS] },
      },
      select: {
        userId: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    // 按用户分组统计
    const statsMap = new Map<
      number,
      { orderCount: number; totalSpent: string; lastOrderAt: Date | null }
    >();

    // 初始化所有用户的统计
    for (const userId of userIds) {
      statsMap.set(userId, {
        orderCount: 0,
        totalSpent: '0.00',
        lastOrderAt: null,
      });
    }

    // 聚合订单数据
    for (const order of orders) {
      const current = statsMap.get(order.userId)!;
      current.orderCount += 1;
      current.totalSpent = (
        Number(current.totalSpent) + Number(order.totalAmount)
      ).toFixed(2);

      // 更新最近订单时间
      if (!current.lastOrderAt || order.createdAt > current.lastOrderAt) {
        current.lastOrderAt = order.createdAt;
      }

      statsMap.set(order.userId, current);
    }

    return statsMap;
  }

  /**
   * 手机号脱敏（保留前3位和后4位）
   * @param phone 手机号
   * @returns 脱敏后的手机号
   */
  private maskPhone(phone: string | null): string | null {
    if (!phone) {
      return null;
    }
    if (phone.length < 7) {
      return phone; // 手机号太短，不脱敏
    }
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  /**
   * 验证日期范围
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @throws BadRequestException 如果日期范围无效
   */
  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new BadRequestException('开始日期不能晚于结束日期');
      }
    }
  }

  /**
   * 查询用户订单列表（管理员视角）
   * @param userId 用户 ID
   * @param queryDto 查询参数
   * @returns 分页订单列表
   */
  async findUserOrders(
    userId: number,
    queryDto: QueryUserOrdersDto,
  ): Promise<{
    data: UserOrderListResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 20, status, startDate, endDate } = queryDto;

    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`用户不存在: userId=${userId}`);
      throw new NotFoundException('用户不存在');
    }

    // 验证日期范围
    this.validateDateRange(startDate, endDate);

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建 WHERE 条件
    const where: import('@prisma/client').Prisma.OrderWhereInput = {
      userId, // 只查询该用户的订单
    };

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 使用下一天的 00:00:00 作为结束边界，避免时区问题
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        endDateObj.setHours(0, 0, 0, 0);
        where.createdAt.lt = endDateObj;
      }
    }

    // 并行查询订单数据和总数
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            select: {
              id: true,
              productId: true,
              productName: true,
              productPrice: true,
              quantity: true,
              subtotal: true,
            },
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
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount.toString(),
      actualAmount: order.actualAmount.toString(),
      bookingDate: order.bookingDate ?? undefined,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
      })),
      paidAt: order.paidAt ?? undefined,
      createdAt: order.createdAt,
    }));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取用户订单汇总统计（管理员视角）
   * @param userId 用户 ID
   * @returns 订单汇总统计
   */
  async getUserOrderSummary(
    userId: number,
  ): Promise<UserOrderSummaryResponseDto> {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`用户不存在: userId=${userId}`);
      throw new NotFoundException('用户不存在');
    }

    // 尝试从缓存获取
    const cacheKey = `user:order-summary:${userId}`;
    const cached =
      await this.cacheService.get<UserOrderSummaryResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`返回缓存的用户订单汇总: userId=${userId}`);
      return cached;
    }

    // 并行查询各项统计数据
    let categoryStats: {
      category_id: number;
      category_name: string;
      order_count: bigint;
    }[] = [];
    let monthlyStats: {
      month: string;
      order_count: bigint;
      total_amount: string;
    }[] = [];

    const [
      allOrders,
      statusCounts,
      paidOrdersForAmount,
      firstOrder,
      lastOrder,
    ] = await Promise.all([
      // 查询所有订单
      this.prisma.order.findMany({
        where: { userId },
        select: { id: true, createdAt: true },
      }),
      // 按状态统计订单数
      this.prisma.order.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      // 查询已支付订单（用于计算金额）
      this.prisma.order.findMany({
        where: { userId, paymentStatus: PaymentStatus.SUCCESS },
        select: { actualAmount: true },
      }),
      // 查询首次订单
      this.prisma.order.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      // 查询最后订单
      this.prisma.order.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // 执行原始 SQL 查询（带错误处理）
    try {
      [categoryStats, monthlyStats] = await Promise.all([
        // 统计最常预订的分类（使用 Prisma.sql 防止 SQL 注入）
        this.prisma.$queryRaw<
          { category_id: number; category_name: string; order_count: bigint }[]
        >(
          Prisma.sql`
            SELECT
              pc.id as category_id,
              pc.name as category_name,
              COUNT(DISTINCT o.id) as order_count
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.order_id
            INNER JOIN products p ON oi.product_id = p.id
            INNER JOIN product_categories pc ON p.category_id = pc.id
            WHERE o.user_id = ${userId}
            GROUP BY pc.id, pc.name
            ORDER BY order_count DESC
            LIMIT 1
          `,
        ),
        // 生成最近6个月的订单趋势（使用 Prisma.sql 防止 SQL 注入）
        this.prisma.$queryRaw<
          { month: string; order_count: bigint; total_amount: string }[]
        >(
          Prisma.sql`
            SELECT
              TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') as month,
              COUNT(*) as order_count,
              COALESCE(SUM(o.actual_amount), 0) as total_amount
            FROM orders o
            WHERE o.user_id = ${userId}
              AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
            GROUP BY DATE_TRUNC('month', o.created_at)
            ORDER BY month DESC
          `,
        ),
      ]);
    } catch (error) {
      this.logger.error(`查询用户订单统计失败: userId=${userId}`, error);
      // 返回默认值，不影响整个接口
      categoryStats = [];
      monthlyStats = [];
    }

    // 计算各状态订单数
    const totalOrders = allOrders.length;
    const paidOrdersCount =
      statusCounts.find((s) => s.status === OrderStatus.PAID)?._count || 0;
    const completedOrders =
      statusCounts.find((s) => s.status === OrderStatus.COMPLETED)?._count || 0;
    const cancelledOrders =
      statusCounts.find((s) => s.status === OrderStatus.CANCELLED)?._count || 0;
    const refundedOrders =
      statusCounts.find((s) => s.status === OrderStatus.REFUNDED)?._count || 0;

    // 计算总消费金额
    const totalSpent = paidOrdersForAmount
      .reduce((sum, order) => sum + Number(order.actualAmount), 0)
      .toFixed(2);

    // 计算平均订单金额
    const avgOrderAmount =
      paidOrdersForAmount.length > 0
        ? (Number(totalSpent) / paidOrdersForAmount.length).toFixed(2)
        : '0.00';

    // 构建响应数据
    const summary: UserOrderSummaryResponseDto = {
      totalOrders,
      paidOrders: paidOrdersCount,
      completedOrders,
      cancelledOrders,
      refundedOrders,
      totalSpent,
      avgOrderAmount,
      firstOrderDate: firstOrder?.createdAt || null,
      lastOrderDate: lastOrder?.createdAt || null,
      favoriteCategory: categoryStats[0]
        ? {
            id: Number(categoryStats[0].category_id),
            name: categoryStats[0].category_name,
            orderCount: Number(categoryStats[0].order_count),
          }
        : { id: 0, name: '无', orderCount: 0 },
      monthlyStats: monthlyStats.map((stat) => ({
        month: stat.month,
        orders: Number(stat.order_count),
        amount: stat.total_amount,
      })),
    };

    // 缓存统计结果（TTL: 5分钟）
    await this.cacheService.set(cacheKey, summary, this.CACHE_TTL_SECONDS);
    this.logger.debug(`用户订单汇总已缓存: userId=${userId}`);

    return summary;
  }

  /**
   * 查询用户退款记录列表（管理员视角）
   * @param userId 用户 ID
   * @returns 退款记录列表
   */
  async findUserRefunds(userId: number): Promise<UserRefundListResponseDto[]> {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`用户不存在: userId=${userId}`);
      throw new NotFoundException('用户不存在');
    }

    // 查询用户的所有退款记录
    const refunds = await this.prisma.refundRecord.findMany({
      where: { userId },
      include: {
        order: {
          select: {
            orderNo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 构建响应数据
    return refunds.map((refund) => ({
      id: refund.id,
      orderId: refund.orderId,
      orderNo: refund.order.orderNo,
      amount: refund.amount.toString(),
      status: refund.status,
      reason: refund.reason ?? undefined,
      requestedAt: refund.createdAt,
      processedAt: refund.refundedAt ?? undefined,
    }));
  }
}
