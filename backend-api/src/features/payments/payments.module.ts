import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WechatPayService } from './wechat-pay.service';
import { PaymentsController } from './payments.controller';
import { PaymentNotifyController } from './payment-notify.controller';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController, PaymentNotifyController],
  providers: [WechatPayService, PrismaService, CacheService],
  exports: [WechatPayService],
})
export class PaymentsModule {}
