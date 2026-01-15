import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsersService } from './users.service';
import { WechatService } from './wechat.service';
import { AdminAuthController } from './admin-auth.controller';
import { ParentAuthController } from './parent-auth.controller';
import { AuthController } from './auth.controller';
import { AdminUsersController } from './admin-users.controller';
import { TokenBlacklistService } from './token-blacklist.service';
import { UserSessionService } from './user-session.service';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule), HttpModule],
  controllers: [AdminAuthController, ParentAuthController, AuthController, AdminUsersController],
  providers: [UsersService, WechatService, TokenBlacklistService, UserSessionService, AdminUsersService, PrismaService],
  exports: [UsersService, WechatService, TokenBlacklistService, UserSessionService, AdminUsersService],
})
export class UsersModule {}
