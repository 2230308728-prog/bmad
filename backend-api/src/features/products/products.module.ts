import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../../prisma.module';
import { RedisModule } from '../../redis/redis.module';

/**
 * Products Module
 * 产品功能模块
 */
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
