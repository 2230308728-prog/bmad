import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { WechatPayService } from '../payments/wechat-pay.service';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, ProductStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let cacheService: CacheService;
  let wechatPayService: WechatPayService;

  const mockCacheService = {
    getStock: jest.fn(),
    setStock: jest.fn(),
    decrby: jest.fn(),
    incrby: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    del: jest.fn(),
  };

  const mockWechatPayService = {
    queryOrder: jest.fn(),
  };

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
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
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
    wechatPayService = module.get<WechatPayService>(WechatPayService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockProduct = {
      id: 1,
      title: '上海科技馆探索之旅',
      description: '精彩的科技探索之旅',
      categoryId: 1,
      price: new Prisma.Decimal(299),
      stock: 50,
      minAge: 6,
      maxAge: 12,
      images: ['https://example.com/image.jpg'],
      status: ProductStatus.PUBLISHED,
    };

    const createOrderDto: CreateOrderDto = {
      productId: 1,
      bookingDate: '2024-02-15',
      childName: '张小明',
      childAge: 8,
      contactName: '张爸爸',
      contactPhone: '13800138000',
      participantCount: 2,
      remark: '如有食物过敏请提前告知',
    };

    const mockCreatedOrder = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      userId: 1,
      totalAmount: new Prisma.Decimal(598),
      actualAmount: new Prisma.Decimal(598),
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      remark: '如有食物过敏请提前告知',
      createdAt: new Date('2024-01-14T12:00:00Z'),
    };

    it('should create an order successfully', async () => {
      // Mock product found
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      // Mock Redis stock not initialized
      mockCacheService.getStock.mockResolvedValue(null);
      // Mock Redis stock set success
      mockCacheService.setStock.mockResolvedValue(undefined);
      // Mock Redis stock pre-deduct success
      mockCacheService.decrby.mockResolvedValue(48);
      // Mock transaction success
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.create(1, createOrderDto);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('orderNo', 'ORD20240114123456789');
      expect(result).toHaveProperty('status', 'PENDING');
      expect(result).toHaveProperty('totalAmount');
      // totalAmount is a Decimal converted to string, format may vary
      expect(result.totalAmount).toMatch(/^\d+(\.\d{1,2})?$/);
      expect(result.product).toEqual({
        id: 1,
        title: '上海科技馆探索之旅',
        images: ['https://example.com/image.jpg'],
      });
      expect(mockCacheService.setStock).toHaveBeenCalledWith('product:stock:1', 50);
      expect(mockCacheService.decrby).toHaveBeenCalledWith('product:stock:1', 2);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.create(1, createOrderDto)).rejects.toThrow(
        new NotFoundException('产品不存在或已下架'),
      );
      expect(mockCacheService.decrby).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product is not published', async () => {
      // The service queries for status: 'PUBLISHED', so a DRAFT product won't be found
      mockPrismaService.product.findFirst.mockResolvedValueOnce(null);

      await expect(service.create(1, createOrderDto)).rejects.toThrow(
        new NotFoundException('产品不存在或已下架'),
      );
      expect(mockCacheService.decrby).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      mockPrismaService.product.findFirst.mockResolvedValue(lowStockProduct);

      await expect(service.create(1, createOrderDto)).rejects.toThrow(
        new BadRequestException('库存不足，请选择其他日期或产品'),
      );
      expect(mockCacheService.decrby).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when child age is out of range', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const invalidAgeDto = { ...createOrderDto, childAge: 15 };

      await expect(service.create(1, invalidAgeDto)).rejects.toThrow(
        new BadRequestException('产品适用年龄：6-12岁'),
      );
      expect(mockCacheService.decrby).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when Redis stock pre-deduct fails', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockCacheService.getStock.mockResolvedValue(null);
      mockCacheService.setStock.mockResolvedValue(undefined);
      // Mock Redis stock pre-deduct failure (returns null)
      mockCacheService.decrby.mockResolvedValue(null);

      await expect(service.create(1, createOrderDto)).rejects.toThrow(
        new BadRequestException('库存不足，请选择其他日期或产品'),
      );
    });

    it('should throw BadRequestException when Redis stock goes negative', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockCacheService.getStock.mockResolvedValue(null);
      mockCacheService.setStock.mockResolvedValue(undefined);
      // Mock Redis stock goes negative
      mockCacheService.decrby.mockResolvedValue(-1);
      // Mock rollback
      mockCacheService.incrby.mockResolvedValue(49);

      await expect(service.create(1, createOrderDto)).rejects.toThrow(
        new BadRequestException('库存不足，请选择其他日期或产品'),
      );
      expect(mockCacheService.incrby).toHaveBeenCalledWith('product:stock:1', 2);
    });

    it('should rollback Redis stock when transaction fails', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockCacheService.getStock.mockResolvedValue(null);
      mockCacheService.setStock.mockResolvedValue(undefined);
      mockCacheService.decrby.mockResolvedValue(48);
      // Mock transaction failure
      mockPrismaService.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(service.create(1, createOrderDto)).rejects.toThrow('Database error');
      expect(mockCacheService.incrby).toHaveBeenCalledWith('product:stock:1', 2);
    });

    it('should use existing Redis stock value when already initialized', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      // Mock Redis stock already initialized
      mockCacheService.getStock.mockResolvedValue(45);
      mockCacheService.decrby.mockResolvedValue(43);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.create(1, createOrderDto);

      expect(mockCacheService.setStock).not.toHaveBeenCalled();
      expect(mockCacheService.getStock).toHaveBeenCalledWith('product:stock:1');
    });
  });

  describe('checkPaymentQueryRateLimit', () => {
    it('should allow first query and set counter to 1', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.checkPaymentQueryRateLimit(1);

      expect(result).toBe(false);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/payment-query:1:\d+/),
        '1',
        60,
      );
    });

    it('should allow queries under limit', async () => {
      mockCacheService.get.mockResolvedValue('5');

      const result = await service.checkPaymentQueryRateLimit(1);

      expect(result).toBe(false);
      expect(mockCacheService.incr).toHaveBeenCalledWith(
        expect.stringMatching(/payment-query:1:\d+/),
      );
    });

    it('should block queries over limit', async () => {
      mockCacheService.get.mockResolvedValue('10');

      const result = await service.checkPaymentQueryRateLimit(1);

      expect(result).toBe(true);
      expect(mockCacheService.incr).not.toHaveBeenCalled();
    });

    it('should block queries when Redis incr fails (returns null)', async () => {
      mockCacheService.get.mockResolvedValue('5');
      mockCacheService.incr.mockResolvedValue(null); // Redis operation fails

      const result = await service.checkPaymentQueryRateLimit(1);

      expect(result).toBe(true);
      expect(mockCacheService.incr).toHaveBeenCalledWith(
        expect.stringMatching(/payment-query:1:\d+/),
      );
    });
  });

  describe('checkPaymentStatus', () => {
    const mockOrderWithItems = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      userId: 1,
      totalAmount: new Prisma.Decimal(299),
      actualAmount: new Prisma.Decimal(299),
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paidAt: null,
      items: [
        {
          productId: 10,
          quantity: 1,
        },
      ],
      payments: [],
    };

    it('should throw NotFoundException when order does not exist', async () => {
      (mockPrismaService as any).order = { findFirst: jest.fn().mockResolvedValue(null) };

      await expect(service.checkPaymentStatus(1, 1)).rejects.toThrow(
        new NotFoundException('订单不存在'),
      );
    });

    it('should throw ForbiddenException when order does not belong to user', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue({ ...mockOrderWithItems, userId: 2 }),
      };

      await expect(service.checkPaymentStatus(1, 1)).rejects.toThrow('无权访问此订单');
    });

    it('should return PAID status when order is already paid', async () => {
      const paidOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.SUCCESS,
        paidAt: new Date('2024-01-14T12:00:00Z'),
        payments: [
          {
            transactionId: 'wx1234567890',
          },
        ],
      };
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(paidOrder),
      };

      const result = await service.checkPaymentStatus(1, 1);

      expect(result.status).toBe('PAID');
      expect(result.transactionId).toBe('wx1234567890');
      expect(mockWechatPayService.queryOrder).not.toHaveBeenCalled();
    });

    it('should return CANCELLED status when order is cancelled', async () => {
      const cancelledOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.CANCELLED,
      };
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(cancelledOrder),
      };

      const result = await service.checkPaymentStatus(1, 1);

      expect(result.status).toBe('CANCELLED');
      expect(result.message).toBe('订单已取消');
      expect(mockWechatPayService.queryOrder).not.toHaveBeenCalled();
    });

    it('should query WeChat Pay API and return PENDING for USERPAYING status', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderWithItems),
      };
      mockWechatPayService.queryOrder.mockResolvedValue({
        trade_state: 'USERPAYING',
      });

      const result = await service.checkPaymentStatus(1, 1);

      expect(result.status).toBe('PENDING');
      expect(result.message).toBe('支付处理中，请稍后查询');
    });

    it('should query WeChat Pay API, update order to CANCELLED for CLOSED status', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderWithItems),
      };
      mockWechatPayService.queryOrder.mockResolvedValue({
        trade_state: 'CLOSED',
      });
      (mockPrismaService as any).product = { update: jest.fn() };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });
      mockCacheService.incrby.mockResolvedValue(1);

      const result = await service.checkPaymentStatus(1, 1);

      expect(result.status).toBe('CANCELLED');
      expect(result.message).toBe('支付已关闭');
      expect(mockCacheService.incrby).toHaveBeenCalledWith('product:stock:10', 1);
    });

    it('should query WeChat Pay API, update order to PAID for SUCCESS status', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderWithItems),
      };
      (mockPrismaService as any).product = { update: jest.fn() };
      (mockPrismaService as any).paymentRecord = { create: jest.fn() };
      mockWechatPayService.queryOrder.mockResolvedValue({
        trade_state: 'SUCCESS',
        transaction_id: 'wx1234567890',
        out_trade_no: 'ORD20240114123456789',
        trade_type: 'JSAPI',
        success_time: '2024-01-14T12:00:00+08:00',
        amount: { total: 29900 },
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
          paymentRecord: {
            create: jest.fn().mockResolvedValue({}),
          },
          product: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await service.checkPaymentStatus(1, 1);

      expect(result.status).toBe('PAID');
      expect(result.transactionId).toBe('wx1234567890');
      expect(result.paidAmount).toBe('299.00');
    });

    it('should return error message when WeChat Pay API fails', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderWithItems),
      };
      mockWechatPayService.queryOrder.mockRejectedValue(new Error('WeChat API error'));

      const result = await service.checkPaymentStatus(1, 1);

      expect(result.status).toBe('PENDING');
      expect(result.message).toBe('无法获取支付状态，请稍后重试');
    });

    it('should throw BadRequestException when WeChat response lacks transaction_id', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderWithItems),
      };
      (mockPrismaService as any).product = { update: jest.fn() };
      mockWechatPayService.queryOrder.mockResolvedValue({
        trade_state: 'SUCCESS',
        transaction_id: '', // Empty transaction_id
        out_trade_no: 'ORD20240114123456789',
        trade_type: 'JSAPI',
        success_time: '2024-01-14T12:00:00+08:00',
        amount: { total: 29900 },
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          order: { update: jest.fn() },
          paymentRecord: { create: jest.fn() },
          product: { update: jest.fn() },
        });
      });

      await expect(service.checkPaymentStatus(1, 1)).rejects.toThrow(
        new BadRequestException('微信支付响应数据无效：缺少交易号'),
      );
    });

    it('should throw BadRequestException when WeChat response lacks success_time', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderWithItems),
      };
      mockWechatPayService.queryOrder.mockResolvedValue({
        trade_state: 'SUCCESS',
        transaction_id: 'wx1234567890',
        out_trade_no: 'ORD20240114123456789',
        trade_type: 'JSAPI',
        success_time: '', // Empty success_time
        amount: { total: 29900 },
      });

      await expect(service.checkPaymentStatus(1, 1)).rejects.toThrow(
        new BadRequestException('微信支付响应数据无效：缺少支付时间'),
      );
    });

    it('should throw BadRequestException when WeChat response has invalid amount', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderWithItems),
      };
      mockWechatPayService.queryOrder.mockResolvedValue({
        trade_state: 'SUCCESS',
        transaction_id: 'wx1234567890',
        out_trade_no: 'ORD20240114123456789',
        trade_type: 'JSAPI',
        success_time: '2024-01-14T12:00:00+08:00',
        amount: { total: -100 }, // Invalid amount
      });

      await expect(service.checkPaymentStatus(1, 1)).rejects.toThrow(
        new BadRequestException('微信支付响应数据无效：金额异常'),
      );
    });
  });

  describe('findAll', () => {
    const mockOrders = [
      {
        id: 1,
        orderNo: 'ORD20240114123456789',
        userId: 1,
        totalAmount: new Prisma.Decimal(299),
        status: OrderStatus.PAID,
        createdAt: new Date('2024-01-14T12:00:00Z'),
        items: [
          {
            productName: '上海科技馆探索之旅',
          },
        ],
      },
      {
        id: 2,
        orderNo: 'ORD20240113987654321',
        userId: 1,
        totalAmount: new Prisma.Decimal(199),
        status: OrderStatus.PENDING,
        createdAt: new Date('2024-01-13T10:30:00Z'),
        items: [
          {
            productName: '自然博物馆奇妙夜',
          },
        ],
      },
    ];

    it('should return paginated order list without filters', async () => {
      (mockPrismaService as any).order = {
        findMany: jest.fn().mockResolvedValue(mockOrders),
        count: jest.fn().mockResolvedValue(2),
      };

      const result = await service.findAll(1, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.data[0]).toHaveProperty('id', 1);
      expect(result.data[0]).toHaveProperty('orderNo', 'ORD20240114123456789');
      expect(result.data[0]).toHaveProperty('productName', '上海科技馆探索之旅');
    });

    it('should filter orders by status', async () => {
      (mockPrismaService as any).order = {
        findMany: jest.fn().mockResolvedValue([mockOrders[0]]),
        count: jest.fn().mockResolvedValue(1),
      };

      const result = await service.findAll(1, { page: 1, pageSize: 20, status: OrderStatus.PAID });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('PAID');
      expect((mockPrismaService as any).order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.PAID,
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      (mockPrismaService as any).order = {
        findMany: jest.fn().mockResolvedValue(mockOrders),
        count: jest.fn().mockResolvedValue(50),
      };

      const result = await service.findAll(1, { page: 2, pageSize: 10 });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect((mockPrismaService as any).order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should sort by createdAt desc by default', async () => {
      (mockPrismaService as any).order = {
        findMany: jest.fn().mockResolvedValue(mockOrders),
        count: jest.fn().mockResolvedValue(2),
      };

      await service.findAll(1, { page: 1, pageSize: 20 });

      expect((mockPrismaService as any).order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should sort by totalAmount asc when specified', async () => {
      (mockPrismaService as any).order = {
        findMany: jest.fn().mockResolvedValue(mockOrders),
        count: jest.fn().mockResolvedValue(2),
      };

      await service.findAll(1, { page: 1, pageSize: 20, sortBy: 'totalAmount', sortOrder: 'asc' });

      expect((mockPrismaService as any).order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { totalAmount: 'asc' },
        }),
      );
    });

    it('should handle empty order list', async () => {
      (mockPrismaService as any).order = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      };

      const result = await service.findAll(1, { page: 1, pageSize: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const mockOrderDetail = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      userId: 1,
      totalAmount: new Prisma.Decimal(299),
      actualAmount: new Prisma.Decimal(299),
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCESS,
      remark: '请提前预约',
      contactName: '张三',
      contactPhone: '13800138000',
      childName: '小明',
      childAge: 8,
      bookingDate: new Date('2024-02-15'),
      paidAt: new Date('2024-01-14T12:30:00Z'),
      createdAt: new Date('2024-01-14T12:00:00Z'),
      items: [
        {
          id: 1,
          productName: '上海科技馆探索之旅',
          productPrice: new Prisma.Decimal(299),
          quantity: 1,
          subtotal: new Prisma.Decimal(299),
        },
      ],
      payments: [
        {
          id: 1,
          transactionId: 'wx1234567890',
          channel: 'WECHAT_JSAPI',
          amount: new Prisma.Decimal(299),
          status: PaymentStatus.SUCCESS,
          createdAt: new Date('2024-01-14T12:30:00Z'),
        },
      ],
      refunds: [],
    };

    it('should return order detail with masked phone number', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(mockOrderDetail),
      };

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('orderNo', 'ORD20240114123456789');
      expect(result).toHaveProperty('contactPhone', '138****8000');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('payments');
      expect(result.items).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(service.findOne(1, 1)).rejects.toThrow(
        new NotFoundException('订单不存在'),
      );
    });

    it('should throw NotFoundException when order belongs to different user', async () => {
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(service.findOne(1, 2)).rejects.toThrow(
        new NotFoundException('订单不存在'),
      );
    });

    it('should include refund records when present', async () => {
      const orderWithRefund = {
        ...mockOrderDetail,
        refunds: [
          {
            id: 1,
            refundNo: 'REF20240114123456789',
            refundAmount: new Prisma.Decimal(299),
            reason: '家长原因退款',
            status: 'PENDING',
            createdAt: new Date('2024-01-14T14:00:00Z'),
          },
        ],
      };
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(orderWithRefund),
      };

      const result = await service.findOne(1, 1);

      expect(result.refunds).toHaveLength(1);
      expect(result.refunds[0]).toHaveProperty('refundNo', 'REF20240114123456789');
    });

    it('should mask phone number correctly', async () => {
      const orderWithShortPhone = { ...mockOrderDetail, contactPhone: '123' };
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(orderWithShortPhone),
      };

      const result = await service.findOne(1, 1);

      expect(result.contactPhone).toBe('123');
    });

    it('should handle null phone number', async () => {
      const orderWithNullPhone = { ...mockOrderDetail, contactPhone: null };
      (mockPrismaService as any).order = {
        findFirst: jest.fn().mockResolvedValue(orderWithNullPhone),
      };

      const result = await service.findOne(1, 1);

      expect(result.contactPhone).toBe('');
    });
  });
});
