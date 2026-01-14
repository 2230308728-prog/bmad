import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WechatPayService } from './wechat-pay.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [WechatPayService],
  exports: [WechatPayService],
})
export class PaymentsModule {}
