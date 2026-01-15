import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  HttpException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminUsersService } from './admin-users.service';
import { QueryUsersDto } from './dto/admin/query-users.dto';
import { UpdateUserStatusDto } from './dto/admin/update-user-status.dto';
import { UserListResponseDto } from './dto/admin/user-list-response.dto';
import { UserDetailResponseDto } from './dto/admin/user-detail-response.dto';
import { UserStatsResponseDto } from './dto/admin/user-stats-response.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, type CurrentUserType } from '@/common/decorators/current-user.decorator';

/**
 * 管理员用户控制器
 * 处理管理员视角的用户查询、状态更新和统计功能
 */
@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  private readonly logger = new Logger(AdminUsersController.name);

  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * 查询用户列表（管理员视角）
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param queryDto 查询参数
   * @returns 分页用户列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询用户列表（管理员）',
    description: `管理员查询平台上的所有用户，支持多条件筛选。

**功能特性：**
- 按创建时间倒序返回用户列表（默认）
- 支持分页查询（默认第 1 页，每页 20 条，最多 50 条/页）
- 支持角色筛选（PARENT、ADMIN）
- 支持状态筛选（ACTIVE、INACTIVE、BANNED）
- 支持关键词搜索（昵称或手机号）
- 支持日期范围筛选（注册开始日期、结束日期）
- 包含用户订单统计（订单数、总消费）
- 手机号脱敏显示（保留前3位和后4位）

**数据权限：**
- 管理员可以查看所有用户
- 手机号脱敏显示：138****8000
- 包含订单数和总消费金额`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        data: [
          {
            id: 1,
            nickname: '张小明',
            avatarUrl: 'https://example.com/avatar.jpg',
            role: 'PARENT',
            status: 'ACTIVE',
            phone: '138****8000',
            orderCount: 5,
            totalSpent: '1495.00',
            lastOrderAt: '2024-01-15T10:30:00Z',
            createdAt: '2024-01-01T08:00:00Z',
          },
        ],
        total: 100,
        page: 1,
        pageSize: 20,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async findAll(
    @CurrentUser() user: CurrentUserType,
    @Query(ValidationPipe) queryDto: QueryUsersDto,
  ) {
    try {
      this.logger.log(`Admin ${user.id} querying users with filters: ${JSON.stringify(queryDto)}`);
      const result = await this.adminUsersService.findAll(queryDto);
      return result;
    } catch (error) {
      this.logger.error(`Failed to query users for admin ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * 获取用户统计数据
   * @param user 当前用户（管理员）
   * @returns 统计数据
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取用户统计数据（管理员）',
    description: `获取平台用户的统计数据，包括：

**统计指标：**
- total: 总用户数
- parents: 家长用户数
- admins: 管理员用户数
- active: 活跃用户数
- inactive: 未激活用户数
- banned: 已禁用用户数
- todayRegistered: 今日注册用户数
- weekRegistered: 本周注册用户数
- monthRegistered: 本月注册用户数

**数据用途：**
- 管理后台仪表盘展示
- 用户概览和增长趋势分析
- 业务决策支持

**缓存策略：**
- 统计结果缓存 5 分钟
- 状态更新时自动清除缓存`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: UserStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async getStats(@CurrentUser() user: CurrentUserType): Promise<{ data: UserStatsResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying user stats`);
      const result = await this.adminUsersService.getStats();
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to query user stats:`, error);
      throw error;
    }
  }

  /**
   * 查询用户详情（管理员视角）
   * @param user 当前用户
   * @param id 用户 ID
   * @returns 完整用户信息
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询用户详情（管理员）',
    description: `管理员查询单个用户的详细信息。

**返回信息：**
- 用户基本信息（ID、昵称、头像、角色、状态）
- 认证信息（微信 OpenID、管理员邮箱）
- 联系方式（手机号，不脱敏）
- 订单统计（订单数、总消费）
- 最近登录时间（使用最近订单时间作为参考）
- 注册和更新时间

**数据权限：**
- 管理员可以查看任何用户的详情
- 手机号不脱敏，显示完整号码`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: UserDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async findOne(@CurrentUser() user: CurrentUserType, @Param('id', ParseIntPipe) id: number) {
    try {
      this.logger.log(`Admin ${user.id} querying user detail for user ${id}`);
      const result = await this.adminUsersService.findOne(id);
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to query user detail for admin ${user.id}, user ${id}:`, error);
      throw error;
    }
  }

  /**
   * 更新用户状态
   * @param user 当前用户（管理员）
   * @param id 用户 ID
   * @param updateDto 状态更新请求
   * @returns 更新后的用户信息
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新用户状态（管理员）',
    description: `管理员更新用户状态，支持以下状态：

**状态说明：**
- ACTIVE: 激活状态，可以正常登录和使用
- INACTIVE: 未激活状态
- BANNED: 已禁用状态，无法登录

**允许的状态转换：**
- ACTIVE ↔ INACTIVE ↔ BANNED（所有状态转换都允许）

**业务逻辑：**
- 验证用户存在
- 更新用户状态
- 清除相关 Redis 缓存
- 被禁用的用户（BANNED）无法登录（在 AuthService 中验证）
- 返回更新后的用户信息`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({
    status: 200,
    description: '状态更新成功',
    type: UserDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '状态无效或已是目标状态',
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async updateStatus(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateUserStatusDto,
  ): Promise<{ data: UserDetailResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} updating user ${id} status to ${updateDto.status}`);
      const result = await this.adminUsersService.updateStatus(id, updateDto);
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to update user ${id} status:`, error);
      throw error;
    }
  }
}
