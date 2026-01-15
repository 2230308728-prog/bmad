import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@/lib/prisma.service';
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
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
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
      mockPrismaService.order.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 7500 } });

      mockPrismaService.order.count.mockResolvedValueOnce(150); // week orders
      mockPrismaService.order.count.mockResolvedValueOnce(120); // week paid
      mockPrismaService.order.count.mockResolvedValueOnce(100); // week completed
      mockPrismaService.user.count.mockResolvedValueOnce(18); // week new users
      mockPrismaService.order.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 45000 } });

      mockPrismaService.order.count.mockResolvedValueOnce(600); // month orders
      mockPrismaService.order.count.mockResolvedValueOnce(480); // month paid
      mockPrismaService.order.count.mockResolvedValueOnce(400); // month completed
      mockPrismaService.user.count.mockResolvedValueOnce(65); // month new users
      mockPrismaService.order.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 180000 } });

      mockPrismaService.user.count.mockResolvedValueOnce(150); // total users
      mockPrismaService.order.count.mockResolvedValueOnce(2000); // total orders
      mockPrismaService.product.count.mockResolvedValueOnce(50); // total products
      mockPrismaService.order.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 600000 } });

      const result = await service.getOverview() as any;

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
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await service.getOverview() as any;

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

      const result = await service.getOrdersTrend(query) as any;

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

      const result = await service.getOrdersTrend(query) as any;

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

      const result = await service.getUsersTrend(query) as any;

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

      const result = await service.getRevenueBreakdown() as any;

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

      const result = await service.getRevenueBreakdown() as any;

      expect(result.byCategory).toHaveLength(0);
      expect(result.byPaymentMethod[0].amount).toBe('0.00');
    });
  });
});
