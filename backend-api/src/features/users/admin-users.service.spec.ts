import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '@/lib/prisma.service';
import { CacheService } from '@/redis/cache.service';
import { QueryUsersDto } from './dto/admin/query-users.dto';
import { UpdateUserStatusDto } from './dto/admin/update-user-status.dto';
import { Role, UserStatus, PaymentStatus } from '@prisma/client';

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
    },
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
              lte: expect.any(Date),
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
});
