import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenBlacklistService } from '@/features/users/token-blacklist.service';
import { Role } from '@prisma/client';
import type {
  JwtPayload,
  RefreshTokenPayload,
} from '../dto/jwt-payload.interface';

// Mock passport and its dependencies
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: jest.fn().mockImplementation(() => class MockStrategy {}),
}));

jest.mock('passport-jwt', () => ({
  Strategy: jest.fn().mockImplementation(() => ({
    name: 'jwt',
  })),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn(),
  },
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let tokenBlacklistService: TokenBlacklistService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockTokenBlacklistService = {
    isAccessBlacklisted: jest.fn(),
  };

  beforeEach(() => {
    mockConfigService.get.mockReturnValue('test-secret-key');
    mockTokenBlacklistService.isAccessBlacklisted.mockResolvedValue(false);

    // Create strategy directly
    configService = mockConfigService as any;
    tokenBlacklistService = mockTokenBlacklistService as any;
    strategy = new JwtStrategy(configService, tokenBlacklistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => {
        new JwtStrategy(configService, tokenBlacklistService);
      }).toThrow('JWT_SECRET environment variable is required');
    });
  });

  describe('validate', () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer test_token',
      },
    };

    const validPayload: JwtPayload = {
      sub: 1,
      role: Role.ADMIN,
      type: 'access',
    };

    it('should return user info for valid access token', async () => {
      const result = await strategy.validate(mockRequest, validPayload);

      expect(result).toEqual({
        id: 1,
        role: Role.ADMIN,
      });
      expect(tokenBlacklistService.isAccessBlacklisted).toHaveBeenCalledWith(
        'test_token',
      );
    });

    it('should throw UnauthorizedException for non-access token type', async () => {
      const invalidPayload: RefreshTokenPayload = {
        sub: 1,
        type: 'refresh',
      };

      await expect(
        strategy.validate(mockRequest, invalidPayload),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(mockRequest, invalidPayload),
      ).rejects.toThrow('无效的令牌类型');
    });

    it('should throw UnauthorizedException for refresh token type', async () => {
      const refreshPayload: RefreshTokenPayload = {
        sub: 2,
        type: 'refresh',
      };

      await expect(
        strategy.validate(mockRequest, refreshPayload),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(mockRequest, refreshPayload),
      ).rejects.toThrow('无效的令牌类型');
    });

    it('should throw UnauthorizedException if token is blacklisted', async () => {
      mockTokenBlacklistService.isAccessBlacklisted.mockResolvedValue(true);

      await expect(
        strategy.validate(mockRequest, validPayload),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(mockRequest, validPayload),
      ).rejects.toThrow('令牌已失效');
    });

    it('should throw UnauthorizedException if authorization header is missing', async () => {
      const requestWithoutAuth = {
        headers: {},
      };

      await expect(
        strategy.validate(requestWithoutAuth, validPayload),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(requestWithoutAuth, validPayload),
      ).rejects.toThrow('缺少认证令牌');
    });

    it('should extract token from authorization header correctly', async () => {
      const requestWithToken = {
        headers: {
          authorization: 'Bearer my_custom_token_123',
        },
      };

      const result = await strategy.validate(requestWithToken, validPayload);

      expect(result).toEqual({ id: 1, role: Role.ADMIN });
      expect(tokenBlacklistService.isAccessBlacklisted).toHaveBeenCalledWith(
        'my_custom_token_123',
      );
    });
  });
});
