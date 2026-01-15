import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../../prisma.module';
import { CacheModule } from '@/cache/cache.module';

/**
 * 数据看板模块
 * 处理管理员后台的数据统计和分析功能
 */
@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
