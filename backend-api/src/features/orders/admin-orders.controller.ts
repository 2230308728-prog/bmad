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
  ParseIntPipe,
  ValidationPipe,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { AdminOrdersService } from './admin-orders.service';
import { AdminQueryOrdersDto } from './dto/admin/admin-query-orders.dto';
import { UpdateOrderStatusDto } from './dto/admin/update-order-status.dto';
import { OrderStatusUpdateResponseDto } from './dto/admin/update-order-status.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, type CurrentUserType } from '../../common/decorators/current-user.decorator';

/**
 * 管理员订单控制器
 * 处理管理员视角的订单查询、状态更新和统计功能
 */
@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  private readonly logger = new Logger(AdminOrdersController.name);

  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /**
   * 查询所有订单（管理员视角）
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param queryDto 查询参数
   * @returns 分页订单列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询所有订单（管理员）',
    description: `管理员查询平台上的所有订单，支持多条件筛选。

**功能特性：**
- 按创建时间倒序返回订单列表（默认）
- 支持分页查询（默认第 1 页，每页 20 条，最多 50 条/页）
- 支持状态筛选（PENDING、PAID、CANCELLED、REFUNDED、COMPLETED）
- 支持订单编号搜索（部分匹配）
- 支持用户 ID 筛选
- 支持日期范围筛选（开始日期、结束日期）
- 支持产品 ID 筛选

**数据权限：**
- 管理员可以查看所有订单
- 不脱敏任何敏感信息（手机号等）
- 包含用户和产品基本信息`,
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
            orderNo: 'ORD20240114123456789',
            status: 'PAID',
            totalAmount: '299.00',
            actualAmount: '299.00',
            user: {
              id: 1,
              name: '张小明',
              phone: '13800138000',
              role: 'PARENT',
            },
            product: {
              id: 1,
              title: '上海科技馆探索之旅',
              price: '299.00',
            },
            bookingDate: '2024-02-15',
            createdAt: '2024-01-14T12:00:00Z',
          },
        ],
        total: 50,
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
  async findAll(@CurrentUser() user: CurrentUserType, @Query(ValidationPipe) queryDto: AdminQueryOrdersDto) {
    try {
      this.logger.log(`Admin ${user.id} querying orders with filters:`, queryDto);
      const result = await this.adminOrdersService.findAll(queryDto);
      return result;
    } catch (error) {
      this.logger.error(`Failed to query orders for admin ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * 查询订单详情（管理员视角）
   * @param user 当前用户
   * @param id 订单 ID
   * @returns 完整订单详情
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询订单详情（管理员）',
    description: `管理员查询单个订单的详细信息。

**返回信息：**
- 订单基本信息（订单号、状态、金额、备注）
- 用户完整信息（不脱敏）
- 订单项数组（产品快照）
- 支付记录数组
- 退款记录数组（如有）
- 状态变更历史记录

**数据权限：**
- 管理员可以查看任何订单的详情
- 不脱敏手机号和其他敏感信息
- 包含完整的状态变更历史`,
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
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: '订单不存在',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
   description: '权限不足（需要 ADMIN 角色）',
  })
  async findOne(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      throw new HttpException('订单 ID 格式无效', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log(`Admin ${user.id} querying order detail for order ${orderId}`);
      const result = await this.adminOrdersService.findOne(orderId);
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to query order detail for admin ${user.id}, order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * 更新订单状态
   * @param user 当前用户（管理员）
   * @param id 订单 ID
   * @param updateDto 状态更新请求
   * @returns 更新后的订单
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新订单状态（管理员）',
    description: `管理员更新订单状态，支持以下状态转换：

**允许的状态转换：**
- PENDING → CANCELLED（取消待支付订单）
- PAID → COMPLETED（标记订单完成）
- PAID → REFUNDED（启动退款流程）

**不允许的状态转换：**
- CANCELLED/COMPLETED/REFUNDED → 任何状态（终态不可变更）

**业务逻辑：**
- 验证订单存在
- 验证状态转换合法性
- 更新订单状态和时间戳（completedAt、cancelledAt、refundedAt）
- 创建状态变更历史记录
- 如果状态为 REFUNDED，自动创建退款记录
- 记录操作管理员 ID`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: 200,
    description: '状态更新成功',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: '状态转换不合法',
  })
  @ApiResponse({
    status: 404,
    description: '订单不存在',
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
    @Body(ValidationPipe) updateDto: UpdateOrderStatusDto,
  ): Promise<{ data: OrderStatusUpdateResponseDto }> {
    try {
      this.logger.log(
        `Admin ${user.id} updating order ${id} status to ${updateDto.status}`,
      );
      const result = await this.adminOrdersService.updateStatus(id, updateDto, user.id);
      return {
        data: {
          id: result.id,
          orderNo: result.orderNo,
          status: result.status,
          completedAt: result.completedAt,
          cancelledAt: result.cancelledAt,
          refundedAt: result.refundedAt,
          message: '状态已更新',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update order ${id} status:`, error);
      throw error;
    }
  }

  /**
   * 获取订单统计数据
   * @param user 当前用户（管理员）
   * @returns 统计数据
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取订单统计数据（管理员）',
    description: `获取平台订单的统计数据，包括：

**统计指标：**
- total: 总订单数
- pending: 待支付订单数
- paid: 已支付订单数
- completed: 已完成订单数
- cancelled: 已取消订单数
- refunded: 已退款订单数
- todayCount: 今日订单数
- todayAmount: 今日订单金额（元）

**数据用途：**
- 管理后台仪表盘展示
- 订单概览和趋势分析
- 业务决策支持`,
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
        total: 1000,
        pending: 50,
        paid: 800,
        completed: 100,
        cancelled: 30,
        refunded: 20,
        todayCount: 25,
        todayAmount: '7500.00',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async getStats(@CurrentUser() user: CurrentUserType) {
    try {
      this.logger.log(`Admin ${user.id} querying order stats`);
      const result = await this.adminOrdersService.getStats();
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to query order stats:`, error);
      throw error;
    }
  }
}
