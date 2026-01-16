import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { QueryUsersDto } from './dto/admin/query-users.dto';
import { QueryUserOrdersDto } from './dto/admin/query-user-orders.dto';
import { UpdateUserStatusDto } from './dto/admin/update-user-status.dto';
import { Role, UserStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let service: AdminUsersService;

  const mockAdminUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    getStats: jest.fn(),
    findUserOrders: jest.fn(),
    getUserOrderSummary: jest.fn(),
    findUserRefunds: jest.fn(),
  };

  const mockUser = {
    id: 1,
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: AdminUsersService,
          useValue: mockAdminUsersService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    service = module.get<AdminUsersService>(AdminUsersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated user list', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
      };

      const mockResult = {
        data: [
          {
            id: 1,
            nickname: '张小明',
            avatarUrl: 'https://example.com/avatar.jpg',
            role: Role.PARENT,
            status: UserStatus.ACTIVE,
            phone: '138****8000',
            orderCount: 5,
            totalSpent: '1495.00',
            lastOrderAt: new Date('2024-01-15'),
            createdAt: new Date('2024-01-01'),
          },
        ],
        total: 100,
        page: 1,
        pageSize: 20,
      };

      mockAdminUsersService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, queryDto);

      expect(result).toEqual(mockResult);
      expect(mockAdminUsersService.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by role', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        role: Role.PARENT,
      };

      mockAdminUsersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminUsersService.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by status', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        status: UserStatus.ACTIVE,
      };

      mockAdminUsersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminUsersService.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should search by keyword', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        keyword: '张',
      };

      mockAdminUsersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminUsersService.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by date range', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        pageSize: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      mockAdminUsersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminUsersService.findAll).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('findOne', () => {
    it('should return user detail', async () => {
      const mockUserDetail = {
        id: 1,
        openid: 'oXabcdefg1234567890',
        email: null,
        nickname: '张小明',
        avatarUrl: 'https://example.com/avatar.jpg',
        phone: '13800138000',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        orderCount: 5,
        totalSpent: '1495.00',
        lastLoginAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      mockAdminUsersService.findOne.mockResolvedValue(mockUserDetail);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual({ data: mockUserDetail });
      expect(mockAdminUsersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should parse user ID correctly', async () => {
      const mockUserDetail = {
        id: 123,
        nickname: 'Test User',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        phone: null,
        orderCount: 0,
        totalSpent: '0.00',
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAdminUsersService.findOne.mockResolvedValue(mockUserDetail);

      await controller.findOne(mockUser, 123);

      expect(mockAdminUsersService.findOne).toHaveBeenCalledWith(123);
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const updateDto: UpdateUserStatusDto = {
        status: UserStatus.BANNED,
        reason: '违反平台规定',
      };

      const mockUpdatedUser = {
        id: 1,
        nickname: '张小明',
        role: Role.PARENT,
        status: UserStatus.BANNED,
        phone: '13800138000',
        orderCount: 5,
        totalSpent: '1495.00',
        lastLoginAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      mockAdminUsersService.updateStatus.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateStatus(mockUser, 1, updateDto);

      expect(result).toEqual({ data: mockUpdatedUser });
      expect(mockAdminUsersService.updateStatus).toHaveBeenCalledWith(
        1,
        updateDto,
      );
    });

    it('should update to ACTIVE status', async () => {
      const updateDto: UpdateUserStatusDto = {
        status: UserStatus.ACTIVE,
      };

      const mockUpdatedUser = {
        id: 1,
        nickname: '张小明',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        phone: '13800138000',
        orderCount: 5,
        totalSpent: '1495.00',
        lastLoginAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      mockAdminUsersService.updateStatus.mockResolvedValue(mockUpdatedUser);

      await controller.updateStatus(mockUser, 1, updateDto);

      expect(mockAdminUsersService.updateStatus).toHaveBeenCalledWith(
        1,
        updateDto,
      );
    });

    it('should update to INACTIVE status', async () => {
      const updateDto: UpdateUserStatusDto = {
        status: UserStatus.INACTIVE,
      };

      const mockUpdatedUser = {
        id: 1,
        nickname: '张小明',
        role: Role.PARENT,
        status: UserStatus.INACTIVE,
        phone: '13800138000',
        orderCount: 5,
        totalSpent: '1495.00',
        lastLoginAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      mockAdminUsersService.updateStatus.mockResolvedValue(mockUpdatedUser);

      // ParseIntPipe converts the string '1' to number 1 before reaching the controller
      await controller.updateStatus(mockUser, 1, updateDto);

      expect(mockAdminUsersService.updateStatus).toHaveBeenCalledWith(
        1,
        updateDto,
      );
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
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

      mockAdminUsersService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual({ data: mockStats });
      expect(mockAdminUsersService.getStats).toHaveBeenCalled();
    });
  });

  describe('findUserOrders', () => {
    it('should return user orders', async () => {
      const queryDto: QueryUserOrdersDto = {
        page: 1,
        pageSize: 20,
      };

      const mockOrderResult = {
        data: [
          {
            id: 1,
            orderNo: 'ORD20240114123456789',
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.SUCCESS,
            totalAmount: '299.00',
            actualAmount: '299.00',
            bookingDate: new Date('2024-02-15'),
            items: [
              {
                id: 1,
                productId: 1,
                productName: '上海科技馆探索之旅',
                productPrice: '299.00',
                quantity: 1,
                subtotal: '299.00',
              },
            ],
            paidAt: new Date('2024-01-14'),
            createdAt: new Date('2024-01-14'),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      mockAdminUsersService.findUserOrders.mockResolvedValue(mockOrderResult);

      const result = await controller.findUserOrders(mockUser, 1, queryDto);

      expect(result).toEqual(mockOrderResult);
      expect(mockAdminUsersService.findUserOrders).toHaveBeenCalledWith(
        1,
        queryDto,
      );
    });

    it('should filter by status', async () => {
      const queryDto: QueryUserOrdersDto = {
        page: 1,
        pageSize: 20,
        status: OrderStatus.PAID,
      };

      mockAdminUsersService.findUserOrders.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      await controller.findUserOrders(mockUser, 1, queryDto);

      expect(mockAdminUsersService.findUserOrders).toHaveBeenCalledWith(
        1,
        queryDto,
      );
    });

    it('should filter by date range', async () => {
      const queryDto: QueryUserOrdersDto = {
        page: 1,
        pageSize: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      mockAdminUsersService.findUserOrders.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      await controller.findUserOrders(mockUser, 1, queryDto);

      expect(mockAdminUsersService.findUserOrders).toHaveBeenCalledWith(
        1,
        queryDto,
      );
    });
  });

  describe('getUserOrderSummary', () => {
    it('should return user order summary', async () => {
      const mockSummary = {
        totalOrders: 15,
        paidOrders: 12,
        completedOrders: 10,
        cancelledOrders: 2,
        refundedOrders: 1,
        totalSpent: '4485.00',
        avgOrderAmount: '299.00',
        firstOrderDate: new Date('2023-12-01'),
        lastOrderDate: new Date('2024-01-08'),
        favoriteCategory: { id: 1, name: '自然科学', orderCount: 8 },
        monthlyStats: [
          { month: '2024-01', orders: 10, amount: '2990.00' },
          { month: '2023-12', orders: 5, amount: '1495.00' },
        ],
      };

      mockAdminUsersService.getUserOrderSummary.mockResolvedValue(mockSummary);

      const result = await controller.getUserOrderSummary(mockUser, 1);

      expect(result).toEqual({ data: mockSummary });
      expect(mockAdminUsersService.getUserOrderSummary).toHaveBeenCalledWith(1);
    });
  });

  describe('findUserRefunds', () => {
    it('should return user refund records', async () => {
      const mockRefunds = [
        {
          id: 1,
          orderId: 5,
          orderNo: 'ORD20240114123456789',
          amount: '299.00',
          status: 'SUCCESS',
          reason: '活动时间变更',
          requestedAt: new Date('2024-01-14'),
          processedAt: new Date('2024-01-15'),
        },
      ];

      mockAdminUsersService.findUserRefunds.mockResolvedValue(mockRefunds);

      const result = await controller.findUserRefunds(mockUser, 1);

      expect(result).toEqual({ data: mockRefunds });
      expect(mockAdminUsersService.findUserRefunds).toHaveBeenCalledWith(1);
    });
  });
});
