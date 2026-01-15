import { Module } from '@nestjs/common';
import { AdminIssuesController } from './admin-issues.controller';
import { AdminIssuesService } from './admin-issues.service';
import { PrismaModule } from '../../prisma.module';
import { CacheModule } from '@/cache/cache.module';

/**
 * 问题管理模块
 * 处理用户问题的记录、跟踪和统计
 */
@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [AdminIssuesController],
  providers: [AdminIssuesService],
  exports: [AdminIssuesService],
})
export class IssuesModule {}
