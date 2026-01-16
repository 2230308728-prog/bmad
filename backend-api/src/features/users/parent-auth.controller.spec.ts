import { Test, TestingModule } from '@nestjs/testing';
import { ParentAuthController } from './parent-auth.controller';
import { WechatService } from './wechat.service';
import { UsersService } from './users.service';
import { AuthService } from '@/auth/auth.service';
import { CurrentUserType } from '@/common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';

describe('ParentAuthController', () => {
  let controller: ParentAuthController;
  let wechatService: WechatService;
  let usersService: UsersService;
  let authService: AuthService;

  const mockWechatService = {
    jscode2session: jest.fn(),
  };

  const mockUsersService = {
    findOrCreateParent: jest.fn(),
    findById: jest.fn(),
    saveRefreshToken: jest.fn(),
  };

  const mockAuthService = {
    generateTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentAuthController],
      providers: [
        {
          provide: WechatService,
          useValue: mockWechatService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<ParentAuthController>(ParentAuthController);
    wechatService = module.get<WechatService>(WechatService);
    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('wechatLogin', () => {
    it('should login successfully with new user', async () => {
      // Arrange
      const loginDto = {
        code: 'valid_wechat_code',
        userInfo: {
          nickname: '测试用户',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      const mockOpenid = 'test_openid_123';
      const mockUser = {
        id: 1,
        nickname: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: Role.PARENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      };

      mockWechatService.jscode2session.mockResolvedValue(mockOpenid);
      mockUsersService.findOrCreateParent.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await controller.wechatLogin(loginDto);

      // Assert
      expect(result).toEqual({
        data: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          user: {
            id: 1,
            nickname: '测试用户',
            avatarUrl: 'https://example.com/avatar.jpg',
            role: Role.PARENT,
          },
        },
      });
      expect(mockWechatService.jscode2session).toHaveBeenCalledWith(
        'valid_wechat_code',
      );
      expect(mockUsersService.findOrCreateParent).toHaveBeenCalledWith(
        mockOpenid,
        '测试用户',
        'https://example.com/avatar.jpg',
      );
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(
        1,
        Role.PARENT,
      );
    });

    it('should login successfully with existing user', async () => {
      // Arrange
      const loginDto = {
        code: 'valid_wechat_code',
        userInfo: {
          nickname: '更新昵称',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
      };

      const mockOpenid = 'existing_openid_456';
      const mockUser = {
        id: 2,
        nickname: '更新昵称',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        role: Role.PARENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      };

      mockWechatService.jscode2session.mockResolvedValue(mockOpenid);
      mockUsersService.findOrCreateParent.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await controller.wechatLogin(loginDto);

      // Assert
      expect(result).toEqual({
        data: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          user: {
            id: 2,
            nickname: '更新昵称',
            avatarUrl: 'https://example.com/new-avatar.jpg',
            role: Role.PARENT,
          },
        },
      });
    });

    it('should login successfully without userInfo', async () => {
      // Arrange
      const loginDto = {
        code: 'valid_wechat_code',
      };

      const mockOpenid = 'test_openid_789';
      const mockUser = {
        id: 3,
        nickname: '微信用户',
        avatarUrl: null,
        role: Role.PARENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      };

      mockWechatService.jscode2session.mockResolvedValue(mockOpenid);
      mockUsersService.findOrCreateParent.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await controller.wechatLogin(loginDto);

      // Assert
      expect(result).toEqual({
        data: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          user: {
            id: 3,
            nickname: '微信用户',
            avatarUrl: null,
            role: Role.PARENT,
          },
        },
      });
      expect(mockUsersService.findOrCreateParent).toHaveBeenCalledWith(
        mockOpenid,
        undefined,
        undefined,
      );
    });

    it('should throw UnauthorizedException when WeChat API fails', async () => {
      // Arrange
      const loginDto = {
        code: 'invalid_code',
        userInfo: {
          nickname: '测试用户',
        },
      };

      mockWechatService.jscode2session.mockRejectedValue(
        new UnauthorizedException('微信授权失败，请重试'),
      );

      // Act & Assert
      await expect(controller.wechatLogin(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.wechatLogin(loginDto)).rejects.toThrow(
        '微信授权失败，请重试',
      );
      expect(mockUsersService.findOrCreateParent).not.toHaveBeenCalled();
      expect(mockAuthService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile when called with valid parent user', async () => {
      // Arrange
      const mockUser: CurrentUserType = {
        id: 1,
        role: Role.PARENT,
      };

      const expectedProfile = {
        id: 1,
        nickname: '测试家长',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: Role.PARENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findById.mockResolvedValue(expectedProfile);

      // Act
      const result = await controller.getProfile(mockUser);

      // Assert
      expect(result).toEqual(expectedProfile);
      expect(mockUsersService.findById).toHaveBeenCalledWith(1);
    });

    it('should propagate error when user not found', async () => {
      // Arrange
      const mockUser: CurrentUserType = {
        id: 999,
        role: Role.PARENT,
      };

      const notFoundError = new Error('User not found');
      mockUsersService.findById.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(controller.getProfile(mockUser)).rejects.toThrow(
        'User not found',
      );
      expect(mockUsersService.findById).toHaveBeenCalledWith(999);
    });
  });
});
