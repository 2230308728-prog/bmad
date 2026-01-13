import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsersService } from './users.service';
import { WechatService } from './wechat.service';
import { AdminAuthController } from './admin-auth.controller';
import { ParentAuthController } from './parent-auth.controller';
import { AuthController } from './auth.controller';
import { TokenBlacklistService } from './token-blacklist.service';
import { UserSessionService } from './user-session.service';
import { PrismaService } from '@/lib/prisma.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule), HttpModule],
  controllers: [AdminAuthController, ParentAuthController, AuthController],
  providers: [UsersService, WechatService, TokenBlacklistService, UserSessionService, PrismaService],
  exports: [UsersService, WechatService, TokenBlacklistService, UserSessionService],
})
export class UsersModule {}
