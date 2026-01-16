import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { UserSessionService } from './user-session.service';

// Mock bcrypt at the top level
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTokenBlacklistService = {
    isAccessBlacklisted: jest.fn(),
    isRefreshBlacklisted: jest.fn(),
    addToAccessBlacklist: jest.fn(),
    addToRefreshBlacklist: jest.fn(),
  };

  const mockUserSessionService = {
    saveRefreshToken: jest.fn(),
    getValidRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    deleteUserRefreshTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: UserSessionService,
          useValue: mockUserSessionService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAdmin', () => {
    it('should create admin user successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        nickname: '管理员',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await service.createAdmin(
        'admin@example.com',
        'Password123',
        '管理员',
      );

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('admin@example.com');
      expect(result.role).toBe(Role.ADMIN);
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@example.com',
          password: 'hashedPassword',
          nickname: '管理员',
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
    });

    it('should throw ConflictException if email exists', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
      } as any);

      // Act & Assert
      await expect(
        service.createAdmin('admin@example.com', 'Password123', '管理员'),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createAdmin('admin@example.com', 'Password123', '管理员'),
      ).rejects.toThrow('该邮箱已被注册');
    });

    it('should hash password with salt rounds 10', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        nickname: '管理员',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // Act
      await service.createAdmin('admin@example.com', 'Password123', '管理员');

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
    });
  });

  describe('validateAdmin', () => {
    it('should validate admin successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateAdmin(
        'admin@example.com',
        'Password123',
      );

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('admin@example.com');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.validateAdmin('admin@example.com', 'Password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateAdmin('admin@example.com', 'Password123'),
      ).rejects.toThrow('邮箱或密码错误');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: Role.ADMIN,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.validateAdmin('admin@example.com', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateAdmin('admin@example.com', 'WrongPassword'),
      ).rejects.toThrow('邮箱或密码错误');
    });

    it('should throw ForbiddenException if user is banned', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: Role.ADMIN,
        status: UserStatus.BANNED,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.validateAdmin('admin@example.com', 'Password123'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.validateAdmin('admin@example.com', 'Password123'),
      ).rejects.toThrow('账号已被禁用');
    });

    it('should throw ForbiddenException if user is inactive', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: Role.ADMIN,
        status: UserStatus.INACTIVE,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.validateAdmin('admin@example.com', 'Password123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        nickname: '管理员',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(1);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('用户不存在');
    });
  });

  describe('findOrCreateParent', () => {
    it('should create new parent user if openid does not exist', async () => {
      // Arrange
      const mockNewUser = {
        id: 2,
        openid: 'new_openid_123',
        nickname: '新用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockNewUser);

      // Act
      const result = await service.findOrCreateParent(
        'new_openid_123',
        '新用户',
        'https://example.com/avatar.jpg',
      );

      // Assert
      expect(result).not.toHaveProperty('openid');
      expect(result.id).toBe(2);
      expect(result.nickname).toBe('新用户');
      expect(result.role).toBe(Role.PARENT);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { openid: 'new_openid_123' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          openid: 'new_openid_123',
          nickname: '新用户',
          avatarUrl: 'https://example.com/avatar.jpg',
          role: Role.PARENT,
          status: UserStatus.ACTIVE,
        },
      });
    });

    it('should update existing user and return user without openid', async () => {
      // Arrange
      const mockExistingUser = {
        id: 3,
        openid: 'existing_openid_456',
        nickname: '旧昵称',
        avatarUrl: 'https://example.com/old-avatar.jpg',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedUser = {
        id: 3,
        openid: 'existing_openid_456',
        nickname: '新昵称',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockExistingUser);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await service.findOrCreateParent(
        'existing_openid_456',
        '新昵称',
        'https://example.com/new-avatar.jpg',
      );

      // Assert
      expect(result).not.toHaveProperty('openid');
      expect(result.id).toBe(3);
      expect(result.nickname).toBe('新昵称');
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: {
          nickname: '新昵称',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
      });
    });

    it('should create user with default nickname if not provided', async () => {
      // Arrange
      const mockNewUser = {
        id: 4,
        openid: 'new_openid_789',
        nickname: '微信用户',
        avatarUrl: null,
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockNewUser);

      // Act
      const result = await service.findOrCreateParent('new_openid_789');

      // Assert
      expect(result.nickname).toBe('微信用户');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          openid: 'new_openid_789',
          nickname: '微信用户',
          avatarUrl: undefined,
          role: Role.PARENT,
          status: UserStatus.ACTIVE,
        },
      });
    });

    it('should update role to PARENT if existing user has different role', async () => {
      // Arrange
      const mockAdminUser = {
        id: 5,
        openid: 'admin_openid_123',
        nickname: '管理员',
        avatarUrl: 'https://example.com/admin.jpg',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedParentUser = {
        id: 5,
        openid: 'admin_openid_123',
        nickname: '更新昵称',
        avatarUrl: 'https://example.com/new.jpg',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedParentUser);

      // Act
      const result = await service.findOrCreateParent(
        'admin_openid_123',
        '更新昵称',
        'https://example.com/new.jpg',
      );

      // Assert
      expect(result.role).toBe(Role.PARENT);
      expect(result.nickname).toBe('更新昵称');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          role: Role.PARENT,
          nickname: '更新昵称',
          avatarUrl: 'https://example.com/new.jpg',
        },
      });
    });
  });

  describe('updateParentProfile', () => {
    it('should update parent profile successfully', async () => {
      // Arrange
      const mockUpdatedUser = {
        id: 5,
        email: null,
        password: null,
        openid: 'openid_123',
        nickname: '更新昵称',
        avatarUrl: 'https://example.com/updated-avatar.jpg',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await service.updateParentProfile(
        5,
        '更新昵称',
        'https://example.com/updated-avatar.jpg',
      );

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('openid');
      expect(result.nickname).toBe('更新昵称');
      expect(result.avatarUrl).toBe('https://example.com/updated-avatar.jpg');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          nickname: '更新昵称',
          avatarUrl: 'https://example.com/updated-avatar.jpg',
        },
      });
    });

    it('should update only nickname if avatarUrl not provided', async () => {
      // Arrange
      const mockUpdatedUser = {
        id: 6,
        email: null,
        password: null,
        openid: 'openid_456',
        nickname: '仅更新昵称',
        avatarUrl: null,
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await service.updateParentProfile(6, '仅更新昵称');

      // Assert
      expect(result.nickname).toBe('仅更新昵称');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 6 },
        data: {
          nickname: '仅更新昵称',
        },
      });
    });

    it('should update only avatarUrl if nickname not provided', async () => {
      // Arrange
      const mockUpdatedUser = {
        id: 7,
        email: null,
        password: null,
        openid: 'openid_789',
        nickname: null,
        avatarUrl: 'https://example.com/new-avatar.jpg',
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await service.updateParentProfile(
        7,
        undefined,
        'https://example.com/new-avatar.jpg',
      );

      // Assert
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: {
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
      });
    });
  });
});
