import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../redis/cache.service';

/**
 * 缓存标签类型
 * 用于组织相关的缓存键
 */
export type CacheTag = string;

/**
 * 缓存键模式
 */
export enum CacheKeyPattern {
  /** 产品列表: products:list:{md5 hash} */
  PRODUCTS_LIST = 'products:list',
  /** 产品详情: products:detail:{id} */
  PRODUCTS_DETAIL = 'products:detail',
  /** 产品搜索: products:search:{md5 hash} */
  PRODUCTS_SEARCH = 'products:search',
  /** 分类产品: products:category:{id} */
  PRODUCTS_CATEGORY = 'products:category',
}

/**
 * 缓存键追踪服务
 *
 * 职责：
 * 1. 追踪活跃的缓存键
 * 2. 提供基于标签的缓存失效
 * 3. 提供基于模式的缓存失效
 *
 * 实现方式：
 * - 使用 Redis Set 存储每个标签对应的缓存键集合
 * - 缓存键格式: {actual_key}
 * - 标签集合格式: cache:tags:{tag_name} -> Set[actual_keys]
 */
@Injectable()
export class CacheKeyManagerService {
  private readonly logger = new Logger(CacheKeyManagerService.name);
  private readonly TAG_PREFIX = 'cache:tags:';

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 注册缓存键并关联标签
   * @param key 实际缓存键
   * @param tags 缓存标签数组
   */
  async registerKey(key: string, tags: CacheTag[]): Promise<void> {
    if (!key || tags.length === 0) {
      this.logger.debug(`跳过注册: key=${key}, tags=${tags.join(',')}`);
      return;
    }

    try {
      // 为每个标签添加该缓存键
      for (const tag of tags) {
        const tagKey = this.TAG_PREFIX + tag;
        const currentKeys =
          (await this.cacheService.get<string[]>(tagKey)) || [];

        // 避免重复添加
        if (!currentKeys.includes(key)) {
          currentKeys.push(key);
          // 标签集合 TTL 设置为 7 天（比实际缓存长得多）
          await this.cacheService.set(tagKey, currentKeys, 7 * 24 * 60 * 60);
          this.logger.debug(`注册缓存键到标签 [${tag}]: ${key}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `注册缓存键失败 [key: ${key}]: ${(error as Error).message}`,
      );
      // 降级策略：忽略错误，不影响业务
    }
  }

  /**
   * 使指定标签的所有缓存失效
   * @param tag 缓存标签
   * @returns 失效的缓存键数量
   */
  async invalidateByTag(tag: CacheTag): Promise<number> {
    const tagKey = this.TAG_PREFIX + tag;

    try {
      const keys = (await this.cacheService.get<string[]>(tagKey)) || [];

      if (keys.length === 0) {
        this.logger.debug(`标签 [${tag}] 没有关联的缓存键`);
        return 0;
      }

      // 删除所有关联的缓存键
      for (const key of keys) {
        await this.cacheService.del(key);
      }

      // 清空标签集合
      await this.cacheService.del(tagKey);

      this.logger.log(`标签 [${tag}] 的 ${keys.length} 个缓存键已失效`);
      return keys.length;
    } catch (error) {
      this.logger.error(
        `按标签失效缓存失败 [tag: ${tag}]: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * 使指定模式的缓存失效
   * 注意：Redis 不支持原生模式匹配删除，需要通过 SCAN + DEL 实现
   * 为简化实现，这里使用标签系统作为替代
   * @param pattern 缓存键模式（仅用于日志记录）
   * @param tags 要失效的标签列表
   * @returns 失效的缓存键总数
   */
  async invalidateByPattern(
    pattern: string,
    tags: CacheTag[],
  ): Promise<number> {
    this.logger.log(
      `按模式失效缓存 [pattern: ${pattern}], tags: ${tags.join(',')}`,
    );

    let totalInvalidated = 0;
    for (const tag of tags) {
      totalInvalidated += await this.invalidateByTag(tag);
    }

    return totalInvalidated;
  }

  /**
   * 使产品相关缓存失效
   * @param productId 产品 ID（可选，不传则失效所有产品缓存）
   */
  async invalidateProductCache(productId?: number): Promise<void> {
    if (productId) {
      // 失效特定产品的缓存
      await this.invalidateByTag(`product:${productId}`);
      this.logger.log(`产品 [${productId}] 的缓存已失效`);
    } else {
      // 失效所有产品相关缓存
      await this.invalidateByPattern('products:*', [
        CacheKeyPattern.PRODUCTS_LIST,
        CacheKeyPattern.PRODUCTS_SEARCH,
        CacheKeyPattern.PRODUCTS_CATEGORY,
      ]);
    }
  }

  /**
   * 从缓存键中提取标签
   * 例如：products:detail:123 -> ['product:123', 'products:detail']
   * @param key 缓存键
   * @returns 提取的标签数组
   */
  extractTagsFromKey(key: string): CacheTag[] {
    const tags: CacheTag[] = [];

    // 产品详情键: products:detail:{id}
    const detailMatch = key.match(/^products:detail:(\d+)$/);
    if (detailMatch) {
      const productId = detailMatch[1];
      tags.push(`product:${productId}`);
      tags.push(CacheKeyPattern.PRODUCTS_DETAIL);
    }

    // 产品列表键: products:list:{hash}
    if (key.startsWith(CacheKeyPattern.PRODUCTS_LIST)) {
      tags.push(CacheKeyPattern.PRODUCTS_LIST);
    }

    // 产品搜索键: products:search:{hash}
    if (key.startsWith(CacheKeyPattern.PRODUCTS_SEARCH)) {
      tags.push(CacheKeyPattern.PRODUCTS_SEARCH);
    }

    // 分类产品键: products:category:{id}
    const categoryMatch = key.match(/^products:category:(\d+)$/);
    if (categoryMatch) {
      const categoryId = categoryMatch[1];
      tags.push(`category:${categoryId}`);
      tags.push(CacheKeyPattern.PRODUCTS_CATEGORY);
    }

    return tags;
  }

  /**
   * 清理过期的标签引用（维护操作）
   * 检查标签集合中的键是否实际存在于缓存中
   * @param tag 缓存标签
   * @returns 清理的过期键数量
   */
  async cleanupTag(tag: CacheTag): Promise<number> {
    const tagKey = this.TAG_PREFIX + tag;

    try {
      const keys = (await this.cacheService.get<string[]>(tagKey)) || [];
      if (keys.length === 0) {
        return 0;
      }

      // 检查每个键是否仍然存在于缓存中
      const validKeys: string[] = [];
      for (const key of keys) {
        // 尝试获取缓存键（不获取值，只检查存在性）
        // 注意：由于 CacheService 没有存在性检查，我们使用 get 并忽略结果
        const exists = (await this.cacheService.get(key)) !== null;
        if (exists) {
          validKeys.push(key);
        }
      }

      // 更新标签集合
      const cleanedCount = keys.length - validKeys.length;
      if (cleanedCount > 0) {
        await this.cacheService.set(tagKey, validKeys, 7 * 24 * 60 * 60);
        this.logger.debug(`标签 [${tag}] 清理了 ${cleanedCount} 个过期键`);
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `清理标签失败 [tag: ${tag}]: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * 获取标签统计信息（用于监控）
   * @param tag 缓存标签
   * @returns 标签关联的缓存键数量
   */
  async getTagStats(tag: CacheTag): Promise<{ count: number; keys: string[] }> {
    const tagKey = this.TAG_PREFIX + tag;
    const keys = (await this.cacheService.get<string[]>(tagKey)) || [];
    return {
      count: keys.length,
      keys,
    };
  }
}
