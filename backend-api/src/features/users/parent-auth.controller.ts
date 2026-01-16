import { Controller, Post, Body, Logger, UseGuards, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WechatService } from './wechat.service';
import { UsersService } from './users.service';
import { AuthService } from '@/auth/auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUserType } from '@/common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('parent-auth')
@ApiSecurity('bearer')
@Controller('parent/auth')
export class ParentAuthController {
  private readonly logger = new Logger(ParentAuthController.name);

  constructor(
    private readonly wechatService: WechatService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('wechat-login')
  @ApiOperation({ summary: '家长微信授权登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '微信授权失败' })
  async wechatLogin(@Body() loginDto: WechatLoginDto) {
    try {
      // 1. 使用 code 换取 openid
      this.logger.log(
        `WeChat login attempt with code: ${loginDto.code.substring(0, 10)}...`,
      );
      const openid = await this.wechatService.jscode2session(loginDto.code);

      // 2. 查找或创建用户
      const user = await this.usersService.findOrCreateParent(
        openid,
        loginDto.userInfo?.nickname,
        loginDto.userInfo?.avatarUrl,
      );

      // 3. 生成令牌
      const tokens = await this.authService.generateTokens(user.id, user.role);

      // 4. 保存刷新令牌到用户会话
      const refreshTTL = 604800; // 7天
      await this.usersService.saveRefreshToken(
        user.id,
        tokens.refreshToken,
        refreshTTL,
      );

      // 5. 返回响应
      this.logger.log(`WeChat login successful for user: ${user.id}`);

      return {
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl ?? null,
            role: user.role,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `WeChat login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // 示例：受保护的家长端点
  @Get('profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PARENT)
  @ApiOperation({ summary: '获取当前家长信息' })
  @ApiResponse({ status: 200, description: '成功获取' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getProfile(@CurrentUser() user: CurrentUserType) {
    return this.usersService.findById(user.id);
  }
}
