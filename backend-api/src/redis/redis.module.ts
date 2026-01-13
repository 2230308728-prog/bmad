import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const redisStore = require('cache-manager-ioredis');
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        ttl: 300, // 默认 TTL 5 分钟
        max: 2000, // 最大缓存条目数
        isCacheableValue: (value: unknown) => value !== null && value !== undefined,
      }),
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, CacheModule],
})
export class RedisModule {}
