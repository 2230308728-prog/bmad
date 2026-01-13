import { Test, TestingModule } from '@nestjs/testing';
import { UserSessionService } from './user-session.service';
import { CacheService } from '@/redis/cache.service';

describe('UserSessionService', () => {
  let service: UserSessionService;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSessionService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UserSessionService>(UserSessionService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveRefreshToken', () => {
    it('should save refresh token for user', async () => {
      await service.saveRefreshToken(1, 'refresh_token_123', 604800);

      expect(cacheService.set).toHaveBeenCalledWith(
        'user:refresh:1',
        'refresh_token_123',
        604800,
      );
    });

    it('should save refresh token with default TTL if not provided', async () => {
      await service.saveRefreshToken(2, 'refresh_token_456');

      expect(cacheService.set).toHaveBeenCalledWith(
        'user:refresh:2',
        'refresh_token_456',
        604800, // 7 days default
      );
    });
  });

  describe('getValidRefreshToken', () => {
    it('should return stored refresh token if exists', async () => {
      mockCacheService.get.mockResolvedValue('refresh_token_123');

      const result = await service.getValidRefreshToken(1);

      expect(result).toBe('refresh_token_123');
      expect(cacheService.get).toHaveBeenCalledWith('user:refresh:1');
    });

    it('should return null if no refresh token exists', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getValidRefreshToken(1);

      expect(result).toBeNull();
      expect(cacheService.get).toHaveBeenCalledWith('user:refresh:1');
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true if token matches stored token', async () => {
      mockCacheService.get.mockResolvedValue('refresh_token_123');

      const result = await service.validateRefreshToken(1, 'refresh_token_123');

      expect(result).toBe(true);
    });

    it('should return false if token does not match', async () => {
      mockCacheService.get.mockResolvedValue('refresh_token_123');

      const result = await service.validateRefreshToken(1, 'different_token');

      expect(result).toBe(false);
    });

    it('should return false if no stored token exists', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.validateRefreshToken(1, 'refresh_token_123');

      expect(result).toBe(false);
    });
  });

  describe('deleteUserRefreshTokens', () => {
    it('should delete user refresh token from cache', async () => {
      await service.deleteUserRefreshTokens(1);

      expect(cacheService.del).toHaveBeenCalledWith('user:refresh:1');
    });
  });
});
