import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { AdminRefundsController } from './admin-refunds.controller';
import { AdminRefundsService } from './admin-refunds.service';
import { RefundNotifyController } from './refund-notify.controller';
import { PrismaModule } from '../../prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { PaymentsModule } from '../payments/payments.module';

/**
 * Refunds Module
 * 退款功能模块（家长端 + 管理端 + 退款回调）
 */
@Module({
  imports: [PrismaModule, RedisModule, PaymentsModule],
  controllers: [RefundsController, AdminRefundsController, RefundNotifyController],
  providers: [RefundsService, AdminRefundsService],
  exports: [RefundsService, AdminRefundsService],
})
export class RefundsModule {}
