import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { AdminRefundsController } from './admin-refunds.controller';
import { AdminRefundsService } from './admin-refunds.service';
import { PrismaModule } from '../../prisma.module';
import { RedisModule } from '../../redis/redis.module';

/**
 * Refunds Module
 * 退款功能模块（家长端 + 管理端）
 */
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RefundsController, AdminRefundsController],
  providers: [RefundsService, AdminRefundsService],
  exports: [RefundsService, AdminRefundsService],
})
export class RefundsModule {}
