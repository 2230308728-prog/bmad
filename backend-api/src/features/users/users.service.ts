import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { UserSessionService } from './user-session.service';
import * as bcrypt from 'bcrypt';
import { Role, UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly userSessionService: UserSessionService,
  ) {}

  /**
   * 创建管理员用户
   * @param email 管理员邮箱
   * @param password 明文密码
   * @param nickname 昵称
   * @returns 创建的用户（不包含密码）
   * @throws ConflictException 如果邮箱已存在
   */
  async createAdmin(email: string, password: string, nickname: string) {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码（salt rounds: 10）
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员用户
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    // 返回用户信息（移除密码）
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 验证管理员登录
   * @param email 邮箱
   * @param password 明文密码
   * @returns 验证通过的用户信息（不包含密码）
   * @throws UnauthorizedException 如果邮箱或密码错误
   * @throws ForbiddenException 如果账号被禁用
   */
  async validateAdmin(email: string, password: string) {
    // 查找管理员用户
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        role: Role.ADMIN,
      },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    if (!user.password) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('账号已被禁用');
    }

    // 返回用户信息（移除密码）
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 根据 ID 查找用户
   * @param id 用户ID
   * @returns 用户信息（不包含密码）
   * @throws NotFoundException 如果用户不存在
   */
  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 查找或创建家长用户（微信登录）
   * @param openid 微信 openid
   * @param nickname 昵称
   * @param avatarUrl 头像 URL
   * @returns 用户信息（不包含 openid）
   */
  async findOrCreateParent(
    openid: string,
    nickname?: string,
    avatarUrl?: string,
  ) {
    // 查找现有用户
    const existingUser = await this.prisma.user.findUnique({
      where: { openid },
    });

    if (existingUser) {
      // 验证用户角色，如果不是 PARENT 则更新
      if (existingUser.role !== Role.PARENT) {
        const updatedUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: Role.PARENT,
            ...(nickname && { nickname }),
            ...(avatarUrl && { avatarUrl }),
          },
        });

        const { openid: _, ...userWithoutOpenid } = updatedUser;
        return userWithoutOpenid;
      }

      // 用户已存在且角色正确，更新昵称和头像
      const updatedUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          ...(nickname && { nickname }),
          ...(avatarUrl && { avatarUrl }),
        },
      });

      const { openid: _, ...userWithoutOpenid } = updatedUser;
      return userWithoutOpenid;
    }

    // 创建新用户
    const newUser = await this.prisma.user.create({
      data: {
        openid,
        nickname: nickname || '微信用户',
        avatarUrl,
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
      },
    });

    const { openid: _, ...userWithoutOpenid } = newUser;
    return userWithoutOpenid;
  }

  /**
   * 更新家长资料
   * @param userId 用户ID
   * @param nickname 昵称
   * @param avatarUrl 头像 URL
   * @returns 更新后的用户信息
   */
  async updateParentProfile(
    userId: number,
    nickname?: string,
    avatarUrl?: string,
  ) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(nickname && { nickname }),
        ...(avatarUrl && { avatarUrl }),
      },
    });

    const { password: _, openid: __, ...userWithoutSensitive } = updatedUser;
    return userWithoutSensitive;
  }

  /**
   * 检查刷新令牌是否在黑名单中
   * @param refreshToken 刷新令牌
   * @returns 如果在黑名单中返回 true
   */
  async isRefreshTokenBlacklisted(refreshToken: string): Promise<boolean> {
    return this.tokenBlacklistService.isRefreshBlacklisted(refreshToken);
  }

  /**
   * 验证刷新令牌是否匹配用户当前会话
   * @param userId 用户ID
   * @param refreshToken 刷新令牌
   * @returns 如果令牌匹配返回 true
   */
  async validateRefreshToken(userId: number, refreshToken: string): Promise<boolean> {
    return this.userSessionService.validateRefreshToken(userId, refreshToken);
  }

  /**
   * 将刷新令牌加入黑名单
   * @param refreshToken 刷新令牌
   * @param ttl 过期时间（秒）
   */
  async addRefreshTokenToBlacklist(refreshToken: string, ttl: number): Promise<void> {
    await this.tokenBlacklistService.addToRefreshBlacklist(refreshToken, ttl);
  }

  /**
   * 保存用户刷新令牌
   * @param userId 用户ID
   * @param refreshToken 刷新令牌
   * @param ttl 过期时间（秒）
   */
  async saveRefreshToken(userId: number, refreshToken: string, ttl: number): Promise<void> {
    await this.userSessionService.saveRefreshToken(userId, refreshToken, ttl);
  }

  /**
   * 删除用户的所有刷新令牌
   * @param userId 用户ID
   */
  async deleteUserRefreshTokens(userId: number): Promise<void> {
    await this.userSessionService.deleteUserRefreshTokens(userId);
  }

  /**
   * 将访问令牌加入黑名单
   * @param accessToken 访问令牌
   * @param ttl 过期时间（秒）
   */
  async addAccessTokenToBlacklist(accessToken: string, ttl: number): Promise<void> {
    await this.tokenBlacklistService.addToAccessBlacklist(accessToken, ttl);
  }
}
