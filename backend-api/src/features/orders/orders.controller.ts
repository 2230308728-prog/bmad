import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  HttpException,
  Header,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { Response } from 'express';

/**
 * Orders Controller
 * 处理家长端订单相关的 HTTP 请求
 * 所有端点都需要 PARENT 角色权限
 */
@ApiTags('orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PARENT)
@Controller('v1/orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * 创建订单（提交预订信息）
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param createOrderDto 创建订单 DTO
   * @returns 创建的订单信息
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建订单（提交预订信息）',
    description: '家长提交预订信息创建订单，需要 PARENT 角色权限。验证产品存在性、库存、年龄范围后，使用 Redis 原子操作预扣库存并创建订单。',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: '订单创建成功',
    schema: {
      example: {
        data: {
          id: 1,
          orderNo: 'ORD20240114123456789',
          status: 'PENDING',
          totalAmount: '299.00',
          product: {
            id: 1,
            title: '上海科技馆探索之旅',
            images: ['https://oss.example.com/products/1/image1.jpg'],
          },
          bookingDate: '2024-02-15',
          createdAt: '2024-01-14T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败（产品不存在或已下架、库存不足、年龄范围不符）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 PARENT 角色）',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误（订单创建失败，已回滚库存）',
  })
  async create(@CurrentUser() user: CurrentUserType, @Body() createOrderDto: CreateOrderDto) {
    try {
      this.logger.log(
        `Creating order for user ${user.id}: productId=${createOrderDto.productId}`,
      );

      const result = await this.ordersService.create(user.id, createOrderDto);

      return { data: result };
    } catch (error) {
      this.logger.error(
        `Failed to create order for user ${user.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 查询订单列表
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param queryDto 查询参数
   * @returns 分页订单列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询订单列表',
    description: `家长查询自己的订单列表，需要 PARENT 角色权限。

**功能特性：**
- 按创建时间倒序返回订单列表（默认）
- 支持分页查询（默认第 1 页，每页 20 条）
- 支持状态筛选（PENDING、PAID、CANCELLED、REFUNDED、COMPLETED）
- 支持排序（按创建时间或订单金额，升序或降序）

**分页参数：**
- page: 页码（默认 1，最小 1）
- pageSize: 每页数量（默认 20，范围 1-100）

**筛选参数：**
- status: 订单状态（可选）

**排序参数：**
- sortBy: 排序字段（默认 createdAt，可选 totalAmount）
- sortOrder: 排序方向（默认 desc，可选 asc）`,
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
            productName: '上海科技馆探索之旅',
            createdAt: '2024-01-14T12:00:00Z',
          },
          {
            id: 2,
            orderNo: 'ORD20240113987654321',
            status: 'PENDING',
            totalAmount: '199.00',
            productName: '自然博物馆奇妙夜',
            createdAt: '2024-01-13T10:30:00Z',
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
    description: '请求参数验证失败（page、pageSize、status、sortBy、sortOrder 无效）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 PARENT 角色）',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async findAll(@CurrentUser() user: CurrentUserType, @Query() queryDto: QueryOrdersDto) {
    try {
      this.logger.log(
        `Querying orders for user ${user.id}: page=${queryDto.page}, pageSize=${queryDto.pageSize}, status=${queryDto.status}`,
      );

      const result = await this.ordersService.findAll(user.id, queryDto);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to query orders for user ${user.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 查询订单详情
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param id 订单 ID
   * @returns 订单详情
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询订单详情',
    description: `家长查询单个订单的详细信息，需要 PARENT 角色权限。

**返回信息：**
- 订单基本信息（订单号、状态、金额、备注）
- 联系人信息（姓名、脱敏手机号、孩子姓名、孩子年龄）
- 订单项数组（产品快照：名称、价格、数量、小计）
- 支付记录数组（交易号、支付时间、金额、支付渠道）
- 退款记录数组（如有）

**数据隐私：**
- 联系人手机号已脱敏（138****8000 格式）

**权限验证：**
- 只能查询自己的订单
- 订单不存在或不属于当前用户时返回 404`,
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
        data: {
          id: 1,
          orderNo: 'ORD20240114123456789',
          status: 'PAID',
          totalAmount: '299.00',
          actualAmount: '299.00',
          remark: '请提前预约',
          contactName: '张三',
          contactPhone: '138****8000',
          childName: '小明',
          childAge: 8,
          bookingDate: '2024-02-15',
          paidAt: '2024-01-14T12:30:00Z',
          createdAt: '2024-01-14T12:00:00Z',
          items: [
            {
              id: 1,
              productName: '上海科技馆探索之旅',
              productPrice: '299.00',
              quantity: 1,
              subtotal: '299.00',
            },
          ],
          payments: [
            {
              id: 1,
              transactionId: 'wx1234567890',
              channel: 'WECHAT_JSAPI',
              amount: '299.00',
              status: 'SUCCESS',
              createdAt: '2024-01-14T12:30:00Z',
            },
          ],
          refunds: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '订单不存在或不属于当前用户',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 PARENT 角色）',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async findOne(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      throw new HttpException('Invalid order ID', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log(
        `Querying order detail for user ${user.id}, order ${orderId}`,
      );

      const result = await this.ordersService.findOne(orderId, user.id);

      return { data: result };
    } catch (error) {
      this.logger.error(
        `Failed to query order detail for user ${user.id}, order ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 查询订单支付状态
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param id 订单 ID
   * @returns 支付状态信息
   */
  @Get(':id/payment-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询订单支付状态',
    description: `家长查询订单支付状态，需要 PARENT 角色权限。

**查询逻辑：**
- 如果订单已是 PAID 状态，直接返回支付成功
- 如果订单是 PENDING 状态，主动查询微信支付 API
- 根据微信返回状态更新订单并返回结果

**频率限制：**
- 同一订单每分钟最多查询 10 次
- 超过限制返回 429 状态码

**支付状态：**
- **PAID**: 支付成功，包含支付时间、金额、交易号
- **PENDING**: 支付处理中，请稍后查询
- **CANCELLED**: 支付失败或已关闭
- **REFUNDED**: 订单已退款
- **COMPLETED**: 订单已完成`,
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
      oneOf: [
        {
          example: {
            data: {
              orderId: 1,
              orderNo: 'ORD20240114123456789',
              status: 'PAID',
              paidAt: '2024-01-14T12:30:00Z',
              paidAmount: '299.00',
              transactionId: 'wx1234567890',
            },
          },
          description: '支付成功',
        },
        {
          example: {
            data: {
              status: 'PENDING',
              message: '支付处理中，请稍后查询',
            },
          },
          description: '支付中',
        },
        {
          example: {
            data: {
              orderId: 1,
              orderNo: 'ORD20240114123456789',
              status: 'CANCELLED',
              message: '支付失败',
            },
          },
          description: '支付失败',
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: '订单不存在',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（订单不属于当前用户）',
  })
  @ApiResponse({
    status: 429,
    description: '查询频率超限（每分钟最多 10 次）',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async getPaymentStatus(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      throw new HttpException('Invalid order ID', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log(
        `Querying payment status for user ${user.id}, order ${orderId}`,
      );

      // 检查频率限制
      const isRateLimited = await this.ordersService.checkPaymentQueryRateLimit(orderId);

      if (isRateLimited) {
        // 添加 Retry-After 响应头（60 秒后可重试）
        response.setHeader('Retry-After', '60');
        throw new HttpException(
          '查询频率超限，请稍后重试',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const result = await this.ordersService.checkPaymentStatus(orderId, user.id);

      return { data: result };
    } catch (error) {
      this.logger.error(
        `Failed to query payment status for user ${user.id}, order ${orderId}:`,
        error,
      );
      throw error;
    }
  }
}
