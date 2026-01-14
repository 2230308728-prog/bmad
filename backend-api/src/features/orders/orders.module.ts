import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../prisma.module';
import { RedisModule } from '../../redis/redis.module';

/**
 * Orders Module
 * 订单功能模块（家长端）
 */
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
