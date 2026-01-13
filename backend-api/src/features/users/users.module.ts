import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsersService } from './users.service';
import { WechatService } from './wechat.service';
import { AdminAuthController } from './admin-auth.controller';
import { ParentAuthController } from './parent-auth.controller';
import { PrismaService } from '@/lib/prisma.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule, HttpModule],
  controllers: [AdminAuthController, ParentAuthController],
  providers: [UsersService, WechatService, PrismaService],
  exports: [UsersService, WechatService],
})
export class UsersModule {}
