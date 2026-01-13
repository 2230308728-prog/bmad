import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Auth Module - JWT 认证基础设施
 *
 * 提供令牌生成、验证和 Passport JWT 策略
 * 作为全局模块供其他功能模块使用
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION');

        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }

        // Type assertion required: jsonwebtoken's StringValue type doesn't accept plain string
        // from ConfigService. This is a known type definition mismatch between @nestjs/jwt and jsonwebtoken.
        return {
          secret,
          signOptions: {
            expiresIn: (expiresIn || '15m') as any,
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
