import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '@/auth/auth.service';
import { UsersService } from './users.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  const mockAuthService = {
    validateRefreshToken: jest.fn(),
    generateTokens: jest.fn(),
  };

  const mockUsersService = {
    isRefreshTokenBlacklisted: jest.fn(),
    validateRefreshToken: jest.fn(),
    findById: jest.fn(),
    addRefreshTokenToBlacklist: jest.fn(),
    saveRefreshToken: jest.fn(),
    deleteUserRefreshTokens: jest.fn(),
    addAccessTokenToBlacklist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    usersService = module.get(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('refresh', () => {
    const mockRefreshToken = 'valid_refresh_token';
    const mockAccessToken = 'new_access_token';
    const mockNewRefreshToken = 'new_refresh_token';

    const mockUser = {
      id: 1,
      email: 'admin@example.com',
      nickname: 'Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPayload = {
      sub: 1,
      type: 'refresh',
    };

    beforeEach(() => {
      mockAuthService.validateRefreshToken.mockResolvedValue(mockPayload);
      mockUsersService.isRefreshTokenBlacklisted.mockResolvedValue(false);
      mockUsersService.validateRefreshToken.mockResolvedValue(true);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockResolvedValue({
        accessToken: mockAccessToken,
        refreshToken: mockNewRefreshToken,
      });
    });

    it('should successfully refresh tokens', async () => {
      const refreshTokenDto = { refreshToken: mockRefreshToken };

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockNewRefreshToken,
      });

      expect(mockAuthService.validateRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(mockUsersService.isRefreshTokenBlacklisted).toHaveBeenCalledWith(mockRefreshToken);
      expect(mockUsersService.validateRefreshToken).toHaveBeenCalledWith(1, mockRefreshToken);
      expect(mockUsersService.findById).toHaveBeenCalledWith(1);
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(1, Role.ADMIN);
      expect(mockUsersService.addRefreshTokenToBlacklist).toHaveBeenCalledWith(mockRefreshToken, 604800);
      expect(mockUsersService.saveRefreshToken).toHaveBeenCalledWith(1, mockNewRefreshToken, 604800);
    });

    it('should throw UnauthorizedException if refresh token is blacklisted', async () => {
      mockUsersService.isRefreshTokenBlacklisted.mockResolvedValue(true);
      const refreshTokenDto = { refreshToken: mockRefreshToken };

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow('刷新令牌已失效');
    });

    it('should throw UnauthorizedException if refresh token session is invalid', async () => {
      mockUsersService.validateRefreshToken.mockResolvedValue(false);
      const refreshTokenDto = { refreshToken: mockRefreshToken };

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow('刷新令牌无效');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      const refreshTokenDto = { refreshToken: mockRefreshToken };

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow('用户不存在');
    });

    it('should throw ForbiddenException if user is disabled', async () => {
      const disabledUser = { ...mockUser, status: 'BANNED' as any };
      mockUsersService.findById.mockResolvedValue(disabledUser);
      const refreshTokenDto = { refreshToken: mockRefreshToken };

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(ForbiddenException);
      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow('用户账号已被禁用');
    });

    it('should throw UnauthorizedException on validation error', async () => {
      mockAuthService.validateRefreshToken.mockRejectedValue(new Error('Invalid token'));
      const refreshTokenDto = { refreshToken: mockRefreshToken };

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const mockUser = {
      id: 1,
      role: Role.ADMIN,
    };

    const mockRequest = {
      headers: {
        authorization: 'Bearer mock_access_token',
      },
    };

    it('should successfully logout user', async () => {
      await controller.logout(mockUser, mockRequest);

      expect(mockUsersService.addAccessTokenToBlacklist).toHaveBeenCalledWith('mock_access_token', 900);
      expect(mockUsersService.deleteUserRefreshTokens).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException if authorization header is missing', async () => {
      const requestWithoutAuth = {
        headers: {},
      };

      await expect(controller.logout(mockUser, requestWithoutAuth)).rejects.toThrow(UnauthorizedException);
      await expect(controller.logout(mockUser, requestWithoutAuth)).rejects.toThrow('缺少认证令牌');
    });

    it('should return success message', async () => {
      const result = await controller.logout(mockUser, mockRequest);

      expect(result).toEqual({
        message: '登出成功',
      });
    });
  });
});
