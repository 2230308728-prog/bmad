import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminQueryOrdersDto } from './dto/admin/admin-query-orders.dto';
import { UpdateOrderStatusDto } from './dto/admin/update-order-status.dto';
import { OrderStatus } from '@prisma/client';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

describe('AdminOrdersController', () => {
  let controller: AdminOrdersController;
  let service: AdminOrdersService;

  const mockAdminOrdersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    getStats: jest.fn(),
  };

  const mockUser: CurrentUserType = {
    id: 1,
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [
        {
          provide: AdminOrdersService,
          useValue: mockAdminOrdersService,
        },
      ],
    }).compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
    service = module.get<AdminOrdersService>(AdminOrdersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const mockOrderListResponse = {
      data: [
        {
          id: 1,
          orderNo: 'ORD20240114123456789',
          status: OrderStatus.PAID,
          totalAmount: '299.00',
          actualAmount: '299.00',
          user: {
            id: 1,
            name: '张小明',
            phone: '13800138000',
            role: 'PARENT',
          },
          product: {
            id: 1,
            title: '上海科技馆探索之旅',
            price: '299.00',
          },
          bookingDate: '2024-02-15',
          createdAt: '2024-01-14T12:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    it('should return paginated order list', async () => {
      mockAdminOrdersService.findAll.mockResolvedValue(mockOrderListResponse);

      const result = await controller.findAll(mockUser, {});

      expect(result).toEqual(mockOrderListResponse);
    });

    it('should pass query parameters to service', async () => {
      mockAdminOrdersService.findAll.mockResolvedValue(mockOrderListResponse);

      const queryDto: AdminQueryOrdersDto = {
        page: 2,
        pageSize: 10,
        status: OrderStatus.PAID,
        orderNo: 'ORD2024',
      };

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminOrdersService.findAll).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('findOne', () => {
    const mockOrderDetail = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      status: OrderStatus.PAID,
    };

    it('should return order detail', async () => {
      mockAdminOrdersService.findOne.mockResolvedValue(mockOrderDetail);

      const result = await controller.findOne(mockUser, '1');

      expect(result).toEqual({ data: mockOrderDetail });
      expect(mockAdminOrdersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw HttpException for invalid order ID', async () => {
      await expect(controller.findOne(mockUser, 'invalid')).rejects.toThrow(HttpException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      mockAdminOrdersService.updateStatus.mockResolvedValue({ id: 1 });

      const updateDto: UpdateOrderStatusDto = {
        status: OrderStatus.COMPLETED,
        reason: '活动已完成',
      };

      const result = await controller.updateStatus(mockUser, 1, updateDto);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('message', '状态已更新');
      expect(mockAdminOrdersService.updateStatus).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('getStats', () => {
    it('should return order statistics', async () => {
      const mockStats = {
        total: 1000,
        pending: 50,
        paid: 800,
        completed: 100,
        cancelled: 30,
        refunded: 20,
        todayCount: 25,
        todayAmount: '7500.00',
      };

      mockAdminOrdersService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual({ data: mockStats });
    });
  });
});
