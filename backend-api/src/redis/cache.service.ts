import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redisAvailable = true;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    // 不在构造函数中调用异步方法
  }

  /**
   * 模块初始化时检查 Redis 连接
   * 使用 OnModuleInit 生命周期钩子确保异步操作正确执行
   */
  async onModuleInit(): Promise<void> {
    await this.checkRedisConnection();
  }

  /**
   * 生成带随机化的 TTL，防止缓存雪崩
   * @param baseTtl 基础 TTL（秒）
   * @returns 随机化后的 TTL（秒）
   */
  private getRandomizedTtl(baseTtl: number): number {
    if (!baseTtl || baseTtl <= 0) {
      return baseTtl;
    }
    // ±10% 随机偏移
    const randomization = baseTtl * 0.1;
    const minTtl = baseTtl - randomization;
    const maxTtl = baseTtl + randomization;
    return Math.floor(Math.random() * (maxTtl - minTtl + 1)) + minTtl;
  }

  /**
   * 检查 Redis 连接状态
   * 使用 set + get 操作验证 Redis 真正可用
   */
  private async checkRedisConnection(): Promise<void> {
    try {
      // 使用 set + get 验证 Redis 真正可写可读
      const testKey = '__redis_health_check__';
      const testValue = 'ping';
      await this.cacheManager.set(testKey, testValue, 5);
      const result = await this.cacheManager.get<string>(testKey);
      await this.cacheManager.del(testKey);

      if (result === testValue) {
        this.redisAvailable = true;
        this.logger.log('Redis 连接成功建立');
      } else {
        throw new Error('Redis 响应异常');
      }
    } catch (error) {
      this.redisAvailable = false;
      this.logger.warn(
        `Redis 连接失败: ${(error as Error).message}，应用将以降级模式运行`,
      );
    }
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值，Redis 不可用时返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value ?? null;
    } catch (error) {
      this.logger.error(
        `获取缓存失败 [key: ${key}]: ${(error as Error).message}`,
      );
      return null; // 降级策略：返回 null
    }
  }

  /**
   * 设置缓存值（带 TTL 随机化）
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），可选，不传则使用默认值
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const randomizedTtl = ttl ? this.getRandomizedTtl(ttl) : undefined;
      await this.cacheManager.set(key, value, randomizedTtl);
      this.logger.debug(
        `缓存已设置 [key: ${key}, ttl: ${randomizedTtl ?? 'default'}s]`,
      );
    } catch (error) {
      this.logger.error(
        `设置缓存失败 [key: ${key}]: ${(error as Error).message}`,
      );
      // 降级策略：忽略错误，不阻塞业务
    }
  }

  /**
   * 删除缓存值
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`缓存已删除 [key: ${key}]`);
    } catch (error) {
      this.logger.error(
        `删除缓存失败 [key: ${key}]: ${(error as Error).message}`,
      );
      // 降级策略：忽略错误
    }
  }

  /**
   * 获取 Redis 健康状态
   */
  getHealthStatus(): { available: boolean } {
    return { available: this.redisAvailable };
  }

  /**
   * 重新检查 Redis 连接（用于健康检查）
   * @returns Redis 可用性和响应时间（毫秒）
   */
  async checkHealth(): Promise<{ available: boolean; responseTime: number }> {
    const startTime = Date.now();
    try {
      const testKey = '__redis_health_ping__';
      await this.cacheManager.set(testKey, 'ping', 5);
      await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);
      const responseTime = Date.now() - startTime;

      this.redisAvailable = true;
      return { available: true, responseTime };
    } catch {
      this.redisAvailable = false;
      return { available: false, responseTime: Date.now() - startTime };
    }
  }
}
