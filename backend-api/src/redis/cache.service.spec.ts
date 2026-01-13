import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: Partial<jest.Mocked<Cache>>;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Mock checkRedisConnection to avoid actual calls during tests
    jest
      .spyOn(service as any, 'checkRedisConnection')
      .mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should check Redis connection on module init', async () => {
      const checkConnectionSpy = jest.spyOn(
        service as any,
        'checkRedisConnection',
      );

      await service.onModuleInit();

      expect(checkConnectionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const mockValue = { data: 'test' };
      (cacheManager.get as jest.Mock).mockResolvedValue(mockValue);

      const result = await service.get('test-key');

      expect(result).toEqual(mockValue);
      expect(cacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when cache miss', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null on error (graceful degradation)', async () => {
      (cacheManager.get as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle undefined as null', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set cache with default TTL', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.set('test-key', { data: 'test' });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        undefined,
      );
    });

    it('should set cache with randomized TTL', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.set('test-key', { data: 'test' }, 300);

      expect(cacheManager.set).toHaveBeenCalled();
      const callArgs = (cacheManager.set as jest.Mock).mock.calls[0] as [
        string,
        unknown,
        number,
      ];
      expect(callArgs[0]).toBe('test-key');
      expect(callArgs[1]).toEqual({ data: 'test' });
      // TTL should be within ±10% of 300 (270-330)
      expect(callArgs[2]).toBeGreaterThanOrEqual(270);
      expect(callArgs[2]).toBeLessThanOrEqual(330);
    });

    it('should not throw on error (graceful degradation)', async () => {
      (cacheManager.set as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      await expect(
        service.set('test-key', { data: 'test' }),
      ).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete cache', async () => {
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      await service.del('test-key');

      expect(cacheManager.del).toHaveBeenCalledWith('test-key');
    });

    it('should not throw on error (graceful degradation)', async () => {
      (cacheManager.del as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      await expect(service.del('test-key')).resolves.not.toThrow();
    });
  });

  describe('getRandomizedTtl', () => {
    it('should return zero for zero input', () => {
      const result = (
        service as unknown as { getRandomizedTtl: (n: number) => number }
      ).getRandomizedTtl(0);
      expect(result).toBe(0);
    });

    it('should return same value for negative input', () => {
      const result = (
        service as unknown as { getRandomizedTtl: (n: number) => number }
      ).getRandomizedTtl(-100);
      expect(result).toBe(-100);
    });

    it('should return value within ±10% range', () => {
      const baseTtl = 300;
      const results = new Set<number>();

      // Run multiple times to get different random values
      for (let i = 0; i < 100; i++) {
        const result = (
          service as unknown as { getRandomizedTtl: (n: number) => number }
        ).getRandomizedTtl(baseTtl);
        results.add(result);
        expect(result).toBeGreaterThanOrEqual(270); // 300 - 10%
        expect(result).toBeLessThanOrEqual(330); // 300 + 10%
      }

      // Verify we got different values (randomization working)
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('getHealthStatus', () => {
    it('should return available status', () => {
      const status = service.getHealthStatus();
      expect(status).toHaveProperty('available');
      expect(typeof status.available).toBe('boolean');
    });
  });

  describe('checkHealth', () => {
    it('should return available with response time when Redis is working', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (cacheManager.get as jest.Mock).mockResolvedValue('ping');
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      const result = await service.checkHealth();

      expect(result.available).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.responseTime).toBe('number');
    });

    it('should return unavailable when Redis fails', async () => {
      (cacheManager.set as jest.Mock).mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.checkHealth();

      expect(result.available).toBe(false);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should update redisAvailable status after successful health check', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (cacheManager.get as jest.Mock).mockResolvedValue('ping');
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      // First set to false
      (service as unknown as { redisAvailable: boolean }).redisAvailable =
        false;

      await service.checkHealth();

      expect(service.getHealthStatus().available).toBe(true);
    });
  });
});
