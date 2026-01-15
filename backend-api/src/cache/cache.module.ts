import { Module, Global } from '@nestjs/common';
import { CacheKeyManagerService } from './cache-key-manager.service';

/**
 * 缓存管理模块
 * 提供 CacheKeyManager 服务用于追踪和管理缓存键
 *
 * @Global 使此模块在全局可用，无需在其他模块中重复导入
 */
@Global()
@Module({
  providers: [CacheKeyManagerService],
  exports: [CacheKeyManagerService],
})
export class CacheModule {}
