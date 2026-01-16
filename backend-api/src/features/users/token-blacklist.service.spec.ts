import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';
import { CacheService } from '@/redis/cache.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToAccessBlacklist', () => {
    it('should add access token to blacklist with TTL', async () => {
      await service.addToAccessBlacklist('access_token_123', 900);

      expect(cacheService.set).toHaveBeenCalledWith(
        'blacklist:access:access_token_123',
        '1',
        900,
      );
    });
  });

  describe('addToRefreshBlacklist', () => {
    it('should add refresh token to blacklist with TTL', async () => {
      await service.addToRefreshBlacklist('refresh_token_456', 604800);

      expect(cacheService.set).toHaveBeenCalledWith(
        'blacklist:refresh:refresh_token_456',
        '1',
        604800,
      );
    });
  });

  describe('isAccessBlacklisted', () => {
    it('should return true if access token is blacklisted', async () => {
      mockCacheService.get.mockResolvedValue('1');

      const result = await service.isAccessBlacklisted('access_token_123');

      expect(result).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith(
        'blacklist:access:access_token_123',
      );
    });

    it('should return false if access token is not blacklisted', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.isAccessBlacklisted('access_token_123');

      expect(result).toBe(false);
    });
  });

  describe('isRefreshBlacklisted', () => {
    it('should return true if refresh token is blacklisted', async () => {
      mockCacheService.get.mockResolvedValue('1');

      const result = await service.isRefreshBlacklisted('refresh_token_456');

      expect(result).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith(
        'blacklist:refresh:refresh_token_456',
      );
    });

    it('should return false if refresh token is not blacklisted', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.isRefreshBlacklisted('refresh_token_456');

      expect(result).toBe(false);
    });
  });
});
