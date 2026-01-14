import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, ProductStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockCacheService = {
    getStock: jest.fn(),
    setStock: jest.fn(),
    decrby: jest.fn(),
    incrby: jest.fn(),
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
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

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
});
