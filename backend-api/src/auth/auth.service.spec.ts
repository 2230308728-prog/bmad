import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtPayload, RefreshTokenPayload } from './dto/jwt-payload.interface';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens successfully', async () => {
      // Arrange
      const userId = 1;
      const role = Role.PARENT;
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_TOKEN_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_TOKEN_EXPIRATION') return '7d';
        return undefined;
      });

      mockJwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      // Act
      const result = await service.generateTokens(userId, role);

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });

      // Verify sign was called with correct payloads
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: userId, role: Role.PARENT, type: 'access' },
        { expiresIn: '15m' },
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: userId, type: 'refresh' },
        { expiresIn: '7d' },
      );
    });

    it('should generate tokens for ADMIN role', async () => {
      // Arrange
      const userId = 2;
      const role = Role.ADMIN;

      mockConfigService.get.mockReturnValue('15m');
      mockJwtService.sign.mockReturnValue('token');

      // Act
      await service.generateTokens(userId, role);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: userId, role: Role.ADMIN, type: 'access' },
        { expiresIn: '15m' },
      );
    });

    it('should use default expiration times when env vars are not set', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      mockJwtService.sign.mockReturnValue('token');

      // Act
      await service.generateTokens(1, Role.PARENT);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 1, role: Role.PARENT, type: 'access' },
        { expiresIn: '15m' },
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 1, type: 'refresh' },
        { expiresIn: '7d' },
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should validate a valid access token', async () => {
      // Arrange
      const validPayload: JwtPayload = {
        sub: 1,
        role: Role.PARENT,
        type: 'access',
      };
      mockJwtService.verifyAsync.mockResolvedValue(validPayload);

      // Act
      const result = await service.validateAccessToken('valid_token');

      // Assert
      expect(result).toEqual(validPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_token');
    });

    it('should throw UnauthorizedException for refresh token used as access token', async () => {
      // Arrange
      const refreshPayload: RefreshTokenPayload = {
        sub: 1,
        type: 'refresh',
      };
      mockJwtService.verifyAsync.mockResolvedValue(refreshPayload);

      // Act & Assert
      await expect(
        service.validateAccessToken('refresh_token'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateAccessToken('refresh_token'),
      ).rejects.toThrow('Invalid token type');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(
        service.validateAccessToken('invalid_token'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateAccessToken('invalid_token'),
      ).rejects.toThrow('Invalid access token');
    });

    it('should throw UnauthorizedException for expired token', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      // Act & Assert
      await expect(
        service.validateAccessToken('expired_token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate a valid refresh token', async () => {
      // Arrange
      const validPayload: RefreshTokenPayload = {
        sub: 1,
        type: 'refresh',
      };
      mockJwtService.verifyAsync.mockResolvedValue(validPayload);

      // Act
      const result = await service.validateRefreshToken('valid_refresh_token');

      // Assert
      expect(result).toEqual(validPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid_refresh_token',
      );
    });

    it('should throw UnauthorizedException for access token used as refresh token', async () => {
      // Arrange
      const accessPayload: JwtPayload = {
        sub: 1,
        role: Role.ADMIN,
        type: 'access',
      };
      mockJwtService.verifyAsync.mockResolvedValue(accessPayload);

      // Act & Assert
      await expect(
        service.validateRefreshToken('access_token'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateRefreshToken('access_token'),
      ).rejects.toThrow('Invalid token type');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid'));

      // Act & Assert
      await expect(
        service.validateRefreshToken('invalid_token'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateRefreshToken('invalid_token'),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('extractUserIdFromToken', () => {
    it('should extract user ID from token', () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 123,
        role: Role.PARENT,
        type: 'access',
      };
      mockJwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.extractUserIdFromToken('some_token');

      // Assert
      expect(result).toBe(123);
      expect(mockJwtService.decode).toHaveBeenCalledWith('some_token');
    });

    it('should extract user ID from ADMIN token', () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 456,
        role: Role.ADMIN,
        type: 'access',
      };
      mockJwtService.decode.mockReturnValue(payload);

      // Act
      const result = service.extractUserIdFromToken('admin_token');

      // Assert
      expect(result).toBe(456);
    });

    it('should throw error for invalid token', () => {
      // Arrange
      mockJwtService.decode.mockReturnValue(null);

      // Act & Assert
      expect(() => service.extractUserIdFromToken('invalid_token')).toThrow(
        'Invalid token: unable to extract user ID',
      );
    });

    it('should throw error when payload.sub is not a number', () => {
      // Arrange
      const invalidPayload = { sub: 'not_a_number', type: 'access' } as any;
      mockJwtService.decode.mockReturnValue(invalidPayload);

      // Act & Assert
      expect(() => service.extractUserIdFromToken('malformed_token')).toThrow(
        'Invalid token: unable to extract user ID',
      );
    });
  });
});
