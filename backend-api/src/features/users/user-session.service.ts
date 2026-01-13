import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@/redis/cache.service';

/**
 * 用户会话服务
 *
 * 负责管理用户刷新令牌的存储和验证
 */
@Injectable()
export class UserSessionService {
  private readonly logger = new Logger(UserSessionService.name);
  private readonly DEFAULT_REFRESH_TTL = 604800; // 7 days in seconds

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 保存用户刷新令牌
   * @param userId 用户ID
   * @param refreshToken 刷新令牌
   * @param ttl 过期时间（秒），默认7天
   */
  async saveRefreshToken(
    userId: number,
    refreshToken: string,
    ttl: number = this.DEFAULT_REFRESH_TTL,
  ): Promise<void> {
    const key = `user:refresh:${userId}`;
    await this.cacheService.set(key, refreshToken, ttl);
    this.logger.debug(
      `保存用户刷新令牌 [userId: ${userId}, ttl: ${ttl}s]`,
    );
  }

  /**
   * 获取用户当前有效的刷新令牌
   * @param userId 用户ID
   * @returns 刷新令牌，如果不存在则返回 null
   */
  async getValidRefreshToken(userId: number): Promise<string | null> {
    const key = `user:refresh:${userId}`;
    const token = await this.cacheService.get<string>(key);
    return token;
  }

  /**
   * 验证刷新令牌是否匹配用户当前存储的令牌
   * @param userId 用户ID
   * @param refreshToken 要验证的刷新令牌
   * @returns 如果令牌匹配返回 true，否则返回 false
   */
  async validateRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<boolean> {
    const storedToken = await this.getValidRefreshToken(userId);
    return storedToken === refreshToken;
  }

  /**
   * 删除用户的所有刷新令牌
   * @param userId 用户ID
   */
  async deleteUserRefreshTokens(userId: number): Promise<void> {
    const key = `user:refresh:${userId}`;
    await this.cacheService.del(key);
    this.logger.debug(`删除用户刷新令牌 [userId: ${userId}]`);
  }
}
