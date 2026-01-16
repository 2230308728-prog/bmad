import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@/auth/auth.service';
import { UsersService } from './users.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUserType } from '@/common/decorators/current-user.decorator';
import { UserStatus } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '用户账号已被禁用' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    this.logger.log('Refresh token endpoint called');

    try {
      // 1. 验证刷新令牌
      const payload = await this.authService.validateRefreshToken(refreshToken);

      // 2. 检查刷新令牌是否在黑名单中
      const isBlacklisted =
        await this.usersService.isRefreshTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('刷新令牌已失效');
      }

      // 3. 验证令牌是否匹配用户当前会话
      const isValidSession = await this.usersService.validateRefreshToken(
        payload.sub,
        refreshToken,
      );
      if (!isValidSession) {
        throw new UnauthorizedException('刷新令牌无效');
      }

      // 4. 获取用户信息
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 5. 检查用户是否被禁用
      if (user.status === UserStatus.BANNED) {
        throw new ForbiddenException('用户账号已被禁用');
      }

      // 6. 生成新的令牌对
      const newTokens = await this.authService.generateTokens(
        user.id,
        user.role,
      );

      // 7. 刷新令牌轮换：将旧刷新令牌加入黑名单，保存新的刷新令牌
      const refreshTTL = 604800; // 7天
      await Promise.all([
        this.usersService.addRefreshTokenToBlacklist(refreshToken, refreshTTL),
        this.usersService.saveRefreshToken(
          user.id,
          newTokens.refreshToken,
          refreshTTL,
        ),
      ]);

      this.logger.log(`Token refreshed successfully for user ${user.id}`);

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token refresh failed: ${errorMessage}`);
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '登出用户' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  async logout(@CurrentUser() user: CurrentUserType, @Request() req: any) {
    // 1. 从请求头中提取访问令牌
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('缺少认证令牌');
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // 2. 将访问令牌加入黑名单
    // 使用访问令牌的过期时间作为 TTL（默认15分钟 = 900秒）
    const accessTTL = 900;
    await this.usersService.addAccessTokenToBlacklist(accessToken, accessTTL);

    // 3. 删除用户的所有刷新令牌
    await this.usersService.deleteUserRefreshTokens(user.id);

    this.logger.log(`User ${user.id} logged out successfully`);

    return {
      message: '登出成功',
    };
  }
}
