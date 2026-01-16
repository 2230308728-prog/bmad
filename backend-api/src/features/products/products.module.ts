import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { PrismaModule } from '../../prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { OssModule } from '../../oss/oss.module';

/**
 * Products Module
 * 产品功能模块
 */
@Module({
  imports: [PrismaModule, RedisModule, OssModule],
  controllers: [
    ProductsController,
    AdminProductsController,
    AdminCategoriesController,
  ],
  providers: [ProductsService, AdminProductsService, AdminCategoriesService],
  exports: [ProductsService],
})
export class ProductsModule {}
