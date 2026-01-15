import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryRefundsDto } from './dto/query-refunds.dto';
import { RefundStatus, OrderStatus } from '@prisma/client';

describe('RefundsService', () => {
  let service: RefundsService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refundRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  const mockCacheService = {
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
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

    service = module.get<RefundsService>(RefundsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockOrder = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      userId: 1,
      status: OrderStatus.PAID,
      actualAmount: { toString: () => '299.00' },
      bookingDate: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now (more than 48h)
    };

    const createRefundDto: CreateRefundDto = {
      orderId: 1,
      reason: '行程有变，无法参加',
      description: '由于孩子临时生病',
      images: ['https://oss.example.com/proof.jpg'],
    };

    it('should create refund successfully', async () => {
      (mockPrismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (mockPrismaService.refundRecord.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        // Simulate transaction callback
        const mockCreatedRefund = {
          id: 1,
          refundNo: 'REF20240114123456789',
          status: RefundStatus.PENDING,
          amount: { toString: () => '299.00' },
          createdAt: new Date('2024-01-14T12:00:00Z'),
        };
        return mockCreatedRefund;
      });

      const result = await service.create(1, createRefundDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('refundNo');
      expect(result.status).toBe('PENDING');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      (mockPrismaService.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(1, createRefundDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when order does not belong to user', async () => {
      const otherUserOrder = { ...mockOrder, userId: 2 };
      (mockPrismaService.order.findUnique as jest.Mock).mockResolvedValue(otherUserOrder);

      await expect(service.create(1, createRefundDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when order status is not PAID', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      (mockPrismaService.order.findUnique as jest.Mock).mockResolvedValue(pendingOrder);

      await expect(service.create(1, createRefundDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refund already exists for order', async () => {
      (mockPrismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (mockPrismaService.refundRecord.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.PENDING,
      });

      await expect(service.create(1, createRefundDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refund deadline exceeded', async () => {
      // bookingDate is within 48 hours from now
      const pastBookingOrder = {
        ...mockOrder,
        bookingDate: new Date(Date.now() + 47 * 60 * 60 * 1000), // 47 hours from now
      };
      (mockPrismaService.order.findUnique as jest.Mock).mockResolvedValue(pastBookingOrder);
      (mockPrismaService.refundRecord.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(1, createRefundDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when bookingDate is null', async () => {
      // bookingDate is null - should not allow refund
      const noBookingDateOrder = {
        ...mockOrder,
        bookingDate: null,
      };
      (mockPrismaService.order.findUnique as jest.Mock).mockResolvedValue(noBookingDateOrder);
      (mockPrismaService.refundRecord.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(1, createRefundDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const mockRefunds = [
      {
        id: 1,
        refundNo: 'REF20240114123456789',
        userId: 1,
        amount: { toString: () => '299.00' },
        reason: '行程有变',
        status: RefundStatus.PENDING,
        createdAt: new Date('2024-01-14T12:00:00Z'),
      },
    ];

    it('should return paginated refund list', async () => {
      (mockPrismaService.refundRecord.findMany as jest.Mock).mockResolvedValue(mockRefunds);
      (mockPrismaService.refundRecord.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(1, new QueryRefundsDto());

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should filter by userId', async () => {
      (mockPrismaService.refundRecord.findMany as jest.Mock).mockResolvedValue(mockRefunds);
      (mockPrismaService.refundRecord.count as jest.Mock).mockResolvedValue(1);

      await service.findAll(1, { page: 1, pageSize: 10 });

      expect(mockPrismaService.refundRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
          }),
        }),
      );
    });

    it('should sort by appliedAt descending', async () => {
      (mockPrismaService.refundRecord.findMany as jest.Mock).mockResolvedValue(mockRefunds);
      (mockPrismaService.refundRecord.count as jest.Mock).mockResolvedValue(1);

      await service.findAll(1, { page: 2, pageSize: 20 });

      expect(mockPrismaService.refundRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' }, // createdAt maps to appliedAt in the response
          skip: 20,
          take: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockRefund = {
      id: 1,
      refundNo: 'REF20240114123456789',
      userId: 1,
      orderId: 1,
      amount: { toString: () => '299.00' },
      reason: '行程有变',
      description: '详细说明',
      images: ['https://oss.example.com/proof.jpg'],
      status: RefundStatus.PENDING,
      createdAt: new Date('2024-01-14T12:00:00Z'),
      approvedAt: null,
      adminNote: null,
      rejectedReason: null,
      refundedAt: null,
      order: {
        id: 1,
        orderNo: 'ORD20240114123456789',
        status: OrderStatus.PAID,
        totalAmount: { toString: () => '299.00' },
        bookingDate: new Date('2024-02-15'),
        items: [
          {
            productId: 1,
            product: {
              id: 1,
              title: '上海科技馆探索之旅',
              images: ['https://oss.example.com/products/1/image1.jpg'],
            },
          },
        ],
      },
    };

    it('should return refund detail with order and product info', async () => {
      (mockPrismaService.refundRecord.findFirst as jest.Mock).mockResolvedValue(mockRefund);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('order');
      expect(result).toHaveProperty('product');
      expect(result.product).toHaveProperty('id', 1);
      expect(result.product).toHaveProperty('title', '上海科技馆探索之旅');
    });

    it('should throw NotFoundException when refund does not exist', async () => {
      (mockPrismaService.refundRecord.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when refund does not belong to user', async () => {
      const otherUserRefund = { ...mockRefund, userId: 2 };
      (mockPrismaService.refundRecord.findFirst as jest.Mock).mockResolvedValue(otherUserRefund);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
