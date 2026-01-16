import { Test, TestingModule } from '@nestjs/testing';
import { Logger, HttpException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { Response } from 'express';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    checkPaymentQueryRateLimit: jest.fn(),
    checkPaymentStatus: jest.fn(),
  };

  const mockUser: CurrentUserType = {
    id: 1,
    role: 'PARENT',
  };

  // Mock Response object for @Res({ passthrough: true }) decorator
  const mockResponse = {
    setHeader: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
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

    const mockOrderResponse = {
      id: 1,
      orderNo: 'ORD20240114123456789',
      status: OrderStatus.PENDING,
      totalAmount: '598.00',
      product: {
        id: 1,
        title: '上海科技馆探索之旅',
        images: ['https://example.com/image.jpg'],
      },
      bookingDate: '2024-02-15',
      createdAt: new Date('2024-01-14T12:00:00Z'),
    };

    it('should create an order successfully', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrderResponse);

      const result = await controller.create(mockUser, createOrderDto);

      expect(result).toEqual({ data: mockOrderResponse });
      expect(service.create).toHaveBeenCalledWith(1, createOrderDto);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      const error = new Error('产品不存在或已下架');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(
        error,
      );
      expect(service.create).toHaveBeenCalledWith(1, createOrderDto);
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const error = new Error('库存不足，请选择其他日期或产品');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(
        error,
      );
    });

    it('should throw BadRequestException when child age is out of range', async () => {
      const error = new Error('产品适用年龄：6-12岁');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(
        error,
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getPaymentStatus', () => {
    const mockPaymentSuccessResponse = {
      orderId: 1,
      orderNo: 'ORD20240114123456789',
      status: OrderStatus.PAID,
      paidAt: '2024-01-14T12:30:00Z',
      paidAmount: '299.00',
      transactionId: 'wx1234567890',
    };

    const mockPaymentPendingResponse = {
      status: OrderStatus.PENDING,
      message: '支付处理中，请稍后查询',
    };

    it('should return payment success status', async () => {
      mockOrdersService.checkPaymentQueryRateLimit.mockResolvedValue(false);
      mockOrdersService.checkPaymentStatus.mockResolvedValue(
        mockPaymentSuccessResponse,
      );

      const result = await controller.getPaymentStatus(
        mockUser,
        '1',
        mockResponse,
      );

      expect(result).toEqual({ data: mockPaymentSuccessResponse });
      expect(mockOrdersService.checkPaymentQueryRateLimit).toHaveBeenCalledWith(
        1,
      );
      expect(mockOrdersService.checkPaymentStatus).toHaveBeenCalledWith(1, 1);
    });

    it('should return payment pending status', async () => {
      mockOrdersService.checkPaymentQueryRateLimit.mockResolvedValue(false);
      mockOrdersService.checkPaymentStatus.mockResolvedValue(
        mockPaymentPendingResponse,
      );

      const result = await controller.getPaymentStatus(
        mockUser,
        '1',
        mockResponse,
      );

      expect(result).toEqual({ data: mockPaymentPendingResponse });
    });

    it('should throw HttpException when rate limit exceeded', async () => {
      mockOrdersService.checkPaymentQueryRateLimit.mockResolvedValue(true);

      await expect(
        controller.getPaymentStatus(mockUser, '1', mockResponse),
      ).rejects.toThrow(new HttpException('查询频率超限，请稍后重试', 429));
      expect(mockOrdersService.checkPaymentStatus).not.toHaveBeenCalled();
      // Verify Retry-After header was set
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    });

    it('should throw HttpException for invalid order ID', async () => {
      await expect(
        controller.getPaymentStatus(mockUser, 'invalid', mockResponse),
      ).rejects.toThrow(new HttpException('Invalid order ID', 400));
    });

    it('should propagate service errors', async () => {
      mockOrdersService.checkPaymentQueryRateLimit.mockResolvedValue(false);
      const error = new Error('Order not found');
      mockOrdersService.checkPaymentStatus.mockRejectedValue(error);

      await expect(
        controller.getPaymentStatus(mockUser, '1', mockResponse),
      ).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    const mockOrderListResponse = {
      data: [
        {
          id: 1,
          orderNo: 'ORD20240114123456789',
          status: OrderStatus.PAID,
          totalAmount: '299.00',
          productName: '上海科技馆探索之旅',
          createdAt: '2024-01-14T12:00:00Z',
        },
        {
          id: 2,
          orderNo: 'ORD20240113987654321',
          status: OrderStatus.PENDING,
          totalAmount: '199.00',
          productName: '自然博物馆奇妙夜',
          createdAt: '2024-01-13T10:30:00Z',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    };

    it('should return paginated order list', async () => {
      mockOrdersService.findAll.mockResolvedValue(mockOrderListResponse);

      const result = await controller.findAll(mockUser, {});

      expect(result).toEqual(mockOrderListResponse);
      expect(mockOrdersService.findAll).toHaveBeenCalledWith(1, {});
    });

    it('should pass query parameters to service', async () => {
      mockOrdersService.findAll.mockResolvedValue(mockOrderListResponse);

      const queryDto = {
        page: 2,
        pageSize: 10,
        status: OrderStatus.PAID,
        sortBy: 'totalAmount' as const,
        sortOrder: 'asc' as const,
      };

      await controller.findAll(mockUser, queryDto);

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(1, queryDto);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      mockOrdersService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(mockUser, {})).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    const mockOrderDetailResponse = {
      data: {
        id: 1,
        orderNo: 'ORD20240114123456789',
        status: OrderStatus.PAID,
        totalAmount: '299.00',
        actualAmount: '299.00',
        remark: '请提前预约',
        contactName: '张三',
        contactPhone: '138****8000',
        childName: '小明',
        childAge: 8,
        bookingDate: '2024-02-15',
        paidAt: '2024-01-14T12:30:00Z',
        createdAt: '2024-01-14T12:00:00Z',
        items: [
          {
            id: 1,
            productName: '上海科技馆探索之旅',
            productPrice: '299.00',
            quantity: 1,
            subtotal: '299.00',
          },
        ],
        payments: [
          {
            id: 1,
            transactionId: 'wx1234567890',
            channel: 'WECHAT_JSAPI',
            amount: '299.00',
            status: 'SUCCESS',
            createdAt: '2024-01-14T12:30:00Z',
          },
        ],
        refunds: [],
      },
    };

    it('should return order detail with masked phone', async () => {
      mockOrdersService.findOne.mockResolvedValue(mockOrderDetailResponse.data);

      const result = await controller.findOne(mockUser, '1');

      expect(result).toEqual(mockOrderDetailResponse);
      expect(mockOrdersService.findOne).toHaveBeenCalledWith(1, 1);
    });

    it('should throw HttpException for invalid order ID', async () => {
      await expect(controller.findOne(mockUser, 'invalid')).rejects.toThrow(
        new HttpException('Invalid order ID', 400),
      );
      expect(mockOrdersService.findOne).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new Error('订单不存在');
      mockOrdersService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(mockUser, '1')).rejects.toThrow(error);
    });

    it('should propagate ForbiddenException from service', async () => {
      const error = new Error('无权访问此订单');
      mockOrdersService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(mockUser, '1')).rejects.toThrow(error);
    });

    it('should include refund records when present', async () => {
      const responseWithRefunds = {
        ...mockOrderDetailResponse,
        data: {
          ...mockOrderDetailResponse.data,
          refunds: [
            {
              id: 1,
              refundNo: 'REF20240114123456789',
              refundAmount: '299.00',
              reason: '家长原因退款',
              status: 'PENDING',
              createdAt: '2024-01-14T14:00:00Z',
            },
          ],
        },
      };
      mockOrdersService.findOne.mockResolvedValue(responseWithRefunds.data);

      const result = await controller.findOne(mockUser, '1');

      expect(result.data.refunds).toHaveLength(1);
    });
  });
});
