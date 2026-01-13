import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheService } from '../redis/cache.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('redis')
  @ApiOperation({
    summary: '检查 Redis 健康状态',
    description: '返回 Redis 连接状态和响应时间',
  })
  @ApiResponse({ status: 200, description: '成功返回健康检查结果' })
  async checkRedis() {
    // 使用 checkHealth 方法获取实际 Redis 响应时间
    const healthResult = await this.cacheService.checkHealth();

    return {
      status: healthResult.available ? 'up' : 'down',
      responseTime: `${healthResult.responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  }
}
