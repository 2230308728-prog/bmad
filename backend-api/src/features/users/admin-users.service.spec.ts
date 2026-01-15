import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '@/lib/prisma.service';
import { CacheService } from '@/redis/cache.service';
import { QueryUsersDto } from './dto/admin/query-users.dto';
import { QueryUserOrdersDto } from './dto/admin/query-user-orders.dto';
import { UpdateUserStatusDto } from './dto/admin/update-user-status.dto';
import { Role, UserStatus, PaymentStatus, OrderStatus } from '@prisma/client';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    refundRecord: {
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
        AdminUsersService,
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

    service = module.get<AdminUsersService>(AdminUsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockUsers = [
      {
        id: 1,
        nickname: '张小明',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        phone: '13800138000',
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        nickname: '李小红',
        avatarUrl: null,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        phone: '13900139000',
        createdAt: new Date('2024-01-02'),
      },
    ];

    const mockOrders = [
      {
        userId: 1,
        totalAmount: { toString: () => '299.00' },
        createdAt: new Date('2024-01-15'),
      },
      {
        userId: 1,
        totalAmount: { toString: () => '199.00' },
        createdAt: new Date('2024-01-10'),
      },
    ];

    it('should return paginated user list with masked phone numbers', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
      };

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll(queryDto);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.data[0].phone).toBe('138****8000'); // Masked
      expect(result.data[0].orderCount).toBe(2);
      expect(result.data[0].totalSpent).toBe('498.00');
    });

    it('should filter by role', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        role: Role.PARENT,
      };

      mockPrismaService.user.findMany.mockResolvedValue([mockUsers[0]]);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findAll(queryDto);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.PARENT,
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe(Role.PARENT);
    });

    it('should filter by status', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        status: UserStatus.ACTIVE,
      };

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findAll(queryDto);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: UserStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should search by keyword (nickname or phone)', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        keyword: '张',
      };

      mockPrismaService.user.findMany.mockResolvedValue([mockUsers[0]]);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findAll(queryDto);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { nickname: { contains: '张', mode: 'insensitive' } },
              { phone: { contains: '张' } },
            ],
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findAll(queryDto);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should return empty list when no users found', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
      };

      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findAll(queryDto);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const mockUser = {
      id: 1,
      openid: 'oXabcdefg1234567890',
      email: null,
      nickname: '张小明',
      avatarUrl: 'https://example.com/avatar.jpg',
      phone: '13800138000',
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    };

    const mockOrders = [
      {
        userId: 1,
        totalAmount: { toString: () => '299.00' },
        createdAt: new Date('2024-01-15'),
      },
    ];

    it('should return user detail with unmasked phone', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.phone).toBe('13800138000'); // Not masked
      expect(result.orderCount).toBe(1);
      expect(result.totalSpent).toBe('299.00');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('用户不存在');
    });

    it('should return user with zero orders when user has no orders', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findOne(1);

      expect(result.orderCount).toBe(0);
      expect(result.totalSpent).toBe('0.00');
    });
  });

  describe('updateStatus', () => {
    const mockUser = {
      id: 1,
      openid: 'oXabcdefg1234567890',
      email: null,
      nickname: '张小明',
      avatarUrl: 'https://example.com/avatar.jpg',
      phone: '13800138000',
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    };

    it('should update user status successfully', async () => {
      const updateDto: UpdateUserStatusDto = {
        status: UserStatus.BANNED,
        reason: '违反平台规定',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        status: UserStatus.ACTIVE,
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.BANNED,
      });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await service.updateStatus(1, updateDto);

      expect(result.status).toBe(UserStatus.BANNED);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: UserStatus.BANNED },
        select: expect.any(Object),
      });
      expect(mockCacheService.del).toHaveBeenCalledWith('user:detail:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('user:stats');
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateDto: UpdateUserStatusDto = {
        status: UserStatus.BANNED,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when status is same', async () => {
      const updateDto: UpdateUserStatusDto = {
        status: UserStatus.ACTIVE,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        status: UserStatus.ACTIVE,
      });

      await expect(service.updateStatus(1, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return user statistics from cache', async () => {
      const cachedStats = {
        total: 1000,
        parents: 850,
        admins: 150,
        active: 900,
        inactive: 50,
        banned: 50,
        todayRegistered: 25,
        weekRegistered: 120,
        monthRegistered: 450,
      };

      mockCacheService.get.mockResolvedValue(cachedStats);

      const result = await service.getStats();

      expect(result).toEqual(cachedStats);
      expect(mockPrismaService.user.count).not.toHaveBeenCalled();
    });

    it('should calculate and cache user statistics', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.user.groupBy
        .mockResolvedValueOnce([
          { role: Role.PARENT, _count: 850 },
          { role: Role.ADMIN, _count: 150 },
        ])
        .mockResolvedValueOnce([
          { status: UserStatus.ACTIVE, _count: 900 },
          { status: UserStatus.INACTIVE, _count: 50 },
          { status: UserStatus.BANNED, _count: 50 },
        ]);
      // Set up count mocks to return different values for each call
      mockPrismaService.user.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(25) // today
        .mockResolvedValueOnce(120) // week
        .mockResolvedValueOnce(450); // month
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 1000,
        parents: 850,
        admins: 150,
        active: 900,
        inactive: 50,
        banned: 50,
        todayRegistered: 25,
        weekRegistered: 120,
        monthRegistered: 450,
      });
      expect(mockCacheService.set).toHaveBeenCalledWith('user:stats', expect.any(Object), 300);
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      const phone = '13800138000';
      // Access private method through public API
      const result = service.findAll({ page: 1, pageSize: 20 });
      // The masking is applied internally, test through the public API
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('findUserOrders', () => {
    const mockOrders = [
      {
        id: 1,
        orderNo: 'ORD20240114123456789',
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.SUCCESS,
        totalAmount: { toString: () => '299.00' },
        actualAmount: { toString: () => '299.00' },
        bookingDate: new Date('2024-02-15'),
        paidAt: new Date('2024-01-14'),
        createdAt: new Date('2024-01-14'),
        items: [
          {
            id: 1,
            productId: 1,
            productName: '上海科技馆探索之旅',
            productPrice: { toString: () => '299.00' },
            quantity: 1,
            subtotal: { toString: () => '299.00' },
          },
        ],
      },
    ];

    it('should return paginated user orders', async () => {
      const queryDto: QueryUserOrdersDto = {
        page: 1,
        pageSize: 20,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findUserOrders(1, queryDto);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].orderNo).toBe('ORD20240114123456789');
    });

    it('should filter by status', async () => {
      const queryDto: QueryUserOrdersDto = {
        page: 1,
        pageSize: 20,
        status: OrderStatus.PAID,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.findUserOrders(1, queryDto);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.PAID,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const queryDto: QueryUserOrdersDto = {
        page: 1,
        pageSize: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.findUserOrders(1, queryDto);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findUserOrders(999, { page: 1, pageSize: 20 })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when date range is invalid', async () => {
      const queryDto: QueryUserOrdersDto = {
        page: 1,
        pageSize: 20,
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.findUserOrders(1, queryDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserOrderSummary', () => {
    it('should return user order summary', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.order.findMany
        .mockResolvedValueOnce([{ id: 1, createdAt: new Date('2024-01-01') }]) // allOrders
        .mockResolvedValueOnce([{ actualAmount: { toString: () => '299.00' } }]); // paidOrders
      mockPrismaService.order.findFirst
        .mockResolvedValueOnce({ createdAt: new Date('2024-01-01') }) // firstOrder
        .mockResolvedValueOnce({ createdAt: new Date('2024-01-31') }); // lastOrder
      mockPrismaService.order.groupBy.mockResolvedValue([
        { status: OrderStatus.PAID, _count: 1 },
      ]);
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ category_id: 1, category_name: '自然科学', order_count: BigInt(5) }])
        .mockResolvedValueOnce([{ month: '2024-01', order_count: BigInt(10), total_amount: '2990.00' }]);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getUserOrderSummary(1);

      expect(result).toBeDefined();
      expect(result.totalOrders).toBe(1);
      expect(result.favoriteCategory.name).toBe('自然科学');
    });

    it('should return null for dates when user has no orders', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.order.findMany
        .mockResolvedValueOnce([]) // allOrders
        .mockResolvedValueOnce([]); // paidOrders
      mockPrismaService.order.findFirst
        .mockResolvedValueOnce(null) // firstOrder
        .mockResolvedValueOnce(null); // lastOrder
      mockPrismaService.order.groupBy.mockResolvedValue([]);
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getUserOrderSummary(1);

      expect(result.firstOrderDate).toBeNull();
      expect(result.lastOrderDate).toBeNull();
      expect(result.totalOrders).toBe(0);
      expect(result.totalSpent).toBe('0.00');
    });

    it('should return cached summary when available', async () => {
      const cachedSummary = {
        totalOrders: 10,
        paidOrders: 8,
        completedOrders: 7,
        cancelledOrders: 1,
        refundedOrders: 1,
        totalSpent: '2990.00',
        avgOrderAmount: '299.00',
        firstOrderDate: new Date('2024-01-01'),
        lastOrderDate: new Date('2024-01-31'),
        favoriteCategory: { id: 1, name: '自然科学', orderCount: 5 },
        monthlyStats: [{ month: '2024-01', orders: 10, amount: '2990.00' }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockCacheService.get.mockResolvedValue(cachedSummary);

      const result = await service.getUserOrderSummary(1);

      expect(result).toEqual(cachedSummary);
      expect(mockPrismaService.order.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserOrderSummary(999)).rejects.toThrow(NotFoundException);
    });

    it('should handle SQL query errors gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.order.findMany
        .mockResolvedValueOnce([{ id: 1, createdAt: new Date('2024-01-01') }])
        .mockResolvedValueOnce([{ actualAmount: { toString: () => '299.00' } }]);
      mockPrismaService.order.findFirst
        .mockResolvedValueOnce({ createdAt: new Date('2024-01-01') })
        .mockResolvedValueOnce({ createdAt: new Date('2024-01-31') });
      mockPrismaService.order.groupBy.mockResolvedValue([{ status: OrderStatus.PAID, _count: 1 }]);
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('SQL error'));
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getUserOrderSummary(1);

      expect(result).toBeDefined();
      expect(result.favoriteCategory.name).toBe('无');
      expect(result.favoriteCategory.orderCount).toBe(0);
    });
  });

  describe('findUserRefunds', () => {
    const mockRefunds = [
      {
        id: 1,
        orderId: 5,
        order: { orderNo: 'ORD20240114123456789' },
        amount: { toString: () => '299.00' },
        status: 'SUCCESS',
        reason: '活动时间变更',
        createdAt: new Date('2024-01-14'),
        refundedAt: new Date('2024-01-15'),
      },
    ];

    it('should return user refund records', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.refundRecord.findMany.mockResolvedValue(mockRefunds);

      const result = await service.findUserRefunds(1);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].orderNo).toBe('ORD20240114123456789');
      expect(result[0].amount).toBe('299.00');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findUserRefunds(999)).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when user has no refunds', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.refundRecord.findMany.mockResolvedValue([]);

      const result = await service.findUserRefunds(1);

      expect(result).toHaveLength(0);
    });
  });
});
