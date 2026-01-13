import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './features/users/users.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { OssModule } from './oss/oss.module';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './features/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per ttl
      },
    ]),
    PrismaModule,
    UsersModule,
    RedisModule,
    HealthModule,
    OssModule,
    AuthModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
