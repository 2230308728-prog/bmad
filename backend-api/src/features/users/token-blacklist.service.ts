import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@/redis/cache.service';

/**
 * 令牌黑名单服务
 *
 * 负责管理已失效的访问令牌和刷新令牌黑名单
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 将访问令牌加入黑名单
   * @param token 访问令牌
   * @param ttl 过期时间（秒）
   */
  async addToAccessBlacklist(token: string, ttl: number): Promise<void> {
    const key = `blacklist:access:${token}`;
    await this.cacheService.set(key, '1', ttl);
    this.logger.debug(
      `访问令牌已加入黑名单 [token: ${token.substring(0, 10)}..., ttl: ${ttl}s]`,
    );
  }

  /**
   * 将刷新令牌加入黑名单
   * @param token 刷新令牌
   * @param ttl 过期时间（秒）
   */
  async addToRefreshBlacklist(token: string, ttl: number): Promise<void> {
    const key = `blacklist:refresh:${token}`;
    await this.cacheService.set(key, '1', ttl);
    this.logger.debug(
      `刷新令牌已加入黑名单 [token: ${token.substring(0, 10)}..., ttl: ${ttl}s]`,
    );
  }

  /**
   * 检查访问令牌是否在黑名单中
   * @param token 访问令牌
   * @returns 如果在黑名单中返回 true，否则返回 false
   */
  async isAccessBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:access:${token}`;
    const result = await this.cacheService.get<string>(key);
    return result === '1';
  }

  /**
   * 检查刷新令牌是否在黑名单中
   * @param token 刷新令牌
   * @returns 如果在黑名单中返回 true，否则返回 false
   */
  async isRefreshBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:refresh:${token}`;
    const result = await this.cacheService.get<string>(key);
    return result === '1';
  }
}
