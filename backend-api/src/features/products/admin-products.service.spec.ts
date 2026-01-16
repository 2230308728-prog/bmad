import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminProductsService } from './admin-products.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ProductsService } from './products.service';
import { OssService } from '../../oss/oss.service';
import { ProductStatus } from '@prisma/client';

describe('AdminProductsService', () => {
  let service: AdminProductsService;
  let prismaService: PrismaService;
  let productsService: ProductsService;

  const mockPrismaService = {
    productCategory: {
      findUnique: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockProductsService = {
    clearProductsCache: jest.fn().mockResolvedValue(undefined),
  };

  const mockOssService = {
    validateFileType: jest.fn(),
    generateSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: OssService,
          useValue: mockOssService,
        },
      ],
    }).compile();

    service = module.get<AdminProductsService>(AdminProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
    productsService = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductDto = {
      title: '上海科技馆探索之旅',
      description: '精彩的科技探索之旅',
      categoryId: 1,
      price: 299.0,
      stock: 50,
      location: '上海浦东新区',
      images: ['https://oss.example.com/products/1/image1.jpg'],
    };

    it('should successfully create a product', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      const mockProduct = {
        id: 1,
        ...createProductDto,
        originalPrice: null,
        minAge: null,
        maxAge: null,
        duration: null,
        featured: false,
        status: ProductStatus.DRAFT,
        viewCount: 0,
        bookingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
      };

      mockPrismaService.productCategory.findUnique.mockResolvedValue(
        mockCategory,
      );
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.title).toBe(createProductDto.title);
      expect(mockPrismaService.productCategory.findUnique).toHaveBeenCalledWith(
        {
          where: { id: createProductDto.categoryId },
        },
      );
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createProductDto.title,
          description: createProductDto.description,
          categoryId: createProductDto.categoryId,
          price: createProductDto.price,
          stock: createProductDto.stock,
          location: createProductDto.location,
          images: createProductDto.images,
          featured: false,
          status: ProductStatus.DRAFT,
          viewCount: 0,
          bookingCount: 0,
        }),
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
      expect(mockProductsService.clearProductsCache).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrismaService.productCategory.findUnique.mockResolvedValue(null);

      await expect(service.create(createProductDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createProductDto)).rejects.toThrow(
        '分类 ID 1 不存在',
      );
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if price <= 0', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(
        mockCategory,
      );

      const invalidDto = { ...createProductDto, price: 0 };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        '产品价格必须大于 0',
      );
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if stock < 0', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(
        mockCategory,
      );

      const invalidDto = { ...createProductDto, stock: -1 };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        '库存数量不能小于 0',
      );
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if maxAge < minAge', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(
        mockCategory,
      );

      const invalidDto = { ...createProductDto, minAge: 12, maxAge: 6 };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        '最大年龄不能小于最小年龄',
      );
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if originalPrice < price', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(
        mockCategory,
      );

      const invalidDto = {
        ...createProductDto,
        price: 399,
        originalPrice: 299,
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        '原价必须大于等于现价',
      );
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should convert Decimal to string', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      const mockProduct = {
        id: 1,
        ...createProductDto,
        price: { toString: () => '299.00' },
        originalPrice: { toString: () => '399.00' },
        minAge: null,
        maxAge: null,
        duration: null,
        featured: false,
        status: ProductStatus.DRAFT,
        viewCount: 0,
        bookingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
      };

      mockPrismaService.productCategory.findUnique.mockResolvedValue(
        mockCategory,
      );
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(result.price).toBe('299.00');
      expect(result.originalPrice).toBe('399.00');
    });
  });

  describe('update', () => {
    const updateProductDto = {
      title: '上海科技馆探索之旅（更新版）',
      price: 399.0,
    };

    const existingProduct = {
      id: 1,
      title: '上海科技馆探索之旅',
      description: '精彩的科技探索之旅',
      categoryId: 1,
      price: { toString: () => '299.00' },
      originalPrice: null,
      stock: 50,
      minAge: 6,
      maxAge: 12,
      duration: null,
      location: '上海浦东新区',
      images: [],
      featured: false,
      status: ProductStatus.DRAFT,
      viewCount: 0,
      bookingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully update a product', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      const updatedProduct = {
        ...existingProduct,
        ...updateProductDto,
        price: { toString: () => '399.00' },
        category: mockCategory,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.productCategory.findUnique.mockResolvedValue(
        mockCategory,
      );
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateProductDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateProductDto.title);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          title: updateProductDto.title,
          price: updateProductDto.price,
        }),
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
      expect(mockProductsService.clearProductsCache).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateProductDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateProductDto)).rejects.toThrow(
        '产品 ID 999 不存在',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if new category does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.productCategory.findUnique.mockResolvedValue(null);

      const updateWithCategory = { ...updateProductDto, categoryId: 999 };

      await expect(service.update(1, updateWithCategory)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, updateWithCategory)).rejects.toThrow(
        '分类 ID 999 不存在',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if price <= 0', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidPrice = { ...updateProductDto, price: 0 };

      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(
        '产品价格必须大于 0',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if stock < 0', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidStock = { stock: -1 };

      await expect(service.update(1, updateWithInvalidStock)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateWithInvalidStock)).rejects.toThrow(
        '库存数量不能小于 0',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if maxAge < minAge (from update)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidAge = { minAge: 15, maxAge: 10 };

      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow(
        '最大年龄不能小于最小年龄',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if maxAge < minAge (mixed with existing)', async () => {
      const productWithAge = { ...existingProduct, minAge: 10, maxAge: 15 };
      mockPrismaService.product.findUnique.mockResolvedValue(productWithAge);

      const updateWithInvalidAge = { maxAge: 5 }; // 5 < 10 (existing minAge)

      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow(
        '最大年龄不能小于最小年龄',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if originalPrice < price (in update)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidPrice = { price: 499, originalPrice: 399 }; // 399 < 499

      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(
        '原价必须大于等于现价',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if originalPrice < existing price', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidPrice = { originalPrice: 199 }; // 199 < existing 299

      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(
        '原价必须大于等于现价',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const existingProduct = {
      id: 1,
      title: '上海科技馆探索之旅',
      status: ProductStatus.DRAFT,
    };

    it('should successfully delete a product (soft delete)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.product.update.mockResolvedValue({
        ...existingProduct,
        status: ProductStatus.UNPUBLISHED,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 0 }]);

      await expect(service.remove(1)).resolves.not.toThrow();

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: ProductStatus.UNPUBLISHED,
        },
      });
      expect(mockProductsService.clearProductsCache).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow('产品 ID 999 不存在');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if product has orders', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 5 }]);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1)).rejects.toThrow(
        '该产品已有订单，无法删除',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should handle orders table not existing gracefully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('relation "orders" does not exist'),
      );
      mockPrismaService.product.update.mockResolvedValue({
        ...existingProduct,
        status: ProductStatus.UNPUBLISHED,
      });

      await expect(service.remove(1)).resolves.not.toThrow();

      expect(mockPrismaService.product.update).toHaveBeenCalled();
    });

    it('should re-throw non-table errors from orders check', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Connection timeout'),
      );

      await expect(service.remove(1)).rejects.toThrow('Connection timeout');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const existingProduct = {
      id: 1,
      title: '上海科技馆探索之旅',
      description: '精彩的科技探索之旅',
      categoryId: 1,
      price: { toString: () => '299.00' },
      originalPrice: null,
      stock: 50,
      minAge: 6,
      maxAge: 12,
      duration: null,
      location: '上海浦东新区',
      images: [],
      featured: false,
      status: ProductStatus.DRAFT,
      viewCount: 0,
      bookingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: 1, name: '自然科学' },
    };

    it('should successfully update status from DRAFT to PUBLISHED', async () => {
      const updateStatusDto = { status: ProductStatus.PUBLISHED };
      const updatedProduct = {
        ...existingProduct,
        status: ProductStatus.PUBLISHED,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.updateStatus(1, updateStatusDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(ProductStatus.PUBLISHED);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: ProductStatus.PUBLISHED },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
      expect(mockProductsService.clearProductsCache).toHaveBeenCalled();
    });

    it('should successfully update status from PUBLISHED to UNPUBLISHED', async () => {
      const publishedProduct = {
        ...existingProduct,
        status: ProductStatus.PUBLISHED,
      };
      const updateStatusDto = { status: ProductStatus.UNPUBLISHED };
      const updatedProduct = {
        ...publishedProduct,
        status: ProductStatus.UNPUBLISHED,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(publishedProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.updateStatus(1, updateStatusDto);

      expect(result.status).toBe(ProductStatus.UNPUBLISHED);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const updateStatusDto = { status: ProductStatus.PUBLISHED };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(999, updateStatusDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateStatus(999, updateStatusDto)).rejects.toThrow(
        '产品 ID 999 不存在',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid status transition (PUBLISHED to DRAFT)', async () => {
      const publishedProduct = {
        ...existingProduct,
        status: ProductStatus.PUBLISHED,
      };
      const updateStatusDto = { status: ProductStatus.DRAFT };

      mockPrismaService.product.findUnique.mockResolvedValue(publishedProduct);

      await expect(service.updateStatus(1, updateStatusDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateStatus(1, updateStatusDto)).rejects.toThrow(
        '不允许从已发布状态直接变为草稿状态',
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should allow status transition from DRAFT to UNPUBLISHED', async () => {
      const updateStatusDto = { status: ProductStatus.UNPUBLISHED };
      const updatedProduct = {
        ...existingProduct,
        status: ProductStatus.UNPUBLISHED,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.updateStatus(1, updateStatusDto);

      expect(result.status).toBe(ProductStatus.UNPUBLISHED);
    });

    it('should allow status transition from UNPUBLISHED to PUBLISHED', async () => {
      const unpublishedProduct = {
        ...existingProduct,
        status: ProductStatus.UNPUBLISHED,
      };
      const updateStatusDto = { status: ProductStatus.PUBLISHED };
      const updatedProduct = {
        ...unpublishedProduct,
        status: ProductStatus.PUBLISHED,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(
        unpublishedProduct,
      );
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.updateStatus(1, updateStatusDto);

      expect(result.status).toBe(ProductStatus.PUBLISHED);
    });
  });

  describe('updateStock', () => {
    const existingProduct = {
      id: 1,
      title: '上海科技馆探索之旅',
      description: '精彩的科技探索之旅',
      categoryId: 1,
      price: { toFixed: () => '299.00', toString: () => '299.00' },
      originalPrice: null,
      stock: 50,
      minAge: 6,
      maxAge: 12,
      duration: null,
      location: '上海浦东新区',
      images: [],
      featured: false,
      status: ProductStatus.PUBLISHED,
      viewCount: 0,
      bookingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: 1, name: '自然科学' },
    };

    it('should successfully update stock and create history record', async () => {
      const updateStockDto = { stock: 30, reason: '销售出库' };
      const updatedProduct = {
        ...existingProduct,
        stock: 30,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$transaction.mockImplementation((callback) => {
        return callback({
          product: {
            update: jest.fn().mockResolvedValue(updatedProduct),
          },
          productStockHistory: {
            create: jest.fn().mockResolvedValue({
              id: 1,
              productId: 1,
              oldStock: 50,
              newStock: 30,
              reason: '销售出库',
              createdAt: new Date(),
            }),
          },
        });
      });

      const result = await service.updateStock(1, updateStockDto);

      expect(result).toBeDefined();
      expect(result.stock).toBe(30);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockProductsService.clearProductsCache).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const updateStockDto = { stock: 30 };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.updateStock(999, updateStockDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateStock(999, updateStockDto)).rejects.toThrow(
        '产品 ID 999 不存在',
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if stock < 0', async () => {
      const updateStockDto = { stock: -1 };
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      await expect(service.updateStock(1, updateStockDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateStock(1, updateStockDto)).rejects.toThrow(
        '库存数量不能小于 0',
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should log warning when stock < 10', async () => {
      const updateStockDto = { stock: 5, reason: '低库存测试' };
      const updatedProduct = {
        ...existingProduct,
        stock: 5,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$transaction.mockImplementation((callback) => {
        return callback({
          product: {
            update: jest.fn().mockResolvedValue(updatedProduct),
          },
          productStockHistory: {
            create: jest.fn().mockResolvedValue({
              id: 1,
              productId: 1,
              oldStock: 50,
              newStock: 5,
              reason: '低库存测试',
              createdAt: new Date(),
            }),
          },
        });
      });

      const result = await service.updateStock(1, updateStockDto);

      expect(result.stock).toBe(5);
      expect(result.lowStock).toBe(true);
    });

    it('should handle missing reason field', async () => {
      const updateStockDto = { stock: 25 };
      const updatedProduct = {
        ...existingProduct,
        stock: 25,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$transaction.mockImplementation((callback) => {
        return callback({
          product: {
            update: jest.fn().mockResolvedValue(updatedProduct),
          },
          productStockHistory: {
            create: jest.fn().mockResolvedValue({
              id: 1,
              productId: 1,
              oldStock: 50,
              newStock: 25,
              reason: null,
              createdAt: new Date(),
            }),
          },
        });
      });

      const result = await service.updateStock(1, updateStockDto);

      expect(result.stock).toBe(25);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with stock < 10 ordered by stock ASC', async () => {
      const mockProducts = [
        {
          id: 1,
          title: '产品A',
          stock: 2,
          categoryId: 1,
          category: { id: 1, name: '自然科学' },
        },
        {
          id: 2,
          title: '产品B',
          stock: 5,
          categoryId: 2,
          category: { id: 2, name: '历史文化' },
        },
        {
          id: 3,
          title: '产品C',
          stock: 8,
          categoryId: 1,
          category: { id: 1, name: '自然科学' },
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getLowStockProducts();

      expect(result).toHaveLength(3);
      expect(result[0].stock).toBe(2);
      expect(result[1].stock).toBe(5);
      expect(result[2].stock).toBe(8);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          stock: { lt: 10 },
        },
        orderBy: {
          stock: 'asc',
        },
        select: {
          id: true,
          title: true,
          stock: true,
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it('should return empty array when no low stock products exist', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getLowStockProducts();

      expect(result).toEqual([]);
    });

    it('should only include products with stock < 10', async () => {
      const mockProducts = [
        {
          id: 1,
          title: '产品A',
          stock: 5,
          categoryId: 1,
          category: { id: 1, name: '自然科学' },
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getLowStockProducts();

      expect(result).toHaveLength(1);
      expect(result[0].stock).toBeLessThan(10);
    });
  });

  describe('generateUploadUrl', () => {
    it('should successfully generate upload URL for valid image file', () => {
      const fileName = 'example.jpg';
      const signedUrl =
        'https://bucket.oss-cn-shanghai.aliyuncs.com/products/2024/01/14/uuid.jpg?signature=...';

      mockOssService.validateFileType.mockReturnValue(true);
      mockOssService.generateSignedUrl.mockReturnValue(signedUrl);

      const result = service.generateUploadUrl(fileName);

      expect(result).toBeDefined();
      expect(result.uploadUrl).toBe(signedUrl);
      expect(result.fileName).toBe(fileName);
      expect(result.fileKey).toContain('products/');
      expect(result.fileKey).toContain('.jpg');
      expect(mockOssService.validateFileType).toHaveBeenCalledWith(fileName);
      expect(mockOssService.generateSignedUrl).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid file type', () => {
      const fileName = 'document.pdf';

      mockOssService.validateFileType.mockReturnValue(false);

      expect(() => service.generateUploadUrl(fileName)).toThrow(
        BadRequestException,
      );
      expect(() => service.generateUploadUrl(fileName)).toThrow(
        '文件类型必须是以下之一: jpg, jpeg, png, webp',
      );
      expect(mockOssService.generateSignedUrl).not.toHaveBeenCalled();
    });

    it('should generate unique file key with date path and UUID', () => {
      const fileName = 'test.png';
      const signedUrl =
        'https://bucket.oss-cn-shanghai.aliyuncs.com/test.png?signature=...';

      mockOssService.validateFileType.mockReturnValue(true);
      mockOssService.generateSignedUrl.mockReturnValue(signedUrl);

      const result = service.generateUploadUrl(fileName);

      expect(result.fileKey).toMatch(/^products\/\d{4}\/\d{2}\/\d{2}\//);
      expect(result.fileKey).toContain('.png');
    });

    it('should throw BadRequestException for file without extension', () => {
      const fileName = 'noextension';

      mockOssService.validateFileType.mockReturnValue(true);

      expect(() => service.generateUploadUrl(fileName)).toThrow(
        BadRequestException,
      );
      expect(() => service.generateUploadUrl(fileName)).toThrow(
        '文件名必须包含有效的扩展名（如 .jpg, .png）',
      );
      expect(mockOssService.generateSignedUrl).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for file with trailing dot only', () => {
      const fileName = 'filename.';

      mockOssService.validateFileType.mockReturnValue(true);

      expect(() => service.generateUploadUrl(fileName)).toThrow(
        BadRequestException,
      );
      expect(() => service.generateUploadUrl(fileName)).toThrow(
        '文件名必须包含有效的扩展名（如 .jpg, .png）',
      );
      expect(mockOssService.generateSignedUrl).not.toHaveBeenCalled();
    });
  });
});
