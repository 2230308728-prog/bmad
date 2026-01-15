import {
  Controller,
  Get,
  Query,
  Param,
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
import { PopularProductsResponseDto } from './dto/popular-products-response.dto';
import { PopularProductsQueryDto } from './dto/popular-products-query.dto';
import { ConversionFunnelQueryDto } from './dto/conversion-funnel-query.dto';
import { ConversionFunnelResponseDto } from './dto/conversion-funnel-response.dto';
import { UserRetentionResponseDto } from './dto/user-retention-response.dto';
import { ProductPerformanceResponseDto } from './dto/product-performance-response.dto';

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

  /**
   * 获取热门产品排行
   */
  @Get('popular-products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取热门产品排行（管理员）',
    description: `获取热门产品排行数据，支持不同时间范围。

**查询参数：**
- period: 时间范围（week/month/all）
  - week: 本周数据（默认）
  - month: 本月数据
  - all: 全部数据
- limit: 返回数量（1-50，默认10）

**数据内容：**
- products: 产品列表
  - id: 产品ID
  - title: 产品标题
  - image: 产品图片
  - category: 产品分类
  - price: 产品价格
  - orders: 订单数
  - amount: 订单金额
  - views: 浏览次数
  - conversionRate: 转化率（%）
  - avgRating: 平均评分
  - rank: 排名
- summary: 汇总统计
  - totalOrders: 总订单数
  - totalAmount: 总金额
  - avgConversionRate: 平均转化率

**排序规则：**
- 按订单数降序排列
- 只统计已支付和已完成的订单

**缓存策略：**
- 统计结果缓存 10 分钟`,
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
  async getPopularProducts(
    @CurrentUser() user: CurrentUserType,
    @Query(ValidationPipe) query: PopularProductsQueryDto,
  ): Promise<{ data: PopularProductsResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying popular products with params:`, query);
      const result = await this.dashboardService.getPopularProducts(query);
      return { data: result as PopularProductsResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query popular products:`, error);
      throw error;
    }
  }

  /**
   * 获取转化漏斗分析
   */
  @Get('conversion-funnel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取转化漏斗分析（管理员）',
    description: `获取用户转化漏斗数据，帮助分析用户流失点。

**查询参数：**
- period: 时间范围（week/month/all）
  - week: 本周数据（默认）
  - month: 本月数据
  - all: 全部数据

**数据内容：**
- funnel: 转化漏斗各阶段
  - stage: 阶段名称
    - 浏览产品: 用户浏览产品列表/页面
    - 查看详情: 用户查看产品详情
    - 创建订单: 用户创建订单
    - 完成支付: 用户完成支付
  - users: 用户数量
  - percentage: 转化率（相对于第一阶段）
- overallConversion: 总体转化率（完成支付/浏览产品 × 100%）
- dropoffs: 流失分析
  - stage: 流失阶段
  - users: 流失用户数
  - percentage: 流失率（相对于上一阶段）

**业务价值：**
- 识别用户流失关键节点
- 优化产品页面和转化流程
- 评估营销活动效果
- 监控业务健康状况

**缓存策略：**
- 统计结果缓存 10 分钟`,
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
  async getConversionFunnel(
    @CurrentUser() user: CurrentUserType,
    @Query(ValidationPipe) query: ConversionFunnelQueryDto,
  ): Promise<{ data: ConversionFunnelResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying conversion funnel with params:`, query);
      const result = await this.dashboardService.getConversionFunnel(query);
      return { data: result as ConversionFunnelResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query conversion funnel:`, error);
      throw error;
    }
  }

  /**
   * 获取用户留存分析
   */
  @Get('user-retention')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取用户留存分析（管理员）',
    description: `获取用户留存数据，通过队列分析方法追踪用户行为。

**数据内容：**
- cohortAnalysis: 队列分析
  - period: 队列周期（如 2023-12-W1 表示2023年第1周）
  - newUsers: 该周期新注册用户数
  - retention: 留存率
    - day1: 次日留存率（注册后第1天有订单的用户比例）
    - day7: 7日留存率（注册后第7天有订单的用户比例）
    - day30: 30日留存率（注册后第30天有订单的用户比例）

- avgRetention: 平均留存率
  - day1: 所有队列的平均次日留存率
  - day7: 所有队列的平均7日留存率
  - day30: 所有队列的平均30日留存率

**业务价值：**
- 评估用户生命周期价值（LTV）
- 识别用户流失规律
- 优化产品和运营策略
- 预测未来营收趋势

**分析方法：**
- 按注册周分组用户（队列分析）
- 统计每个队列在不同时间点的留存率
- 计算跨队列的平均留存率

**缓存策略：**
- 统计结果缓存 10 分钟`,
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
  async getUserRetention(
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ data: UserRetentionResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying user retention`);
      const result = await this.dashboardService.getUserRetention();
      return { data: result as UserRetentionResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query user retention:`, error);
      throw error;
    }
  }

  /**
   * 获取单个产品的详细表现数据
   */
  @Get('product-performance/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取产品详细表现（管理员）',
    description: `获取单个产品的详细表现数据，用于深度分析。

**路径参数：**
- id: 产品ID

**数据内容：**
- product: 产品基本信息
  - id: 产品ID
  - title: 产品标题

- stats: 统计数据
  - totalViews: 总浏览量
  - totalOrders: 总订单数
  - totalRevenue: 总收入（已完成订单）
  - conversionRate: 转化率（订单数/浏览量 × 100%）
  - avgOrderValue: 平均订单价值
  - cancelRate: 取消率（取消订单/总订单 × 100%）
  - refundRate: 退款率（退款订单/总订单 × 100%）

- trend: 趋势数据
  - last7Days: 最近7天每日订单数
  - last30Days: 最近30天每周订单数

- demographics: 用户人群统计
  - avgAge: 平均年龄（暂未实现）
  - ageDistribution: 年龄分布（暂未实现）

**业务价值：**
- 评估产品表现
- 识别产品问题
- 优化产品策略
- 辅助定价决策

**缓存策略：**
- 统计结果缓存 10 分钟`,
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
  @ApiResponse({
    status: 404,
    description: '产品不存在',
  })
  async getProductPerformance(
    @CurrentUser() user: CurrentUserType,
    @Param('id') productId: string,
  ): Promise<{ data: ProductPerformanceResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying product performance for: ${productId}`);
      const result = await this.dashboardService.getProductPerformance(parseInt(productId, 10));
      return { data: result as ProductPerformanceResponseDto };
    } catch (error) {
      this.logger.error(`Failed to query product performance:`, error);
      throw error;
    }
  }
}
