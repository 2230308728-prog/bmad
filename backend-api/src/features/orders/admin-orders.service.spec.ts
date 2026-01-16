import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminQueryOrdersDto } from './dto/admin/admin-query-orders.dto';
import { OrderStatus } from '@prisma/client';

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    refundRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCacheService = {
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOrdersService,
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

    service = module.get<AdminOrdersService>(AdminOrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockOrders = [
      {
        id: 1,
        orderNo: 'ORD20240114123456789',
        userId: 1,
        totalAmount: { toString: () => '299.00' },
        actualAmount: { toString: () => '299.00' },
        status: OrderStatus.PAID,
        bookingDate: new Date('2024-02-15'),
        createdAt: new Date('2024-01-14T12:00:00Z'),
        user: {
          id: 1,
          name: '张小明',
          phone: '13800138000',
          role: 'PARENT',
        },
        items: [
          {
            productId: 1,
            productName: '上海科技馆探索之旅',
            productPrice: { toString: () => '299.00' },
          },
        ],
      },
    ];

    it('should return paginated order list without filters', async () => {
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].user.phone).toBe('13800138000'); // 不脱敏
    });

    it('should filter by status', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[0]]);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        status: OrderStatus.PAID,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should filter by orderNo', async () => {
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.findAll({ page: 1, pageSize: 20, orderNo: 'ORD2024' });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderNo: { contains: 'ORD2024' },
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.findAll({
        page: 1,
        pageSize: 20,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockOrderDetail = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      status: OrderStatus.PAID,
      paymentStatus: 'SUCCESS',
      totalAmount: { toString: () => '299.00' },
      actualAmount: { toString: () => '299.00' },
      remark: '请提前预约',
      contactName: '张三',
      contactPhone: '13800138000',
      childName: '小明',
      childAge: 8,
      bookingDate: new Date('2024-02-15'),
      participantCount: 2,
      paidAt: new Date('2024-01-14T12:30:00Z'),
      createdAt: new Date('2024-01-14T12:00:00Z'),
      user: {
        id: 1,
        name: '张小明',
        phone: '13800138000',
        role: 'PARENT',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
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
      payments: [],
      refunds: [],
      statusHistory: [
        {
          id: 1,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PAID,
          reason: '用户完成支付',
          changedBy: 1,
          createdAt: new Date('2024-01-14T12:30:00Z'),
          changedByUser: {
            id: 1,
            name: '管理员',
          },
        },
      ],
    };

    it('should return order detail with all data', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrderDetail);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('statusHistory');
      expect(result.user.phone).toBe('13800138000'); // 不脱敏
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    const mockOrder = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      status: OrderStatus.PAID,
    };

    it('should update order status to COMPLETED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      });
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.refundRecord.findFirst.mockResolvedValue(null);

      jest.spyOn(service, 'findOne').mockResolvedValue({});

      await service.updateStatus(
        1,
        { status: OrderStatus.COMPLETED, reason: '活动已完成' },
        1,
      );

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.COMPLETED,
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus(1, { status: OrderStatus.PENDING }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create refund record when status is REFUNDED', async () => {
      const orderWithAmount = {
        ...mockOrder,
        userId: 1,
        actualAmount: { toString: () => '299.00' },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(orderWithAmount);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...orderWithAmount,
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
      });
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.refundRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.refundRecord.create.mockResolvedValue({});

      jest.spyOn(service, 'findOne').mockResolvedValue({});

      await service.updateStatus(1, { status: OrderStatus.REFUNDED }, 1);

      expect(mockPrismaService.refundRecord.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when refund already exists for order', async () => {
      const existingRefund = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: 'PENDING',
      };

      const orderWithAmount = {
        ...mockOrder,
        userId: 1,
        totalAmount: { toString: () => '299.00' },
        actualAmount: { toString: () => '299.00' },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(orderWithAmount);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...orderWithAmount,
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
      });
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});

      // 第一次调用返回 PENDING 状态的退款（唯一约束检查）
      mockPrismaService.refundRecord.findFirst.mockResolvedValueOnce(existingRefund);

      await expect(
        service.updateStatus(1, { status: OrderStatus.REFUNDED }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow new refund when existing refund is not PENDING or PROCESSING', async () => {
      const completedRefund = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: 'COMPLETED',
      };

      // 重置 refundRecord.findFirst 的 mock
      mockPrismaService.refundRecord.findFirst = jest.fn();

      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: 1,
        actualAmount: { toString: () => '100' },
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.REFUNDING,
      });
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});

      // 第一次调用返回 null（没有 PENDING/PROCESSING 退款）
      // 第二次调用返回 COMPLETED 状态的退款
      mockPrismaService.refundRecord.findFirst
        .mockImplementationOnce(async () => null)
        .mockImplementationOnce(async () => completedRefund);

      jest.spyOn(service, 'findOne').mockResolvedValue({});

      await service.updateStatus(1, { status: OrderStatus.REFUNDING }, 1);

      // 由于已存在 COMPLETED 状态的退款，不应该创建新的退款记录
      expect(mockPrismaService.refundRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return order statistics', async () => {
      mockPrismaService.order.count.mockResolvedValue(100);
      mockPrismaService.order.findMany.mockResolvedValue([
        { totalAmount: { toString: () => '100' } },
        { totalAmount: { toString: () => '200' } },
      ]);

      const result = await service.getStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('todayCount');
      expect(result).toHaveProperty('todayAmount', '300.00');
    });
  });
});
