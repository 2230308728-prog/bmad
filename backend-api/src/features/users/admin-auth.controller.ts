import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthService } from '@/auth/auth.service';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @HttpCode(201)  // AC 要求返回 201 Created 状态码
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
}
