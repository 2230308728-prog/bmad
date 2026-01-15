import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma.service';
import { CacheService } from '@/redis/cache.service';

/**
 * 数据看板服务
 * 处理数据统计和分析的业务逻辑
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes
  private readonly BUSINESS_HOURS_START = 9; // 9:00 AM
  private readonly BUSINESS_HOURS_END = 22; // 10:00 PM

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取核心业务指标概览
   */
  async getOverview() {
    this.logger.log('Computing dashboard overview statistics');

    // 尝试从缓存获取
    const cacheKey = 'dashboard:overview';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Dashboard overview cache hit');
      return cached;
    }

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = this.getWeekStart(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 并行查询所有统计数据
    const [
      todayOrders,
      todayPaidOrders,
      todayCompletedOrders,
      todayNewUsers,
      todayOrdersAmount,

      weekOrders,
      weekPaidOrders,
      weekCompletedOrders,
      weekNewUsers,
      weekOrdersAmount,

      monthOrders,
      monthPaidOrders,
      monthCompletedOrders,
      monthNewUsers,
      monthOrdersAmount,

      totalUsers,
      totalOrders,
      totalProducts,
      totalOrdersAmount,
    ] = await Promise.all([
      // 今日数据
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart }, status: 'PAID' } }),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart }, status: 'COMPLETED' } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { totalAmount: true },
      }).then((result) => result._sum.totalAmount || 0),

      // 本周数据
      this.prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.order.count({ where: { createdAt: { gte: weekStart }, status: 'PAID' } }),
      this.prisma.order.count({ where: { createdAt: { gte: weekStart }, status: 'COMPLETED' } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: weekStart } },
        _sum: { totalAmount: true },
      }).then((result) => result._sum.totalAmount || 0),

      // 本月数据
      this.prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order.count({ where: { createdAt: { gte: monthStart }, status: 'PAID' } }),
      this.prisma.order.count({ where: { createdAt: { gte: monthStart }, status: 'COMPLETED' } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }).then((result) => result._sum.totalAmount || 0),

      // 总计数据
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
      }).then((result) => result._sum.totalAmount || 0),
    ]);

    const result = {
      today: {
        orders: todayOrders,
        ordersAmount: this.formatDecimal(todayOrdersAmount),
        newUsers: todayNewUsers,
        paidOrders: todayPaidOrders,
        completedOrders: todayCompletedOrders,
      },
      week: {
        orders: weekOrders,
        ordersAmount: this.formatDecimal(weekOrdersAmount),
        newUsers: weekNewUsers,
        paidOrders: weekPaidOrders,
        completedOrders: weekCompletedOrders,
      },
      month: {
        orders: monthOrders,
        ordersAmount: this.formatDecimal(monthOrdersAmount),
        newUsers: monthNewUsers,
        paidOrders: monthPaidOrders,
        completedOrders: monthCompletedOrders,
      },
      total: {
        users: totalUsers,
        orders: totalOrders,
        products: totalProducts,
        revenue: this.formatDecimal(totalOrdersAmount),
      },
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 获取订单趋势数据
   */
  async getOrdersTrend(query: { period?: string; granularity?: string }) {
    const { period = 'today', granularity } = query;
    const actualGranularity = granularity || this.getDefaultGranularity(period);

    this.logger.log(`Computing orders trend for period: ${period}, granularity: ${actualGranularity}`);

    // 尝试从缓存获取
    const cacheKey = `dashboard:orders:trend:${period}:${actualGranularity}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Orders trend cache hit');
      return cached;
    }

    // 计算时间范围
    const { startDate, endDate } = this.getTimeRange(period);

    // 生成时间桶
    const timeBuckets = this.generateTimeBuckets(period, actualGranularity);

    // 并行查询订单数据
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    // 按时间桶分组
    const data = timeBuckets.map((bucket) => {
      const bucketOrders = orders.filter((order) =>
        this.isOrderInBucket(order.createdAt, bucket, actualGranularity),
      );

      const totalAmount = bucketOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

      return {
        time: bucket.label,
        orders: bucketOrders.length,
        amount: this.formatDecimal(totalAmount),
      };
    });

    // 计算总计
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    const result = {
      period,
      granularity: actualGranularity,
      data,
      totalOrders,
      totalAmount: this.formatDecimal(totalAmount),
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 获取用户增长趋势
   */
  async getUsersTrend(query: { period?: string; granularity?: string }) {
    const { period = 'today', granularity } = query;
    const actualGranularity = granularity || this.getDefaultGranularity(period);

    this.logger.log(`Computing users trend for period: ${period}, granularity: ${actualGranularity}`);

    // 尝试从缓存获取
    const cacheKey = `dashboard:users:trend:${period}:${actualGranularity}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Users trend cache hit');
      return cached;
    }

    // 计算时间范围
    const { startDate, endDate } = this.getTimeRange(period);

    // 生成时间桶
    const timeBuckets = this.generateTimeBuckets(period, actualGranularity);

    // 并行查询用户和订单数据
    const [users, orders] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true, userId: true },
      }),
    ]);

    // 获取活跃用户（有订单的用户）去重
    const activeUserIds = new Set(orders.map((o) => o.userId));

    // 按时间桶分组统计新增用户
    const newUsers = timeBuckets.map((bucket) => {
      const bucketUsers = users.filter((user) =>
        this.isOrderInBucket(user.createdAt, bucket, actualGranularity),
      );
      return {
        time: bucket.label,
        newUsers: bucketUsers.length,
      };
    });

    // 按时间桶分组统计活跃用户
    const activeUsers = timeBuckets.map((bucket) => {
      const bucketOrders = orders.filter((order) =>
        this.isOrderInBucket(order.createdAt, bucket, actualGranularity),
      );
      const uniqueUsers = new Set(bucketOrders.map((o) => o.userId));
      return {
        time: bucket.label,
        activeUsers: uniqueUsers.size,
      };
    });

    const result = {
      period,
      granularity: actualGranularity,
      newUsers,
      activeUsers,
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 获取收入构成分析
   * 优化版本：使用数据库层面的聚合计算，避免加载所有订单到内存
   */
  async getRevenueBreakdown() {
    this.logger.log('Computing revenue breakdown by category');

    // 尝试从缓存获取
    const cacheKey = 'dashboard:revenue:breakdown';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Revenue breakdown cache hit');
      return cached;
    }

    // 使用原生 SQL 查询进行数据库层面的聚合，更高效
    // 按 category 分组统计订单数量和金额总和
    const categoryStats = await this.prisma.$queryRaw<
      Array<{ category_name: string; order_count: bigint; total_amount: number }>
    >`
      SELECT
        COALESCE(pc.name, '未分类') as category_name,
        COUNT(DISTINCT oi.order_id) as order_count,
        CAST(SUM(oi.price * oi.quantity) AS DECIMAL(10,2)) as total_amount
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('PAID', 'COMPLETED')
      GROUP BY pc.name
      ORDER BY total_amount DESC
    `;

    // 计算总金额
    const totalAmount = categoryStats.reduce((sum, stat) => sum + Number(stat.total_amount || 0), 0);

    // 转换为响应格式
    const byCategory = categoryStats.map((stat) => ({
      category: stat.category_name,
      orders: Number(stat.order_count),
      amount: this.formatDecimal(Number(stat.total_amount || 0)),
      percentage: totalAmount > 0 ? Number(((Number(stat.total_amount || 0) / totalAmount) * 100).toFixed(2)) : 0,
    }));

    // 支付方式统计（当前只有微信支付）
    const byPaymentMethod = [
      {
        method: 'WECHAT',
        amount: this.formatDecimal(totalAmount),
        percentage: 100,
      },
    ];

    const result = {
      byCategory,
      byPaymentMethod,
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 获取本周一的开始时间
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整周日为0
    return new Date(d.setDate(diff));
  }

  /**
   * 获取时间范围
   */
  private getTimeRange(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const weekStart = this.getWeekStart(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    switch (period) {
      case 'today':
        return { startDate: todayStart, endDate: new Date() };
      case 'week':
        return { startDate: weekStart, endDate: weekEnd };
      case 'month':
        return { startDate: monthStart, endDate: monthEnd };
      default:
        this.logger.warn(`Invalid period value: ${period}, defaulting to 'today'`);
        return { startDate: todayStart, endDate: new Date() };
    }
  }

  /**
   * 生成时间桶
   */
  private generateTimeBuckets(period: string, granularity: string): Array<{ label: string; start: Date; end: Date }> {
    const buckets: Array<{ label: string; start: Date; end: Date }> = [];

    if (period === 'today' && granularity === 'hour') {
      // 生成营业时间的小时桶
      const now = new Date();
      for (let hour = this.BUSINESS_HOURS_START; hour <= this.BUSINESS_HOURS_END; hour++) {
        const start = new Date(now);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(now);
        end.setHours(hour, 59, 59, 999);
        buckets.push({
          label: `${hour.toString().padStart(2, '0')}:00`,
          start,
          end,
        });
      }
    } else {
      // 生成日期桶
      const { startDate, endDate } = this.getTimeRange(period);
      const current = new Date(startDate);

      while (current <= endDate) {
        const start = new Date(current);
        start.setHours(0, 0, 0, 0);
        const end = new Date(current);
        end.setHours(23, 59, 59, 999);

        // 格式化日期标签
        const month = (current.getMonth() + 1).toString().padStart(2, '0');
        const day = current.getDate().toString().padStart(2, '0');
        buckets.push({
          label: `${month}-${day}`,
          start,
          end,
        });

        current.setDate(current.getDate() + 1);
      }
    }

    return buckets;
  }

  /**
   * 判断订单是否在时间桶内
   */
  private isOrderInBucket(orderDate: Date, bucket: { start: Date; end: Date }, granularity: string): boolean {
    if (granularity === 'hour') {
      const orderHour = orderDate.getHours();
      const bucketHour = bucket.start.getHours();
      return orderHour === bucketHour;
    } else {
      return orderDate >= bucket.start && orderDate <= bucket.end;
    }
  }

  /**
   * 根据时间周期获取默认粒度
   */
  private getDefaultGranularity(period: string): string {
    if (period === 'today') return 'hour';
    return 'day';
  }

  /**
   * 格式化 Decimal 为字符串
   */
  private formatDecimal(value: any): string {
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'number' ? value : Number(value);
    return num.toFixed(2);
  }

  /**
   * 清除统计数据缓存
   * 在订单创建、用户注册等数据变更时调用
   */
  async clearStatsCache(): Promise<void> {
    try {
      // 清除所有 dashboard 相关缓存
      const cacheKeys = [
        'dashboard:overview',
        'dashboard:revenue:breakdown',
        // 趋势缓存使用通配符模式清除
      ];

      // 清除固定键
      for (const key of cacheKeys) {
        await this.cacheService.del(key);
      }

      // 注意: 趋势缓存包含动态参数，需要在数据变更时主动清除
      // 或者在 CacheService 中实现通配符删除功能
      this.logger.debug('Dashboard stats cache cleared successfully');
    } catch (error) {
      this.logger.warn('Failed to clear dashboard stats cache:', error);
    }
  }
}
