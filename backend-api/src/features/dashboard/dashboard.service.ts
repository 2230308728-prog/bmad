import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '@/redis/cache.service';

/**
 * 数据看板服务
 * 处理数据统计和分析的业务逻辑
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes for overview
  private readonly STATS_CACHE_TTL_SECONDS = 600; // 10 minutes for stats
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
      this.prisma.order.count({
        where: { createdAt: { gte: todayStart }, status: 'PAID' },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: todayStart }, status: 'COMPLETED' },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order
        .aggregate({
          where: { createdAt: { gte: todayStart } },
          _sum: { totalAmount: true },
        })
        .then((result) => result._sum.totalAmount || 0),

      // 本周数据
      this.prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.order.count({
        where: { createdAt: { gte: weekStart }, status: 'PAID' },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: weekStart }, status: 'COMPLETED' },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.order
        .aggregate({
          where: { createdAt: { gte: weekStart } },
          _sum: { totalAmount: true },
        })
        .then((result) => result._sum.totalAmount || 0),

      // 本月数据
      this.prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order.count({
        where: { createdAt: { gte: monthStart }, status: 'PAID' },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: monthStart }, status: 'COMPLETED' },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order
        .aggregate({
          where: { createdAt: { gte: monthStart } },
          _sum: { totalAmount: true },
        })
        .then((result) => result._sum.totalAmount || 0),

      // 总计数据
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.order
        .aggregate({
          _sum: { totalAmount: true },
        })
        .then((result) => result._sum.totalAmount || 0),
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

    this.logger.log(
      `Computing orders trend for period: ${period}, granularity: ${actualGranularity}`,
    );

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

      const totalAmount = bucketOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0,
      );

      return {
        time: bucket.label,
        orders: bucketOrders.length,
        amount: this.formatDecimal(totalAmount),
      };
    });

    // 计算总计
    const totalOrders = orders.length;
    const totalAmount = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );

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

    this.logger.log(
      `Computing users trend for period: ${period}, granularity: ${actualGranularity}`,
    );

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
      Array<{
        category_name: string;
        order_count: bigint;
        total_amount: number;
      }>
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
    const totalAmount = categoryStats.reduce(
      (sum, stat) => sum + Number(stat.total_amount || 0),
      0,
    );

    // 转换为响应格式
    const byCategory = categoryStats.map((stat) => ({
      category: stat.category_name,
      orders: Number(stat.order_count),
      amount: this.formatDecimal(Number(stat.total_amount || 0)),
      percentage:
        totalAmount > 0
          ? Number(
              ((Number(stat.total_amount || 0) / totalAmount) * 100).toFixed(2),
            )
          : 0,
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
   * 获取热门产品排行
   */
  async getPopularProducts(query: { period?: string; limit?: number }) {
    const { period = 'week', limit = 10 } = query;

    this.logger.log(
      `Computing popular products for period: ${period}, limit: ${limit}`,
    );

    // 尝试从缓存获取
    const cacheKey = `dashboard:products:popular:${period}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Popular products cache hit');
      return cached;
    }

    // 计算时间范围
    const { startDate, endDate } = this.getTimeRange(period);

    // 使用原生 SQL 查询进行数据库层面的聚合统计产品订单数据
    // 注意：Prisma 的 $queryRaw 模板字符串中可以直接使用变量
    const productStats = await this.prisma.$queryRaw<
      Array<{
        product_id: number;
        product_title: string;
        product_image: string;
        product_price: number;
        category_name: string;
        order_count: number;
        total_amount: number;
        view_count: number;
      }>
    >`
      SELECT
        p.id as product_id,
        p.title as product_title,
        COALESCE(p.images[1], p.images[0], '') as product_image,
        p.price as product_price,
        COALESCE(pc.name, '未分类') as category_name,
        COUNT(DISTINCT oi.order_id) as order_count,
        CAST(SUM(oi.price * oi.quantity) AS DECIMAL(10,2)) as total_amount,
        p.view_count
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('PAID', 'COMPLETED')
        AND o.created_at >= ${startDate.toISOString()}
        AND o.created_at <= ${endDate.toISOString()}
      GROUP BY p.id, p.title, p.images, p.price, pc.name, p.view_count
      ORDER BY order_count DESC
      LIMIT ${limit}
    `;

    // 计算汇总数据
    const totalOrders = productStats.reduce(
      (sum, stat) => sum + Number(stat.order_count || 0),
      0,
    );
    const totalAmount = productStats.reduce(
      (sum, stat) => sum + Number(stat.total_amount || 0),
      0,
    );
    const avgConversionRate =
      productStats.length > 0
        ? productStats.reduce((sum, stat) => {
            const views = Number(stat.view_count || 0);
            const orders = Number(stat.order_count || 0);
            return sum + (views > 0 ? (orders / views) * 100 : 0);
          }, 0) / productStats.length
        : 0;

    // 转换为响应格式
    const products = productStats.map((stat, index) => {
      const views = Number(stat.view_count || 0);
      const orders = Number(stat.order_count || 0);
      return {
        id: Number(stat.product_id),
        title: stat.product_title,
        image: stat.product_image || '',
        category: stat.category_name,
        price: this.formatDecimal(Number(stat.product_price)),
        orders: orders,
        amount: this.formatDecimal(Number(stat.total_amount || 0)),
        views: views,
        conversionRate:
          views > 0 ? Number(((orders / views) * 100).toFixed(2)) : 0,
        avgRating: 0, // TODO: 从评价系统获取
        rank: index + 1,
      };
    });

    const result = {
      period,
      products,
      summary: {
        totalOrders,
        totalAmount: this.formatDecimal(totalAmount),
        avgConversionRate: Number(avgConversionRate.toFixed(2)),
      },
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.STATS_CACHE_TTL_SECONDS);

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
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    switch (period) {
      case 'today':
        return { startDate: todayStart, endDate: new Date() };
      case 'week':
        return { startDate: weekStart, endDate: weekEnd };
      case 'month':
        return { startDate: monthStart, endDate: monthEnd };
      case 'all':
        // 使用一个很早的日期作为起始时间
        return { startDate: new Date(2020, 0, 1), endDate: new Date() };
      default:
        this.logger.warn(
          `Invalid period value: ${period}, defaulting to 'today'`,
        );
        return { startDate: todayStart, endDate: new Date() };
    }
  }

  /**
   * 生成时间桶
   */
  private generateTimeBuckets(
    period: string,
    granularity: string,
  ): Array<{ label: string; start: Date; end: Date }> {
    const buckets: Array<{ label: string; start: Date; end: Date }> = [];

    if (period === 'today' && granularity === 'hour') {
      // 生成营业时间的小时桶
      const now = new Date();
      for (
        let hour = this.BUSINESS_HOURS_START;
        hour <= this.BUSINESS_HOURS_END;
        hour++
      ) {
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
  private isOrderInBucket(
    orderDate: Date,
    bucket: { start: Date; end: Date },
    granularity: string,
  ): boolean {
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

  /**
   * 获取转化漏斗分析
   */
  async getConversionFunnel(query: { period?: string }) {
    const { period = 'week' } = query;

    this.logger.log(`Computing conversion funnel for period: ${period}`);

    // 尝试从缓存获取
    const cacheKey = `dashboard:conversion:funnel:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Conversion funnel cache hit');
      return cached;
    }

    // 计算时间范围
    const { startDate, endDate } = this.getTimeRange(period);

    // 并行查询漏斗各阶段数据
    const [
      totalProductViews,
      totalCreatedOrders,
      totalPaidOrders,
      uniquePaidUsers,
    ] = await Promise.all([
      // 1. 浏览产品 - 统计所有产品浏览量总和
      this.prisma.product
        .aggregate({
          _sum: { viewCount: true },
        })
        .then((result) => Number(result._sum.viewCount || 0)),

      // 2. 创建订单 - 统计时间范围内的订单数
      this.prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // 3. 完成支付 - 统计已支付/已完成订单数
      this.prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['PAID', 'COMPLETED'] },
        },
      }),

      // 4. 完成支付的唯一用户数
      this.prisma.order
        .groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ['PAID', 'COMPLETED'] },
          },
        })
        .then((result) => result.length),
    ]);

    // 构建漏斗数据
    const browseProducts = Math.max(totalProductViews, 1); // 避免除零
    // 查看详情：保守估计为浏览产品的 60%（因为没有详情页访问追踪）
    const viewDetails = Math.max(
      Math.ceil(browseProducts * 0.6),
      totalCreatedOrders,
    );
    const createOrders = totalCreatedOrders;
    const completePayment = uniquePaidUsers;

    // 计算各阶段百分比（相对于第一阶段）
    const funnel = [
      {
        stage: '浏览产品',
        users: browseProducts,
        percentage: 100,
      },
      {
        stage: '查看详情',
        users: viewDetails,
        percentage: Number(((viewDetails / browseProducts) * 100).toFixed(2)),
      },
      {
        stage: '创建订单',
        users: createOrders,
        percentage: Number(((createOrders / browseProducts) * 100).toFixed(2)),
      },
      {
        stage: '完成支付',
        users: completePayment,
        percentage: Number(
          ((completePayment / browseProducts) * 100).toFixed(2),
        ),
      },
    ];

    // 计算总体转化率
    const overallConversion = Number(
      ((completePayment / browseProducts) * 100).toFixed(2),
    );

    // 计算流失数据
    const dropoffs = [
      {
        stage: '浏览产品→查看详情',
        users: browseProducts - viewDetails,
        percentage: Number(
          (((browseProducts - viewDetails) / browseProducts) * 100).toFixed(2),
        ),
      },
      {
        stage: '查看详情→创建订单',
        users: viewDetails - createOrders,
        percentage:
          viewDetails > 0
            ? Number(
                (((viewDetails - createOrders) / viewDetails) * 100).toFixed(2),
              )
            : 0,
      },
      {
        stage: '创建订单→完成支付',
        users: createOrders - completePayment,
        percentage:
          createOrders > 0
            ? Number(
                (
                  ((createOrders - completePayment) / createOrders) *
                  100
                ).toFixed(2),
              )
            : 0,
      },
    ];

    const result = {
      period,
      funnel,
      overallConversion,
      dropoffs,
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.STATS_CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 获取用户留存分析
   */
  async getUserRetention() {
    this.logger.log('Computing user retention analysis');

    // 尝试从缓存获取
    const cacheKey = 'dashboard:user:retention';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('User retention cache hit');
      return cached;
    }

    // 获取最近8周的数据用于队列分析
    const now = new Date();
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks

    // 获取这个时间范围内注册的用户
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: eightWeeksAgo },
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 按周分组用户（队列）- 同时保存用户的注册时间
    const cohorts = new Map<
      string,
      Array<{ userId: number; createdAt: Date }>
    >();
    for (const user of users) {
      const weekNumber = this.getWeekNumber(user.createdAt);
      const cohortKey = `${user.createdAt.getFullYear()}-${weekNumber}`;
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, []);
      }
      cohorts
        .get(cohortKey)!
        .push({ userId: user.id, createdAt: user.createdAt });
    }

    // 获取这些用户的订单
    const userIds = users.map((u) => u.id);
    const orders = await this.prisma.order.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ['PAID', 'COMPLETED'] },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    });

    // 为每个队列计算留存率
    const cohortAnalysis = [];
    let totalDay1 = 0;
    let totalDay7 = 0;
    let totalDay30 = 0;
    let validCohorts = 0;

    for (const [cohortKey, cohortUsers] of cohorts.entries()) {
      const cohortSize = cohortUsers.length;

      if (cohortSize === 0) continue;

      // 创建用户ID到注册时间的映射
      const userCreatedAtMap = new Map(
        cohortUsers.map((u) => [u.userId, u.createdAt]),
      );

      // 计算留存用户数
      let day1Retained = 0;
      let day7Retained = 0;
      let day30Retained = 0;

      for (const order of orders) {
        const userCreatedAt = userCreatedAtMap.get(order.userId);
        if (!userCreatedAt) continue;

        // 计算订单日期与用户注册日期的天数差
        const daysSinceRegistration = Math.floor(
          (order.createdAt.getTime() - userCreatedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysSinceRegistration >= 1 && daysSinceRegistration < 2) {
          day1Retained++;
        } else if (daysSinceRegistration >= 7 && daysSinceRegistration < 8) {
          day7Retained++;
        } else if (daysSinceRegistration >= 30 && daysSinceRegistration < 31) {
          day30Retained++;
        }
      }

      // 计算留存率
      const day1Rate =
        cohortSize > 0
          ? Number(((day1Retained / cohortSize) * 100).toFixed(2))
          : 0;
      const day7Rate =
        cohortSize > 0
          ? Number(((day7Retained / cohortSize) * 100).toFixed(2))
          : 0;
      const day30Rate =
        cohortSize > 0
          ? Number(((day30Retained / cohortSize) * 100).toFixed(2))
          : 0;

      cohortAnalysis.push({
        period: cohortKey.replace('-', '-W'),
        newUsers: cohortSize,
        retention: {
          day1: day1Rate,
          day7: day7Rate,
          day30: day30Rate,
        },
      });

      // 累计用于计算平均值
      totalDay1 += day1Rate;
      totalDay7 += day7Rate;
      totalDay30 += day30Rate;
      validCohorts++;
    }

    // 计算平均留存率
    const avgRetention = {
      day1:
        validCohorts > 0 ? Number((totalDay1 / validCohorts).toFixed(2)) : 0,
      day7:
        validCohorts > 0 ? Number((totalDay7 / validCohorts).toFixed(2)) : 0,
      day30:
        validCohorts > 0 ? Number((totalDay30 / validCohorts).toFixed(2)) : 0,
    };

    const result = {
      cohortAnalysis,
      avgRetention,
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.STATS_CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 获取日期在一年中的周数
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * 根据年份和周数获取日期
   */
  private getDateFromWeekNumber(year: number, week: number): Date {
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    const day = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    return weekStart;
  }

  /**
   * 获取单个产品的详细表现数据
   */
  async getProductPerformance(productId: number) {
    this.logger.log(`Computing product performance for product: ${productId}`);

    // 尝试从缓存获取
    const cacheKey = `dashboard:product:performance:${productId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Product performance cache hit');
      return cached;
    }

    // 获取产品基本信息
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        viewCount: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // 并行查询统计数据
    const [
      totalOrdersResult,
      totalRevenueResult,
      cancelledOrdersResult,
      refundedOrdersResult,
      recentOrders,
    ] = await Promise.all([
      // 总订单数
      this.prisma.orderItem.count({
        where: { productId },
      }),

      // 总收入
      this.prisma.orderItem.aggregate({
        where: {
          productId,
          order: { status: { in: ['PAID', 'COMPLETED'] } },
        },
        _sum: { subtotal: true },
      }),

      // 已取消订单数
      this.prisma.orderItem.count({
        where: {
          productId,
          order: { status: 'CANCELLED' },
        },
      }),

      // 已退款订单数
      this.prisma.orderItem.count({
        where: {
          productId,
          order: { status: { in: ['REFUNDING', 'REFUNDED'] } },
        },
      }),

      // 最近30天的订单（用于趋势分析）
      this.prisma.orderItem.findMany({
        where: {
          productId,
          order: { status: { in: ['PAID', 'COMPLETED'] } },
        },
        include: {
          order: {
            select: {
              createdAt: true,
            },
          },
        },
        orderBy: {
          order: {
            createdAt: 'asc',
          },
        },
      }),
    ]);

    const totalOrders = totalOrdersResult;
    const totalRevenue = Number(totalRevenueResult._sum.subtotal || 0);
    const cancelledOrders = cancelledOrdersResult;
    const refundedOrders = refundedOrdersResult;
    const totalViews = product.viewCount || 0;

    // 计算统计数据
    const conversionRate =
      totalViews > 0
        ? Number(((totalOrders / totalViews) * 100).toFixed(2))
        : 0;
    const avgOrderValue =
      totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
    const cancelRate =
      totalOrders > 0
        ? Number(((cancelledOrders / totalOrders) * 100).toFixed(2))
        : 0;
    const refundRate =
      totalOrders > 0
        ? Number(((refundedOrders / totalOrders) * 100).toFixed(2))
        : 0;

    // 计算趋势数据（最近7天和30天）
    const now = new Date();

    // 初始化趋势数组
    const last7Days = new Array(7).fill(0);
    const last30Days = new Array(30).fill(0);

    // 填充趋势数据
    for (const item of recentOrders) {
      const orderDate = new Date(item.order.createdAt);
      const daysDiff = Math.floor(
        (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff < 7 && daysDiff >= 0) {
        last7Days[6 - daysDiff]++;
      }
      if (daysDiff < 30 && daysDiff >= 0) {
        last30Days[29 - daysDiff]++;
      }
    }

    // 按周统计（用于30天趋势）
    const last30DaysWeekly = new Array(7).fill(0);
    for (let i = 0; i < 30; i++) {
      const weekIndex = Math.floor(i / 4);
      last30DaysWeekly[weekIndex] += last30Days[i];
    }

    const result = {
      product: {
        id: product.id,
        title: product.title,
      },
      stats: {
        totalViews,
        totalOrders,
        totalRevenue: this.formatDecimal(totalRevenue),
        conversionRate,
        avgOrderValue: this.formatDecimal(avgOrderValue),
        cancelRate,
        refundRate,
      },
      trend: {
        last7Days,
        last30Days: last30DaysWeekly,
      },
      demographics: {
        avgAge: 0,
        ageDistribution: [],
      },
    };

    // 缓存结果
    await this.cacheService.set(cacheKey, result, this.STATS_CACHE_TTL_SECONDS);

    return result;
  }
}
