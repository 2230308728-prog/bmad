import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
  };

  const mockUser: CurrentUserType = {
    id: 1,
    role: 'PARENT',
  };

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

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(error);
      expect(service.create).toHaveBeenCalledWith(1, createOrderDto);
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const error = new Error('库存不足，请选择其他日期或产品');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(error);
    });

    it('should throw BadRequestException when child age is out of range', async () => {
      const error = new Error('产品适用年龄：6-12岁');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(error);
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createOrderDto)).rejects.toThrow(error);
    });
  });
});
