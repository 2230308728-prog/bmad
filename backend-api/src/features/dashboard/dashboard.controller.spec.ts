import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Role } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;

  const mockDashboardService = {
    getOverview: jest.fn(),
    getOrdersTrend: jest.fn(),
    getUsersTrend: jest.fn(),
    getRevenueBreakdown: jest.fn(),
  };

  const mockUser = {
    id: 1,
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return overview data', async () => {
      const mockResult = {
        today: { orders: 25, ordersAmount: '7500.00', newUsers: 3, paidOrders: 20, completedOrders: 15 },
        week: { orders: 150, ordersAmount: '45000.00', newUsers: 18, paidOrders: 120, completedOrders: 100 },
        month: { orders: 600, ordersAmount: '180000.00', newUsers: 65, paidOrders: 480, completedOrders: 400 },
        total: { users: 150, orders: 2000, products: 50, revenue: '600000.00' },
      };

      mockDashboardService.getOverview.mockResolvedValue(mockResult);

      const result = await controller.getOverview(mockUser);

      expect(service.getOverview).toHaveBeenCalled();
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('getOrdersTrend', () => {
    it('should return orders trend data', async () => {
      const query = { period: 'today' as const, granularity: 'hour' as const };
      const mockResult = {
        period: 'today',
        granularity: 'hour',
        data: [],
        totalOrders: 0,
        totalAmount: '0.00',
      };

      mockDashboardService.getOrdersTrend.mockResolvedValue(mockResult);

      const result = await controller.getOrdersTrend(mockUser, query);

      expect(service.getOrdersTrend).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('getUsersTrend', () => {
    it('should return users trend data', async () => {
      const query = { period: 'today' as const, granularity: 'hour' as const };
      const mockResult = {
        period: 'today',
        granularity: 'hour',
        newUsers: [],
        activeUsers: [],
      };

      mockDashboardService.getUsersTrend.mockResolvedValue(mockResult);

      const result = await controller.getUsersTrend(mockUser, query);

      expect(service.getUsersTrend).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('getRevenueBreakdown', () => {
    it('should return revenue breakdown data', async () => {
      const mockResult = {
        byCategory: [],
        byPaymentMethod: [{ method: 'WECHAT', amount: '0.00', percentage: 100 }],
      };

      mockDashboardService.getRevenueBreakdown.mockResolvedValue(mockResult);

      const result = await controller.getRevenueBreakdown(mockUser);

      expect(service.getRevenueBreakdown).toHaveBeenCalled();
      expect(result).toEqual({ data: mockResult });
    });
  });
});
