import { Test, TestingModule } from '@nestjs/testing';
import {
  CacheKeyManagerService,
  CacheKeyPattern,
} from './cache-key-manager.service';
import { CacheService } from '../redis/cache.service';

describe('CacheKeyManagerService', () => {
  let service: CacheKeyManagerService;
  let cacheService: jest.Mocked<CacheService>;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheKeyManagerService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<CacheKeyManagerService>(CacheKeyManagerService);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerKey', () => {
    it('should register key with single tag', async () => {
      mockCacheService.get.mockResolvedValue([]);
      await service.registerKey('products:detail:123', ['product:123']);

      expect(cacheService.get).toHaveBeenCalledWith('cache:tags:product:123');
      expect(cacheService.set).toHaveBeenCalledWith(
        'cache:tags:product:123',
        ['products:detail:123'],
        7 * 24 * 60 * 60,
      );
    });

    it('should register key with multiple tags', async () => {
      mockCacheService.get.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.registerKey('products:detail:123', [
        'product:123',
        'products:detail',
      ]);

      expect(cacheService.set).toHaveBeenCalledTimes(2);
    });

    it('should not duplicate existing keys in tag', async () => {
      mockCacheService.get.mockResolvedValue(['products:detail:123']);

      await service.registerKey('products:detail:123', ['product:123']);

      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should skip registration if key is empty', async () => {
      await service.registerKey('', ['product:123']);

      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should skip registration if tags are empty', async () => {
      await service.registerKey('products:detail:123', []);

      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      await expect(
        service.registerKey('products:detail:123', ['product:123']),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate all keys for a tag', async () => {
      mockCacheService.get.mockResolvedValue([
        'products:detail:123',
        'products:detail:456',
      ]);

      const count = await service.invalidateByTag('product:123');

      expect(count).toBe(2);
      expect(cacheService.del).toHaveBeenCalledWith('products:detail:123');
      expect(cacheService.del).toHaveBeenCalledWith('products:detail:456');
      expect(cacheService.del).toHaveBeenCalledWith('cache:tags:product:123');
    });

    it('should return 0 for tag with no keys', async () => {
      mockCacheService.get.mockResolvedValue([]);

      const count = await service.invalidateByTag('product:123');

      expect(count).toBe(0);
      expect(cacheService.del).not.toHaveBeenCalledWith('products:detail:123');
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis error'));

      const count = await service.invalidateByTag('product:123');

      expect(count).toBe(0);
    });
  });

  describe('invalidateByPattern', () => {
    it('should invalidate all tags for a pattern', async () => {
      mockCacheService.get
        .mockResolvedValueOnce(['products:list:abc'])
        .mockResolvedValueOnce(['products:search:def'])
        .mockResolvedValueOnce(['products:category:1']);

      const count = await service.invalidateByPattern('products:*', [
        CacheKeyPattern.PRODUCTS_LIST,
        CacheKeyPattern.PRODUCTS_SEARCH,
        CacheKeyPattern.PRODUCTS_CATEGORY,
      ]);

      expect(count).toBe(3);
      expect(cacheService.del).toHaveBeenCalledTimes(6); // 3 keys + 3 tag sets
    });

    it('should handle empty tags array', async () => {
      const count = await service.invalidateByPattern('products:*', []);

      expect(count).toBe(0);
    });
  });

  describe('invalidateProductCache', () => {
    it('should invalidate specific product cache', async () => {
      mockCacheService.get.mockResolvedValue(['products:detail:123']);

      await service.invalidateProductCache(123);

      expect(cacheService.del).toHaveBeenCalledWith('products:detail:123');
      expect(cacheService.del).toHaveBeenCalledWith('cache:tags:product:123');
    });

    it('should invalidate all product cache when no id provided', async () => {
      mockCacheService.get
        .mockResolvedValueOnce(['products:list:abc'])
        .mockResolvedValueOnce(['products:search:def'])
        .mockResolvedValueOnce(['products:category:1']);

      await service.invalidateProductCache();

      expect(cacheService.del).toHaveBeenCalled();
    });
  });

  describe('extractTagsFromKey', () => {
    it('should extract tags from product detail key', () => {
      const tags = service.extractTagsFromKey('products:detail:123');

      expect(tags).toEqual(['product:123', 'products:detail']);
    });

    it('should extract tags from product list key', () => {
      const tags = service.extractTagsFromKey('products:list:abc123def');

      expect(tags).toContain('products:list');
    });

    it('should extract tags from product search key', () => {
      const tags = service.extractTagsFromKey('products:search:xyz789');

      expect(tags).toContain('products:search');
    });

    it('should extract tags from category key', () => {
      const tags = service.extractTagsFromKey('products:category:5');

      expect(tags).toEqual(['category:5', 'products:category']);
    });

    it('should return empty array for unknown key pattern', () => {
      const tags = service.extractTagsFromKey('unknown:key:value');

      expect(tags).toEqual([]);
    });
  });

  describe('cleanupTag', () => {
    it('should remove expired keys from tag', async () => {
      // First call gets the tag's keys
      // Subsequent calls check if each product key still exists
      mockCacheService.get
        .mockResolvedValueOnce(['products:detail:123', 'products:detail:456']) // tag keys
        .mockResolvedValueOnce(null) // products:detail:123 expired
        .mockResolvedValueOnce({ id: 456 }); // products:detail:456 exists

      const cleaned = await service.cleanupTag('product:123');

      expect(cacheService.set).toHaveBeenCalledWith(
        'cache:tags:product:123',
        ['products:detail:456'],
        7 * 24 * 60 * 60,
      );
    });

    it('should return 0 for tag with no keys', async () => {
      mockCacheService.get.mockResolvedValue([]);

      const cleaned = await service.cleanupTag('product:123');

      expect(cleaned).toBe(0);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis error'));

      const cleaned = await service.cleanupTag('product:123');

      expect(cleaned).toBe(0);
    });
  });

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      mockCacheService.get.mockResolvedValue([
        'products:detail:123',
        'products:detail:456',
      ]);

      const stats = await service.getTagStats('product:123');

      expect(stats.count).toBe(2);
      expect(stats.keys).toEqual([
        'products:detail:123',
        'products:detail:456',
      ]);
    });

    it('should return empty stats for non-existent tag', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const stats = await service.getTagStats('product:999');

      expect(stats.count).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });
});
