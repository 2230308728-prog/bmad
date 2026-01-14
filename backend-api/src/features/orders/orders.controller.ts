import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
}
