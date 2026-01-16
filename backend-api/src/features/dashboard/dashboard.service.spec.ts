import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '@/redis/cache.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findUnique: jest.fn(),
    },
    orderItem: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('should compute overview statistics', async () => {
      // Mock Prisma responses
      mockPrismaService.order.count.mockResolvedValueOnce(25); // today orders
      mockPrismaService.order.count.mockResolvedValueOnce(20); // today paid
      mockPrismaService.order.count.mockResolvedValueOnce(15); // today completed
      mockPrismaService.user.count.mockResolvedValueOnce(3); // today new users
      mockPrismaService.order.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 7500 },
      });

      mockPrismaService.order.count.mockResolvedValueOnce(150); // week orders
      mockPrismaService.order.count.mockResolvedValueOnce(120); // week paid
      mockPrismaService.order.count.mockResolvedValueOnce(100); // week completed
      mockPrismaService.user.count.mockResolvedValueOnce(18); // week new users
      mockPrismaService.order.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 45000 },
      });

      mockPrismaService.order.count.mockResolvedValueOnce(600); // month orders
      mockPrismaService.order.count.mockResolvedValueOnce(480); // month paid
      mockPrismaService.order.count.mockResolvedValueOnce(400); // month completed
      mockPrismaService.user.count.mockResolvedValueOnce(65); // month new users
      mockPrismaService.order.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 180000 },
      });

      mockPrismaService.user.count.mockResolvedValueOnce(150); // total users
      mockPrismaService.order.count.mockResolvedValueOnce(2000); // total orders
      mockPrismaService.product.count.mockResolvedValueOnce(50); // total products
      mockPrismaService.order.aggregate.mockResolvedValueOnce({
        _sum: { totalAmount: 600000 },
      });

      const result = (await service.getOverview()) as any;

      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('week');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('total');

      expect(result.today.orders).toBe(25);
      expect(result.today.ordersAmount).toBe('7500.00');
      expect(result.today.newUsers).toBe(3);
      expect(result.today.paidOrders).toBe(20);
      expect(result.today.completedOrders).toBe(15);

      expect(result.total.users).toBe(150);
      expect(result.total.orders).toBe(2000);
      expect(result.total.products).toBe(50);
      expect(result.total.revenue).toBe('600000.00');
    });

    it('should handle zero values correctly', async () => {
      // Mock zero responses
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
      });

      const result = (await service.getOverview()) as any;

      expect(result.today.ordersAmount).toBe('0.00');
      expect(result.total.revenue).toBe('0.00');
    });
  });

  describe('getOrdersTrend', () => {
    it('should return trend data for today with hour granularity', async () => {
      const query = { period: 'today', granularity: 'hour' };
      const now = new Date();

      // Mock order data
      const mockOrders = [
        { createdAt: new Date(now.setHours(10, 0, 0)), totalAmount: 150 },
        { createdAt: new Date(now.setHours(10, 30)), totalAmount: 200 },
        { createdAt: new Date(now.setHours(11, 0)), totalAmount: 300 },
      ];
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = (await service.getOrdersTrend(query)) as any;

      expect(result).toHaveProperty('period', 'today');
      expect(result).toHaveProperty('granularity', 'hour');
      expect(result).toHaveProperty('data');
      expect(result.data).toBeInstanceOf(Array);
      expect(result.totalOrders).toBe(3);
      expect(result.totalAmount).toBe('650.00');
    });

    it('should use default granularity when not provided', async () => {
      const query = { period: 'week' };
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = (await service.getOrdersTrend(query)) as any;

      expect(result.granularity).toBe('day');
    });
  });

  describe('getUsersTrend', () => {
    it('should return users trend data', async () => {
      const query = { period: 'today', granularity: 'hour' };
      const now = new Date();

      const mockUsers = [
        { createdAt: new Date(now.setHours(10, 0, 0)) },
        { createdAt: new Date(now.setHours(11, 0, 0)) },
      ];
      const mockOrders = [
        { createdAt: new Date(now.setHours(10, 0, 0)), userId: 1 },
        { createdAt: new Date(now.setHours(10, 30)), userId: 2 },
        { createdAt: new Date(now.setHours(11, 0)), userId: 1 },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = (await service.getUsersTrend(query)) as any;

      expect(result).toHaveProperty('period', 'today');
      expect(result).toHaveProperty('granularity', 'hour');
      expect(result).toHaveProperty('newUsers');
      expect(result).toHaveProperty('activeUsers');
      expect(result.newUsers).toBeInstanceOf(Array);
      expect(result.activeUsers).toBeInstanceOf(Array);
    });
  });

  describe('getRevenueBreakdown', () => {
    it('should return revenue breakdown by category', async () => {
      // Mock SQL query result for category stats
      const mockCategoryStats = [
        { category_name: '自然科学', order_count: 2n, total_amount: 200 },
        { category_name: '历史文化', order_count: 1n, total_amount: 150 },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockCategoryStats);

      const result = (await service.getRevenueBreakdown()) as any;

      expect(result).toHaveProperty('byCategory');
      expect(result).toHaveProperty('byPaymentMethod');
      expect(result.byCategory).toBeInstanceOf(Array);
      expect(result.byCategory).toHaveLength(2);
      expect(result.byCategory[0].category).toBe('自然科学');
      expect(result.byPaymentMethod).toHaveLength(1);
      expect(result.byPaymentMethod[0].method).toBe('WECHAT');
      expect(result.byPaymentMethod[0].amount).toBe('350.00');
    });

    it('should handle empty category stats', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = (await service.getRevenueBreakdown()) as any;

      expect(result.byCategory).toHaveLength(0);
      expect(result.byPaymentMethod[0].amount).toBe('0.00');
    });
  });

  describe('getPopularProducts', () => {
    it('should return popular products with statistics', async () => {
      const query = { period: 'week', limit: 10 };

      // Mock SQL query result
      const mockProductStats = [
        {
          product_id: 1,
          product_title: '上海科技馆探索之旅',
          product_image: 'https://example.com/image.jpg',
          product_price: 299,
          category_name: '自然科学',
          order_count: 25,
          total_amount: 7475,
          view_count: 500,
        },
        {
          product_id: 2,
          product_title: '博物馆奇妙夜',
          product_image: '',
          product_price: 199,
          category_name: '历史文化',
          order_count: 18,
          total_amount: 3582,
          view_count: 300,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockProductStats);

      const result = (await service.getPopularProducts(query)) as any;

      expect(result).toHaveProperty('period', 'week');
      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('summary');
      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toMatchObject({
        id: 1,
        title: '上海科技馆探索之旅',
        category: '自然科学',
        price: '299.00',
        orders: 25,
        amount: '7475.00',
        views: 500,
        rank: 1,
      });
      expect(result.products[0].conversionRate).toBe(5.0);
      expect(result.summary.totalOrders).toBe(43);
      expect(result.summary.totalAmount).toBe('11057.00');
    });

    it('should use default values when query params not provided', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getPopularProducts({});

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should handle products with zero views correctly', async () => {
      const mockProductStats = [
        {
          product_id: 1,
          product_title: 'Test Product',
          product_image: '',
          product_price: 100,
          category_name: '未分类',
          order_count: 5,
          total_amount: 500,
          view_count: 0,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockProductStats);

      const result = (await service.getPopularProducts({
        period: 'week',
      })) as any;

      expect(result.products[0].conversionRate).toBe(0);
    });
  });

  describe('getConversionFunnel', () => {
    beforeEach(() => {
      // Setup mock for product views
      mockPrismaService.product.aggregate = jest.fn().mockResolvedValue({
        _sum: { viewCount: 1000 },
      });

      // Setup mock for order counts
      mockPrismaService.order.count
        .mockResolvedValueOnce(180) // created orders
        .mockResolvedValueOnce(150); // paid orders

      // Setup mock for unique paid users (groupBy)
      mockPrismaService.order.groupBy = jest
        .fn()
        .mockResolvedValue([{ userId: 1 }, { userId: 2 }, { userId: 3 }]);
    });

    it('should return conversion funnel analysis', async () => {
      const result = (await service.getConversionFunnel({
        period: 'week',
      })) as any;

      expect(result).toHaveProperty('period', 'week');
      expect(result).toHaveProperty('funnel');
      expect(result).toHaveProperty('overallConversion');
      expect(result).toHaveProperty('dropoffs');

      expect(result.funnel).toHaveLength(4);
      expect(result.funnel[0]).toMatchObject({
        stage: '浏览产品',
        percentage: 100,
      });
      expect(result.funnel[3].stage).toBe('完成支付');
      expect(result.funnel[3].users).toBe(3);

      expect(result.overallConversion).toBeGreaterThan(0);
      expect(result.dropoffs).toHaveLength(3);
    });

    it('should calculate dropoff percentages correctly', async () => {
      const result = (await service.getConversionFunnel({
        period: 'week',
      })) as any;

      expect(result.dropoffs[0].stage).toBe('浏览产品→查看详情');
      expect(result.dropoffs[0].percentage).toBeGreaterThanOrEqual(0);
      expect(result.dropoffs[0].percentage).toBeLessThanOrEqual(100);
    });

    it('should avoid division by zero', async () => {
      mockPrismaService.product.aggregate.mockResolvedValue({
        _sum: { viewCount: 0 },
      });
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.groupBy.mockResolvedValue([]);

      const result = (await service.getConversionFunnel({
        period: 'week',
      })) as any;

      expect(result.funnel[0].users).toBe(1); // minimum value
      expect(result.overallConversion).toBe(0);
    });
  });

  describe('getUserRetention', () => {
    it('should return user retention analysis with cohorts', async () => {
      const now = new Date();
      const mockUsers = [
        { id: 1, createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { id: 2, createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) },
        {
          id: 3,
          createdAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        },
      ];

      const mockOrders = [
        {
          userId: 1,
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        }, // day 1
        {
          userId: 1,
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        }, // day 7
        {
          userId: 2,
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        }, // day 7
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = (await service.getUserRetention()) as any;

      expect(result).toHaveProperty('cohortAnalysis');
      expect(result).toHaveProperty('avgRetention');
      expect(result.cohortAnalysis).toBeInstanceOf(Array);
      expect(result.avgRetention).toHaveProperty('day1');
      expect(result.avgRetention).toHaveProperty('day7');
      expect(result.avgRetention).toHaveProperty('day30');
    });

    it('should calculate retention rates correctly', async () => {
      const now = new Date();
      const mockUsers = [
        {
          id: 1,
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
        {
          id: 2,
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
        {
          id: 3,
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
      ];

      const mockOrders = [
        {
          userId: 1,
          createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
        }, // day 1
        {
          userId: 2,
          createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
        }, // day 1
        {
          userId: 3,
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        }, // day 7
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = (await service.getUserRetention()) as any;

      // Should have 66.67% day1 retention (2/3)
      expect(result.avgRetention.day1).toBeGreaterThan(0);
      expect(result.avgRetention.day1).toBeLessThanOrEqual(100);
    });

    it('should handle empty users correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = (await service.getUserRetention()) as any;

      expect(result.cohortAnalysis).toHaveLength(0);
      expect(result.avgRetention.day1).toBe(0);
      expect(result.avgRetention.day7).toBe(0);
      expect(result.avgRetention.day30).toBe(0);
    });
  });

  describe('getProductPerformance', () => {
    it('should return product performance statistics', async () => {
      const productId = 1;

      // Mock product data
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue({
        id: productId,
        title: 'Test Product',
        viewCount: 1000,
      });

      // Mock order item counts and aggregates
      mockPrismaService.orderItem = {
        count: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
      } as any;

      mockPrismaService.orderItem.count
        .mockResolvedValueOnce(50) // total orders
        .mockResolvedValueOnce(5) // cancelled orders
        .mockResolvedValueOnce(2); // refunded orders

      mockPrismaService.orderItem.aggregate
        .mockResolvedValueOnce({ _sum: { subtotal: 15000 } }) // total revenue
        .mockResolvedValueOnce({ _sum: { subtotal: 0 } }); // for other calls

      // Mock recent orders for trend
      const now = new Date();
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        {
          order: {
            createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          },
        },
        {
          order: {
            createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          },
        },
      ]);

      const result = (await service.getProductPerformance(productId)) as any;

      expect(result).toHaveProperty('product');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('demographics');

      expect(result.product).toMatchObject({
        id: productId,
        title: 'Test Product',
      });

      expect(result.stats).toMatchObject({
        totalViews: 1000,
        totalOrders: 50,
        totalRevenue: '15000.00',
      });

      expect(result.stats.conversionRate).toBe(5);
      expect(result.stats.cancelRate).toBe(10);
      expect(result.stats.refundRate).toBe(4);

      expect(result.trend.last7Days).toBeInstanceOf(Array);
      expect(result.trend.last7Days).toHaveLength(7);
      expect(result.trend.last30Days).toBeInstanceOf(Array);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getProductPerformance(999)).rejects.toThrow(
        'Product 999 not found',
      );
    });

    it('should calculate trend data correctly', async () => {
      const productId = 1;
      const now = new Date();

      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue({
        id: productId,
        title: 'Test Product',
        viewCount: 500,
      });

      mockPrismaService.orderItem = {
        count: jest.fn().mockResolvedValue(10),
        aggregate: jest.fn().mockResolvedValue({ _sum: { subtotal: 1000 } }),
        findMany: jest.fn(),
      } as any;

      // Create orders spread across last 7 days
      const mockOrders = [];
      for (let i = 0; i < 7; i++) {
        mockOrders.push({
          order: {
            createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
          },
        });
      }
      mockPrismaService.orderItem.findMany.mockResolvedValue(mockOrders);

      const result = (await service.getProductPerformance(productId)) as any;

      expect(result.trend.last7Days).toHaveLength(7);
      // Sum of all values should equal total orders
      const totalOrders = result.trend.last7Days.reduce(
        (sum: number, val: number) => sum + val,
        0,
      );
      expect(totalOrders).toBe(7);
    });

    it('should handle zero views correctly', async () => {
      const productId = 1;

      mockPrismaService.product.findUnique = jest.fn().mockResolvedValue({
        id: productId,
        title: 'Test Product',
        viewCount: 0,
      });

      mockPrismaService.orderItem = {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { subtotal: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      } as any;

      const result = (await service.getProductPerformance(productId)) as any;

      expect(result.stats.conversionRate).toBe(0);
      expect(result.stats.avgOrderValue).toBe('0.00');
    });
  });

  describe('clearStatsCache', () => {
    it('should clear dashboard cache keys', async () => {
      mockCacheService.del.mockResolvedValue(undefined);

      await service.clearStatsCache();

      expect(mockCacheService.del).toHaveBeenCalledWith('dashboard:overview');
      expect(mockCacheService.del).toHaveBeenCalledWith(
        'dashboard:revenue:breakdown',
      );
    });

    it('should handle cache deletion errors gracefully', async () => {
      mockCacheService.del.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.clearStatsCache()).resolves.toBeUndefined();
    });
  });
});
