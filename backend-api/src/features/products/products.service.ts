import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../lib/prisma.service';
import { GetProductsDto } from './dto/get-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductListItemDto } from './dto/product-list-item.dto';
import { ProductStatus } from '@prisma/client';
import { CacheService } from '../../redis/cache.service';
import * as crypto from 'crypto';

/**
 * Products Service
 * 处理产品相关的业务逻辑
 */
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  // 追踪所有产品列表缓存键，用于批量清除
  private readonly productCacheKeys = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 查询产品列表（带缓存）
   * @param dto 查询参数
   * @returns 分页产品列表
   */
  async findAll(dto: GetProductsDto): Promise<{
    data: ProductListItemDto[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const { page = 1, pageSize = 20, categoryId, sortBy = 'created' } = dto;
    const skip = (page - 1) * pageSize;

    // 生成缓存键
    const cacheKey = `products:list:${page}:${pageSize}:${categoryId || 'all'}:${sortBy}`;

    try {
      // 尝试从缓存获取
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return cached as {
          data: ProductListItemDto[];
          meta: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
          };
        };
      }
    } catch (error) {
      // Redis 连接失败时降级到直接查询数据库
      this.logger.warn(`Cache get failed for key ${cacheKey}:`, error);
    }

    // 查询数据库
    const result = await this.queryFromDatabase(dto);

    // 尝试存入缓存（失败不影响返回结果）
    try {
      await this.cacheManager.set(cacheKey, result, 300); // TTL: 5分钟
      this.productCacheKeys.add(cacheKey); // 追踪缓存键
      this.logger.debug(`Cached result for key: ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Cache set failed for key ${cacheKey}:`, error);
    }

    return result;
  }

  /**
   * 从数据库查询产品列表
   * @param dto 查询参数
   * @returns 分页产品列表
   */
  private async queryFromDatabase(dto: GetProductsDto): Promise<{
    data: ProductListItemDto[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const { page = 1, pageSize = 20, categoryId, sortBy = 'created' } = dto;
    const skip = (page - 1) * pageSize;

    // 构建排序对象
    const orderBy = this.buildOrderBy(sortBy);

    // 构建 where 条件
    const where: {
      status: ProductStatus;
      categoryId?: number;
    } = {
      status: 'PUBLISHED',
      ...(categoryId && { categoryId }),
    };

    // 并行查询数据和总数
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
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
      }),
      this.prisma.product.count({ where }),
    ]);

    // 转换 Decimal 为字符串
    const data: ProductListItemDto[] = products.map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString(),
      images: product.images,
      location: product.location,
      duration: product.duration,
      stock: product.stock,
      featured: product.featured,
    }));

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 构建排序对象
   * @param sortBy 排序方式
   * @returns Prisma 排序对象
   */
  private buildOrderBy(sortBy: string): Record<string, 'asc' | 'desc'> {
    switch (sortBy) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'popular':
        return { bookingCount: 'desc' };
      case 'created':
      default:
        return { createdAt: 'desc' };
    }
  }

  /**
   * 搜索和筛选产品（带缓存）
   * @param dto 搜索和筛选参数
   * @returns 分页产品列表
   */
  async search(dto: SearchProductsDto): Promise<{
    data: ProductListItemDto[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    // 防御性验证（DTO 验证器是第一道防线，这里是第二道）
    this.validateSearchParams(dto);

    const { page = 1, pageSize = 20 } = dto;
    const skip = (page - 1) * pageSize;

    // 生成缓存键（使用参数哈希）
    const cacheKey = this.generateSearchCacheKey(dto);

    try {
      // 尝试从缓存获取
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for search key: ${cacheKey}`);
        return cached as {
          data: ProductListItemDto[];
          meta: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
          };
        };
      }
    } catch (error) {
      // Redis 连接失败时降级到直接查询数据库
      this.logger.warn(`Cache get failed for search key ${cacheKey}:`, error);
    }

    // 查询数据库
    const result = await this.searchFromDatabase(dto);

    // 尝试存入缓存（失败不影响返回结果）
    try {
      await this.cacheManager.set(cacheKey, result, 120); // TTL: 2分钟
      this.productCacheKeys.add(cacheKey); // 追踪缓存键
      this.logger.debug(`Cached search result for key: ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Cache set failed for search key ${cacheKey}:`, error);
    }

    return result;
  }

  /**
   * 验证搜索参数（防御性编程）
   * @param dto 搜索参数
   * @throws BadRequestException 如果参数无效
   */
  private validateSearchParams(dto: SearchProductsDto): void {
    const { minPrice, maxPrice, minAge, maxAge } = dto;

    // 验证价格范围
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      const error = new Error(`Invalid price range: minPrice (${minPrice}) cannot be greater than maxPrice (${maxPrice})`);
      this.logger.warn(error.message);
      throw error;
    }

    // 验证年龄范围
    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      const error = new Error(`Invalid age range: minAge (${minAge}) cannot be greater than maxAge (${maxAge})`);
      this.logger.warn(error.message);
      throw error;
    }
  }

  /**
   * 生成搜索缓存键
   * @param dto 搜索参数
   * @returns 缓存键
   */
  private generateSearchCacheKey(dto: SearchProductsDto): string {
    // 将参数序列化为字符串
    const params = JSON.stringify({
      keyword: dto.keyword,
      categoryId: dto.categoryId,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      minAge: dto.minAge,
      maxAge: dto.maxAge,
      location: dto.location,
      page: dto.page,
      pageSize: dto.pageSize,
    });

    // 生成哈希
    const hash = crypto.createHash('md5').update(params).digest('hex');

    return `products:search:${hash}`;
  }

  /**
   * 从数据库搜索和筛选产品
   * @param dto 搜索和筛选参数
   * @returns 分页产品列表
   */
  private async searchFromDatabase(dto: SearchProductsDto): Promise<{
    data: ProductListItemDto[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const {
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      minAge,
      maxAge,
      location,
      page = 1,
      pageSize = 20,
    } = dto;
    const skip = (page - 1) * pageSize;

    // 构建动态 where 子句
    const where: any = {
      status: 'PUBLISHED',
    };

    // 分类筛选
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 价格筛选
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // 年龄筛选（产品年龄范围与查询年龄范围有交集）
    if (minAge !== undefined || maxAge !== undefined) {
      if (minAge !== undefined) {
        // 产品的 maxAge >= 查询的 minAge
        where.maxAge = { gte: minAge };
      }
      if (maxAge !== undefined) {
        // 产品的 minAge <= 查询的 maxAge
        where.minAge = { lte: maxAge };
      }
    }

    // 地点筛选
    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    // 关键词全文搜索（使用 LIKE 作为备选方案）
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { location: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 并行查询数据和总数
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
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
        orderBy: { createdAt: 'desc' }, // 搜索结果按创建时间排序
      }),
      this.prisma.product.count({ where }),
    ]);

    // 转换 Decimal 为字符串
    const data: ProductListItemDto[] = products.map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString(),
      images: product.images,
      location: product.location,
      duration: product.duration,
      stock: product.stock,
      featured: product.featured,
    }));

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 清除产品列表缓存
   * 当产品更新时调用此方法
   */
  async clearProductsCache(): Promise<void> {
    try {
      // 使用 CacheService 删除所有追踪的产品缓存键
      const deletePromises = Array.from(this.productCacheKeys).map((key) =>
        this.cacheService.del(key),
      );
      await Promise.all(deletePromises);

      // 清空追踪集合
      this.productCacheKeys.clear();

      this.logger.log(
        `Successfully cleared ${deletePromises.length} product cache entries`,
      );
    } catch (error) {
      this.logger.warn('Failed to clear products cache:', error);
      // 即使失败也不影响业务流程
    }
  }
}
