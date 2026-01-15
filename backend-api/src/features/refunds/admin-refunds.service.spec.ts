import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { WechatPayService } from '../payments/wechat-pay.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminRefundsService } from './admin-refunds.service';
import { AdminQueryRefundsDto } from './dto/admin';
import { RefundStatus, OrderStatus } from '@prisma/client';

describe('AdminRefundsService', () => {
  let service: AdminRefundsService;
  let prismaService: PrismaService;
  let cacheService: CacheService;
  let wechatPayService: WechatPayService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    refundRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    del: jest.fn(),
  };

  const mockWechatPayService = {
    isAvailable: jest.fn(() => true),
    refund: jest.fn(),
    queryRefund: jest.fn(),
  };

  const mockNotificationsService = {
    sendRefundNotification: jest.fn(),
  };

  const mockUser = {
    id: 1,
    name: '张三',
    phone: '13800138000',
    role: 'PARENT',
  };

  const mockOrder = {
    id: 1,
    orderNo: 'ORD20240114123456789',
    userId: 1,
    status: OrderStatus.PAID,
    totalAmount: { toString: () => '299.00' },
    actualAmount: { toString: () => '299.00' },
    paymentStatus: 'PAID',
    bookingDate: new Date('2024-02-15'),
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
    payments: [
      {
        id: 1,
        transactionId: 'WX1234567890',
        channel: 'WECHAT',
        amount: { toString: () => '299.00' },
        status: 'SUCCESS',
        createdAt: new Date('2024-01-14T10:00:00Z'),
      },
    ],
  };

  const mockRefund = {
    id: 1,
    refundNo: 'REF20240114123456789',
    userId: 1,
    orderId: 1,
    amount: { toString: () => '299.00' },
    reason: '行程有变',
    description: '由于孩子临时生病',
    images: ['https://oss.example.com/proof.jpg'],
    status: RefundStatus.PENDING,
    createdAt: new Date('2024-01-14T12:00:00Z'),
    approvedAt: null,
    adminNote: null,
    rejectedReason: null,
    rejectedAt: null,
    refundedAt: null,
    wechatRefundId: null,
    user: mockUser,
    order: mockOrder,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRefundsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: WechatPayService,
          useValue: mockWechatPayService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AdminRefundsService>(AdminRefundsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
    wechatPayService = module.get<WechatPayService>(WechatPayService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated refund list with PENDING first', async () => {
      const mockRefunds = [
        { ...mockRefund, status: RefundStatus.PENDING },
        { ...mockRefund, id: 2, refundNo: 'REF20240114223456789', status: RefundStatus.APPROVED },
      ];

      (mockPrismaService.refundRecord.findMany as jest.Mock).mockResolvedValue(mockRefunds);
      (mockPrismaService.refundRecord.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll(new AdminQueryRefundsDto());

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      // PENDING should be first
      expect(result.data[0].status).toBe(RefundStatus.PENDING);
    });

    it('should filter by status', async () => {
      (mockPrismaService.refundRecord.findMany as jest.Mock).mockResolvedValue([mockRefund]);
      (mockPrismaService.refundRecord.count as jest.Mock).mockResolvedValue(1);

      const queryDto = new AdminQueryRefundsDto();
      queryDto.status = RefundStatus.PENDING;

      await service.findAll(queryDto);

      expect(mockPrismaService.refundRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RefundStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by refundNo (partial match)', async () => {
      (mockPrismaService.refundRecord.findMany as jest.Mock).mockResolvedValue([mockRefund]);
      (mockPrismaService.refundRecord.count as jest.Mock).mockResolvedValue(1);

      const queryDto = new AdminQueryRefundsDto();
      queryDto.refundNo = 'REF20240114';

      await service.findAll(queryDto);

      expect(mockPrismaService.refundRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            refundNo: {
              contains: 'REF20240114',
            },
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      (mockPrismaService.refundRecord.findMany as jest.Mock).mockResolvedValue([mockRefund]);
      (mockPrismaService.refundRecord.count as jest.Mock).mockResolvedValue(1);

      const queryDto = new AdminQueryRefundsDto();
      queryDto.startDate = '2024-01-01';
      queryDto.endDate = '2024-12-31';

      await service.findAll(queryDto);

      expect(mockPrismaService.refundRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: new Date('2024-01-01'),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return refund detail with order and payment info', async () => {
      (mockPrismaService.refundRecord.findUnique as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        title: '上海科技馆探索之旅',
        images: ['https://oss.example.com/products/1/image1.jpg'],
      });

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('order');
      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('product');
    });

    it('should throw NotFoundException when refund does not exist', async () => {
      (mockPrismaService.refundRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve refund successfully', async () => {
      // First call - checking if refund exists before approval
      (mockPrismaService.refundRecord.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockRefund); // for status check

      (mockPrismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return {
          ...mockRefund,
          status: RefundStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: 1,
          adminNote: '已核实用户凭证',
        };
      });

      // Mock payment.findMany for WeChat refund integration
      (mockPrismaService.payment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          amount: { toString: () => '299.00' },
          status: 'SUCCESS',
        },
      ]);

      // Mock WechatPayService.refund
      (mockWechatPayService.refund as jest.Mock).mockResolvedValue({
        refund_id: 'REFUND_WX_123',
        status: 'PROCESSING',
      });

      // Mock refundRecord.update for PROCESSING status
      (mockPrismaService.refundRecord.update as jest.Mock).mockResolvedValue({
        ...mockRefund,
        status: RefundStatus.PROCESSING,
        wechatRefundId: 'REFUND_WX_123',
      });

      // Second call - in findOne after approval
      (mockPrismaService.refundRecord.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          ...mockRefund,
          status: RefundStatus.APPROVED,
          approvedAt: new Date(),
        });

      (mockPrismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        title: '上海科技馆探索之旅',
        images: [],
      });

      const result = await service.approve(1, '已核实用户凭证', 1);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockCacheService.del).toHaveBeenCalled();
      expect(mockWechatPayService.refund).toHaveBeenCalled();
    });

    it('should throw NotFoundException when refund does not exist', async () => {
      (mockPrismaService.refundRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.approve(999, '备注', 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when refund status is not PENDING', async () => {
      const approvedRefund = { ...mockRefund, status: RefundStatus.APPROVED };
      (mockPrismaService.refundRecord.findUnique as jest.Mock).mockResolvedValue(approvedRefund);

      await expect(service.approve(1, '备注', 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject refund successfully', async () => {
      // First call - checking if refund exists before rejection
      (mockPrismaService.refundRecord.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockRefund); // for status check

      (mockPrismaService.refundRecord.update as jest.Mock).mockResolvedValue({
        ...mockRefund,
        status: RefundStatus.REJECTED,
        rejectedReason: '不符合退款条件',
        rejectedAt: new Date(),
      });

      // Second call - in findOne after rejection
      (mockPrismaService.refundRecord.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          ...mockRefund,
          status: RefundStatus.REJECTED,
          rejectedReason: '不符合退款条件',
          rejectedAt: new Date(),
        });

      (mockPrismaService.product.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        title: '上海科技馆探索之旅',
        images: [],
      });

      const result = await service.reject(1, '不符合退款条件', 1);

      expect(mockPrismaService.refundRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: RefundStatus.REJECTED,
            rejectedReason: '不符合退款条件',
          }),
        }),
      );
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rejectedReason is empty', async () => {
      await expect(service.reject(1, '', 1)).rejects.toThrow(BadRequestException);
      await expect(service.reject(1, '   ', 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when refund does not exist', async () => {
      (mockPrismaService.refundRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.reject(999, '原因', 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when refund status is not PENDING', async () => {
      const rejectedRefund = { ...mockRefund, status: RefundStatus.REJECTED };
      (mockPrismaService.refundRecord.findUnique as jest.Mock).mockResolvedValue(rejectedRefund);

      await expect(service.reject(1, '原因', 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return refund statistics', async () => {
      (mockPrismaService.refundRecord.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(50) // approved
        .mockResolvedValueOnce(20) // rejected
        .mockResolvedValueOnce(5) // processing
        .mockResolvedValueOnce(10) // completed
        .mockResolvedValueOnce(5); // failed

      (mockPrismaService.refundRecord.findMany as jest.Mock)
        .mockResolvedValueOnce([{ amount: { toString: () => '1000.00' } }]) // pending refunds
        .mockResolvedValueOnce([{ amount: { toString: () => '10000.00' } }]); // all refunds

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.pending).toBe(10);
      expect(result.approved).toBe(50);
      expect(result.rejected).toBe(20);
      expect(result.processing).toBe(5);
      expect(result.completed).toBe(10);
      expect(result.failed).toBe(5);
      expect(result.totalAmount).toBe('10000.00');
      expect(result.pendingAmount).toBe('1000.00');
    });
  });
});
