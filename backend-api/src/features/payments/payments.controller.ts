import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiHeader } from '@nestjs/swagger';
import { Role, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma.service';
import { WechatPayService } from './wechat-pay.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Payments Controller
 * 处理支付相关的 HTTP 请求
 * 所有端点都需要 PARENT 角色权限
 */
@ApiTags('payments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PARENT)
@Controller('v1/orders')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 初始化支付（创建 JSAPI 支付订单）
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param orderId 订单 ID
   * @param createPaymentDto 支付初始化 DTO
   * @returns JSAPI 支付参数
   */
  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '初始化支付',
    description: '为指定订单创建支付，返回 JSAPI 支付参数。需要 PARENT 角色权限。',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiParam({
    name: 'id',
    description: '订单 ID',
    type: Number,
    example: 1,
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 200,
    description: '支付初始化成功',
    schema: {
      example: {
        data: {
          timeStamp: '1645123456',
          nonceStr: 'abc123',
          package: 'prepay_id=wx1234567890',
          signType: 'RSA',
          paySign: 'signature...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败（订单不存在、订单不属于当前用户、订单状态不是 PENDING）',
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
    status: 404,
    description: '订单不存在',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误（微信支付服务不可用）',
  })
  async createPayment(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    try {
      this.logger.log(
        `Creating payment for order ${orderId} by user ${user.id}, openid: ${createPaymentDto.openid}`,
      );

      // 1. 验证订单存在且属于当前用户
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          userId: user.id,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new BadRequestException('订单不存在或不属于当前用户');
      }

      // 2. 验证订单状态为 PENDING（待支付）
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('订单状态不正确，无法支付');
      }

      // 3. 验证支付服务可用
      if (!this.wechatPayService.isAvailable()) {
        throw new BadRequestException('支付服务暂时不可用，请稍后重试');
      }

      // 4. 调用微信支付统一下单 API
      // 金额单位：分（需要将元转为分）
      const totalAmountInCents = Prisma.Decimal.mul(order.totalAmount, 100).toNumber();
      const totalAmountInCentsInt = Math.round(totalAmountInCents);

      // 生成商品描述（使用产品名称快照，如果是多个产品则显示"多个产品"）
      const description =
        order.items.length === 1
          ? order.items[0].productName
          : `${order.items.length}个产品`;

      const prepayId = await this.wechatPayService.createJsapiOrder(
        description,
        order.orderNo,
        totalAmountInCentsInt,
        createPaymentDto.openid,
      );

      // 5. 生成 JSAPI 支付参数
      const jsapiParams = this.wechatPayService.generateJsapiParams(prepayId);

      this.logger.log(`Payment created successfully for order ${orderId}, prepayId: ${prepayId}`);

      return { data: jsapiParams };
    } catch (error) {
      this.logger.error(
        `Failed to create payment for order ${orderId}: ${(error as Error).message}`,
        error,
      );
      throw error;
    }
  }
}
