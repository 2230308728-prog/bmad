import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../lib/prisma.service';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { ProductStatus } from '@prisma/client';
import { CacheService } from '../../redis/cache.service';
import { CacheKeyManagerService } from '../../cache/cache-key-manager.service';

// Mock Cache interface
interface MockCache {
  get: jest.Mock;
  set: jest.Mock;
}

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;
  let cacheManager: MockCache;
  let cacheService: CacheService;

  const mockCacheManager: MockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockCacheService = {
    del: jest.fn(),
  };

  const mockCacheKeyManagerService = {
    registerKey: jest.fn().mockResolvedValue(undefined),
    invalidateProductCache: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CacheKeyManagerService,
          useValue: mockCacheKeyManagerService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get(CACHE_MANAGER) as unknown as MockCache;
    cacheService = module.get<CacheService>(CacheService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockProducts = [
      {
        id: 1,
        title: '上海科技馆探索之旅',
        price: { toString: () => '299.00' },
        originalPrice: { toString: () => '399.00' },
        images: ['https://example.com/image.jpg'],
        location: '上海',
        duration: '1天',
        stock: 50,
        featured: true,
      },
      {
        id: 2,
        title: '北京博物馆研学',
        price: { toString: () => '399.00' },
        originalPrice: null,
        images: ['https://example.com/image2.jpg'],
        location: '北京',
        duration: '2天',
        stock: 30,
        featured: false,
      },
    ];

    const mockDto: GetProductsDto = {
      page: 1,
      pageSize: 20,
      categoryId: undefined,
      sortBy: 'created',
    };

    it('should return cached data when cache hit', async () => {
      const cachedResult = {
        data: mockProducts.map((p) => ({
          ...p,
          price: p.price.toString(),
          originalPrice: p.originalPrice?.toString(),
        })),
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findAll(mockDto);

      expect(result).toEqual(cachedResult);
      expect(cacheManager.get).toHaveBeenCalledWith('products:list:1:20:all:created');
      expect(mockPrismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should query database and cache result when cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.findAll(mockDto);

      expect(cacheManager.get).toHaveBeenCalledWith('products:list:1:20:all:created');
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        select: {
          id: true,
          title: true,
          price: true,
          originalPrice: true,
          images: true,
          location: true,
          duration: true,
          stock: true,
          featured: true,
        },
      });
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
      });
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by categoryId when provided', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(1);

      const dtoWithCategory: GetProductsDto = {
        ...mockDto,
        categoryId: 1,
      };

      await service.findAll(dtoWithCategory);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED', categoryId: 1 },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
      });
    });

    it('should sort by price_asc', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const dtoPriceAsc: GetProductsDto = {
        ...mockDto,
        sortBy: 'price_asc',
      };

      await service.findAll(dtoPriceAsc);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        orderBy: { price: 'asc' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
      });
    });

    it('should sort by price_desc', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const dtoPriceDesc: GetProductsDto = {
        ...mockDto,
        sortBy: 'price_desc',
      };

      await service.findAll(dtoPriceDesc);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        orderBy: { price: 'desc' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
      });
    });

    it('should sort by popular (bookingCount desc)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const dtoPopular: GetProductsDto = {
        ...mockDto,
        sortBy: 'popular',
      };

      await service.findAll(dtoPopular);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        orderBy: { bookingCount: 'desc' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
      });
    });

    it('should calculate skip correctly for pagination', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(100);

      const dtoPage2: GetProductsDto = {
        ...mockDto,
        page: 2,
        pageSize: 20,
      };

      await service.findAll(dtoPage2);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        skip: 20, // (2 - 1) * 20
        take: 20,
        select: expect.any(Object),
      });
    });

    it('should handle cache get failure gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.findAll(mockDto);

      expect(result.data).toHaveLength(2);
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
    });

    it('should handle cache set failure gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.findAll(mockDto);

      // Should still return result even if caching fails
      expect(result.data).toHaveLength(2);
    });
  });

  describe('clearProductsCache', () => {
    it('should clear all product cache via CacheKeyManager', async () => {
      await service.clearProductsCache();

      expect(mockCacheKeyManagerService.invalidateProductCache).toHaveBeenCalledWith();
    });

    it('should handle cache clear failure gracefully', async () => {
      mockCacheKeyManagerService.invalidateProductCache.mockRejectedValue(
        new Error('Cache clear failed')
      );

      // Should not throw
      await expect(service.clearProductsCache()).resolves.not.toThrow();
    });
  });

  describe('clearProductCache', () => {
    it('should clear specific product cache via CacheKeyManager', async () => {
      await service.clearProductCache(123);

      expect(mockCacheKeyManagerService.invalidateProductCache).toHaveBeenCalledWith(123);
    });

    it('should handle specific product cache clear failure gracefully', async () => {
      mockCacheKeyManagerService.invalidateProductCache.mockRejectedValue(
        new Error('Cache clear failed')
      );

      // Should not throw
      await expect(service.clearProductCache(123)).resolves.not.toThrow();
    });
  });

  describe('search', () => {
    const mockProducts = [
      {
        id: 1,
        title: '上海科技馆探索之旅',
        price: { toString: () => '299.00' },
        originalPrice: { toString: () => '399.00' },
        images: ['https://example.com/image.jpg'],
        location: '上海',
        duration: '1天',
        stock: 50,
        featured: true,
      },
      {
        id: 2,
        title: '北京博物馆研学',
        price: { toString: () => '399.00' },
        originalPrice: null,
        images: ['https://example.com/image2.jpg'],
        location: '北京',
        duration: '2天',
        stock: 30,
        featured: false,
      },
    ];

    const baseSearchDto = {
      keyword: '科技',
      page: 1,
      pageSize: 20,
    };

    it('should search products by keyword', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      // Only return the first product (which contains '科技' in title)
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search(baseSearchDto);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: '科技', mode: 'insensitive' } },
            { description: { contains: '科技', mode: 'insensitive' } },
            { location: { contains: '科技', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by price range', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        ...baseSearchDto,
        minPrice: 200,
        maxPrice: 300,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          price: { gte: 200, lte: 300 },
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by age range', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.search({
        ...baseSearchDto,
        minAge: 6,
        maxAge: 12,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          maxAge: { gte: 6 },
          minAge: { lte: 12 },
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by location', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        ...baseSearchDto,
        location: '上海',
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          location: { contains: '上海', mode: 'insensitive' },
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by categoryId', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        ...baseSearchDto,
        categoryId: 1,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          categoryId: 1,
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should combine multiple filters', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        keyword: '科技',
        categoryId: 1,
        minPrice: 200,
        maxPrice: 400,
        minAge: 6,
        maxAge: 12,
        location: '上海',
        page: 1,
        pageSize: 20,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          categoryId: 1,
          price: { gte: 200, lte: 400 },
          maxAge: { gte: 6 },
          minAge: { lte: 12 },
          location: { contains: '上海', mode: 'insensitive' },
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toHaveLength(1);
    });

    it('should cache search results', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      await service.search(baseSearchDto);

      expect(cacheManager.set).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('products:search:'),
        expect.any(Object),
        120, // TTL: 2分钟
      );
    });

    it('should return cached search results', async () => {
      const cachedResult = {
        data: mockProducts.map((p) => ({
          ...p,
          price: p.price.toString(),
          originalPrice: p.originalPrice?.toString(),
        })),
        meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.search(baseSearchDto);

      expect(result).toEqual(cachedResult);
      expect(mockPrismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should handle cache failure gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.search(baseSearchDto);

      expect(result.data).toHaveLength(2);
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no products match', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service.search({
        keyword: '不存在的产品名称',
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    // 参数验证测试
    it('should reject invalid price range (minPrice > maxPrice)', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await expect(
        service.search({
          keyword: '测试',
          minPrice: 500,
          maxPrice: 200,
          page: 1,
          pageSize: 20,
        }),
      ).rejects.toThrow('Invalid price range');
    });

    it('should reject invalid age range (minAge > maxAge)', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await expect(
        service.search({
          keyword: '测试',
          minAge: 15,
          maxAge: 10,
          page: 1,
          pageSize: 20,
        }),
      ).rejects.toThrow('Invalid age range');
    });

    it('should accept valid price range (minPrice === maxPrice)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        keyword: '测试',
        minPrice: 300,
        maxPrice: 300,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
    });

    it('should accept valid age range (minAge === maxAge)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        keyword: '测试',
        minAge: 10,
        maxAge: 10,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
    });

    it('should accept minPrice without maxPrice', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        keyword: '测试',
        minPrice: 200,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should accept maxPrice without minPrice', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        keyword: '测试',
        maxPrice: 500,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should accept minAge without maxAge', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        keyword: '测试',
        minAge: 6,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should accept maxAge without minAge', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.search({
        keyword: '测试',
        maxAge: 12,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    const mockProduct = {
      id: 1,
      title: '上海科技馆探索之旅',
      description: '<p>精彩探索之旅</p>',
      price: { toString: () => '299.00' },
      originalPrice: { toString: () => '399.00' },
      images: ['https://example.com/image.jpg'],
      location: '上海',
      duration: '1天',
      stock: 50,
      featured: true,
      minAge: 6,
      maxAge: 12,
      viewCount: 1234,
      bookingCount: 89,
      status: 'PUBLISHED',
      createdAt: new Date('2024-01-09T12:00:00Z'),
      category: {
        id: 1,
        name: '自然科学',
      },
    };

    it('should return product detail when found and published', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.findOne(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.title).toBe('上海科技馆探索之旅');
      expect(result?.price).toBe('299.00');
      expect(result?.category.id).toBe(1);
      expect(result?.category.name).toBe('自然科学');
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it('should return null when product not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should return null when product status is not PUBLISHED', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        status: 'DRAFT',
      });

      const result = await service.findOne(1);

      expect(result).toBeNull();
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should return cached product detail when cache hit', async () => {
      const cachedResult = {
        id: 1,
        title: '上海科技馆探索之旅',
        description: '<p>精彩探索之旅</p>',
        price: '299.00',
        originalPrice: '399.00',
        images: ['https://example.com/image.jpg'],
        location: '上海',
        duration: '1天',
        stock: 50,
        featured: true,
        minAge: 6,
        maxAge: 12,
        viewCount: 1234,
        bookingCount: 89,
        category: { id: 1, name: '自然科学' },
        createdAt: new Date('2024-01-09T12:00:00Z'),
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findOne(1);

      expect(result).toEqual(cachedResult);
      expect(cacheManager.get).toHaveBeenCalledWith('products:detail:1');
      expect(mockPrismaService.product.findUnique).not.toHaveBeenCalled();
    });

    it('should cache product detail after query', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({});

      await service.findOne(1);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'products:detail:1',
        expect.any(Object),
        600, // TTL: 10分钟
      );
    });

    it('should increment viewCount asynchronously', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({
        viewCount: 1235,
      });

      await service.findOne(1);

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    });

    it('should handle cache get failure gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.findOne(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalled();
    });

    it('should handle cache set failure gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.findOne(1);

      // Should still return result even if caching fails
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('should handle viewCount increment failure gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockRejectedValue(new Error('Database error'));

      const result = await service.findOne(1);

      // Should still return result even if viewCount increment fails
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('should convert Decimal fields to strings', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.findOne(1);

      expect(result?.price).toBe('299.00');
      expect(result?.originalPrice).toBe('399.00');
      expect(typeof result?.price).toBe('string');
      expect(typeof result?.originalPrice).toBe('string');
    });

    it('should handle product without originalPrice', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        originalPrice: null,
      });
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.findOne(1);

      expect(result?.originalPrice).toBeUndefined();
    });

    it('should handle product without age range', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        minAge: null,
        maxAge: null,
      });
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.findOne(1);

      expect(result?.minAge).toBeNull();
      expect(result?.maxAge).toBeNull();
    });
  });
});
