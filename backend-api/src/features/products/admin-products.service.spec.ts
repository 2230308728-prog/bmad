import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminProductsService } from './admin-products.service';
import { PrismaService } from '../../lib/prisma.service';
import { ProductsService } from './products.service';
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
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockProductsService = {
    clearProductsCache: jest.fn().mockResolvedValue(undefined),
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
      price: 299.00,
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

      mockPrismaService.productCategory.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.title).toBe(createProductDto.title);
      expect(mockPrismaService.productCategory.findUnique).toHaveBeenCalledWith({
        where: { id: createProductDto.categoryId },
      });
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

      await expect(service.create(createProductDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createProductDto)).rejects.toThrow('分类 ID 1 不存在');
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if price <= 0', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(mockCategory);

      const invalidDto = { ...createProductDto, price: 0 };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow('产品价格必须大于 0');
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if stock < 0', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(mockCategory);

      const invalidDto = { ...createProductDto, stock: -1 };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow('库存数量不能小于 0');
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if maxAge < minAge', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(mockCategory);

      const invalidDto = { ...createProductDto, minAge: 12, maxAge: 6 };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow('最大年龄不能小于最小年龄');
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if originalPrice < price', async () => {
      const mockCategory = { id: 1, name: '自然科学' };
      mockPrismaService.productCategory.findUnique.mockResolvedValue(mockCategory);

      const invalidDto = { ...createProductDto, price: 399, originalPrice: 299 };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto)).rejects.toThrow('原价必须大于等于现价');
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

      mockPrismaService.productCategory.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(result.price).toBe('299.00');
      expect(result.originalPrice).toBe('399.00');
    });
  });

  describe('update', () => {
    const updateProductDto = {
      title: '上海科技馆探索之旅（更新版）',
      price: 399.00,
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
      mockPrismaService.productCategory.findUnique.mockResolvedValue(mockCategory);
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

      await expect(service.update(999, updateProductDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(999, updateProductDto)).rejects.toThrow('产品 ID 999 不存在');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if new category does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.productCategory.findUnique.mockResolvedValue(null);

      const updateWithCategory = { ...updateProductDto, categoryId: 999 };

      await expect(service.update(1, updateWithCategory)).rejects.toThrow(NotFoundException);
      await expect(service.update(1, updateWithCategory)).rejects.toThrow('分类 ID 999 不存在');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if price <= 0', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidPrice = { ...updateProductDto, price: 0 };

      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow('产品价格必须大于 0');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if stock < 0', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidStock = { stock: -1 };

      await expect(service.update(1, updateWithInvalidStock)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithInvalidStock)).rejects.toThrow('库存数量不能小于 0');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if maxAge < minAge (from update)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidAge = { minAge: 15, maxAge: 10 };

      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow('最大年龄不能小于最小年龄');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if maxAge < minAge (mixed with existing)', async () => {
      const productWithAge = { ...existingProduct, minAge: 10, maxAge: 15 };
      mockPrismaService.product.findUnique.mockResolvedValue(productWithAge);

      const updateWithInvalidAge = { maxAge: 5 }; // 5 < 10 (existing minAge)

      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithInvalidAge)).rejects.toThrow('最大年龄不能小于最小年龄');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if originalPrice < price (in update)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidPrice = { price: 499, originalPrice: 399 }; // 399 < 499

      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow('原价必须大于等于现价');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if originalPrice < existing price', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);

      const updateWithInvalidPrice = { originalPrice: 199 }; // 199 < existing 299

      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateWithInvalidPrice)).rejects.toThrow('原价必须大于等于现价');
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
      await expect(service.remove(1)).rejects.toThrow('该产品已有订单，无法删除');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should handle orders table not existing gracefully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('relation "orders" does not exist'));
      mockPrismaService.product.update.mockResolvedValue({
        ...existingProduct,
        status: ProductStatus.UNPUBLISHED,
      });

      await expect(service.remove(1)).resolves.not.toThrow();

      expect(mockPrismaService.product.update).toHaveBeenCalled();
    });

    it('should re-throw non-table errors from orders check', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(existingProduct);
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection timeout'));

      await expect(service.remove(1)).rejects.toThrow('Connection timeout');
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });
  });
});
