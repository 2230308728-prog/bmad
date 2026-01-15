import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { QueryUsersDto } from './dto/admin/query-users.dto';
import { UpdateUserStatusDto } from './dto/admin/update-user-status.dto';
import { Role, UserStatus } from '@prisma/client';
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
      expect(mockAdminUsersService.updateStatus).toHaveBeenCalledWith(1, updateDto);
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

      expect(mockAdminUsersService.updateStatus).toHaveBeenCalledWith(1, updateDto);
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

      expect(mockAdminUsersService.updateStatus).toHaveBeenCalledWith(1, updateDto);
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
});
