import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, type CurrentUserType } from '@/common/decorators/current-user.decorator';
import { OverviewResponseDto } from './dto/overview-response.dto';
import { OrdersTrendQueryDto, OrdersTrendResponseDto } from './dto/orders-trend-query.dto';
import { UsersTrendResponseDto } from './dto/users-trend-response.dto';
import { RevenueBreakdownResponseDto } from './dto/revenue-breakdown-response.dto';

/**
 * 数据看板控制器
 * 处理管理员后台的数据统计和分析端点
 */
@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * 获取核心业务指标概览
   */
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取核心业务指标（管理员）',
    description: `获取平台的核心业务指标，包括：

**统计维度：**
- today: 今日数据
- week: 本周数据
- month: 本月数据
- total: 总计数据

**统计指标：**
- orders: 订单数
- ordersAmount: 订单金额
- newUsers: 新增用户数
- paidOrders: 已支付订单数
- completedOrders: 已完成订单数
- users: 用户总数
- products: 产品总数
- revenue: 总收入

**数据用途：**
- 管理后台首页仪表盘
- 运营数据概览
- 业务趋势监控

**缓存策略：**
- 统计结果缓存 5 分钟`,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async getOverview(@CurrentUser() user: CurrentUserType): Promise<{ data: OverviewResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying dashboard overview`);
      const result = await this.dashboardService.getOverview();
      return { data: result as OverviewResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query dashboard overview:`, error);
      throw error;
    }
  }

  /**
   * 获取订单趋势数据
   */
  @Get('orders-trend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取订单趋势（管理员）',
    description: `获取订单趋势数据，支持不同时间粒度。

**查询参数：**
- period: 时间范围（today/week/month）
- granularity: 时间粒度（hour/day）

**数据内容：**
- time: 时间点标签
- orders: 订单数量
- amount: 订单金额

**缓存策略：**
- 统计结果缓存 5 分钟`,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async getOrdersTrend(
    @CurrentUser() user: CurrentUserType,
    @Query(ValidationPipe) query: OrdersTrendQueryDto,
  ): Promise<{ data: OrdersTrendResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying orders trend with params:`, query);
      const result = await this.dashboardService.getOrdersTrend(query);
      return { data: result as OrdersTrendResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query orders trend:`, error);
      throw error;
    }
  }

  /**
   * 获取用户增长趋势
   */
  @Get('users-trend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取用户增长趋势（管理员）',
    description: `获取用户增长趋势数据。

**数据内容：**
- newUsers: 新增注册用户数
- activeUsers: 活跃用户数（有订单的用户）

**缓存策略：**
- 统计结果缓存 5 分钟`,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async getUsersTrend(
    @CurrentUser() user: CurrentUserType,
    @Query(ValidationPipe) query: OrdersTrendQueryDto,
  ): Promise<{ data: UsersTrendResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying users trend with params:`, query);
      const result = await this.dashboardService.getUsersTrend(query);
      return { data: result as UsersTrendResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query users trend:`, error);
      throw error;
    }
  }

  /**
   * 获取收入构成分析
   */
  @Get('revenue-breakdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取收入构成分析（管理员）',
    description: `获取收入构成分析数据。

**数据内容：**
- byCategory: 按产品分类统计
  - category: 分类名称
  - orders: 订单数
  - amount: 金额
  - percentage: 占比
- byPaymentMethod: 按支付方式统计

**缓存策略：**
- 统计结果缓存 5 分钟`,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async getRevenueBreakdown(@CurrentUser() user: CurrentUserType): Promise<{ data: RevenueBreakdownResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying revenue breakdown`);
      const result = await this.dashboardService.getRevenueBreakdown();
      return { data: result as RevenueBreakdownResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query revenue breakdown:`, error);
      throw error;
    }
  }
}
