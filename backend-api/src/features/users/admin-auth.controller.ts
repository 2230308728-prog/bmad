import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { AuthService } from '@/auth/auth.service';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role, UserStatus } from '@prisma/client';

@ApiTags('admin-auth')
@ApiSecurity('bearer')
@Controller('admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @HttpCode(201) // AC 要求返回 201 Created 状态码
  @ApiOperation({ summary: '管理员注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '验证失败' })
  @ApiResponse({ status: 409, description: '邮箱已存在' })
  async register(@Body() registerDto: AdminRegisterDto) {
    const user = await this.usersService.createAdmin(
      registerDto.email,
      registerDto.password,
      registerDto.nickname,
    );

    return {
      data: user,
    };
  }

  @Post('login')
  @ApiOperation({ summary: '管理员登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  @ApiResponse({ status: 403, description: '账号已被禁用' })
  async login(@Body() loginDto: AdminLoginDto) {
    const user = await this.usersService.validateAdmin(
      loginDto.email,
      loginDto.password,
    );

    const tokens = await this.authService.generateTokens(user.id, user.role);

    // 保存刷新令牌到用户会话
    const refreshTTL = 604800; // 7天
    await this.usersService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      refreshTTL,
    );

    return {
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email!,
          nickname: user.nickname,
          role: user.role,
        },
      },
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌（管理员）' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '用户账号已被禁用' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    this.logger.log('Refresh token endpoint called (admin)');

    try {
      // 1. 验证刷新令牌
      const payload = await this.authService.validateRefreshToken(refreshToken);

      // 2. 检查刷新令牌是否在黑名单中
      const isBlacklisted =
        await this.usersService.isRefreshTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        this.logger.warn('Refresh token is blacklisted');
        throw new UnauthorizedException('刷新令牌已失效');
      }

      // 3. 验证令牌是否匹配用户当前会话
      const isValidSession = await this.usersService.validateRefreshToken(
        payload.sub,
        refreshToken,
      );
      if (!isValidSession) {
        this.logger.warn('Refresh token validation failed');
        throw new UnauthorizedException('刷新令牌无效');
      }

      // 4. 获取用户信息
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        this.logger.warn('User not found');
        throw new UnauthorizedException('用户不存在');
      }

      // 5. 检查用户是否被禁用
      if (user.status === UserStatus.BANNED) {
        this.logger.warn(`User ${user.id} is banned`);
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

      // Return tokens directly (not wrapped) to match existing auth controller
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
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('刷新令牌无效');
    }
  }

  // 示例：受保护的管理员端点
  @Post('protected')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '受保护的管理员端点示例' })
  @ApiResponse({ status: 200, description: '成功访问' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async protectedEndpoint() {
    return { message: '管理员权限验证通过' };
  }
}
