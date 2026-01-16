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
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryRefundsDto } from './dto/query-refunds.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Refunds Controller
 * 处理家长端退款申请相关的 HTTP 请求
 * 所有端点都需要 PARENT 角色权限
 */
@ApiTags('refunds')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PARENT)
@Controller('v1/refunds')
export class RefundsController {
  private readonly logger = new Logger(RefundsController.name);

  constructor(private readonly refundsService: RefundsService) {}

  /**
   * 创建退款申请
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param createRefundDto 创建退款申请 DTO
   * @returns 创建的退款信息
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建退款申请',
    description: `家长为已支付订单申请退款，需要 PARENT 角色权限。

**验证规则：**
- 订单必须存在且属于当前用户
- 订单状态必须为 PAID（已支付）
- 订单不能有进行中的退款申请（PENDING 或 PROCESSING 状态）
- 必须在活动开始前 48 小时以上申请退款

**业务流程：**
1. 验证订单存在性和所有权
2. 验证订单状态和退款条件
3. 生成退款编号（格式：REF + YYYYMMDD + 8位随机数）
4. 创建退款记录（状态为 PENDING）
5. 更新订单的退款申请时间`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({ type: CreateRefundDto })
  @ApiResponse({
    status: 201,
    description: '退款申请创建成功',
    schema: {
      example: {
        data: {
          id: 1,
          refundNo: 'REF20240114123456789',
          status: 'PENDING',
          refundAmount: '299.00',
          appliedAt: '2024-01-14T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      '请求参数验证失败或业务规则违反（订单状态不允许退款、已有进行中退款、超过退款期限）',
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
    description: '服务器内部错误',
  })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() createRefundDto: CreateRefundDto,
  ) {
    try {
      this.logger.log(
        `Creating refund for user ${user.id}: orderId=${createRefundDto.orderId}`,
      );

      const result = await this.refundsService.create(user.id, createRefundDto);

      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to create refund for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * 查询退款列表
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param queryDto 查询参数
   * @returns 分页退款列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询退款列表',
    description: `家长查询自己的退款申请列表，需要 PARENT 角色权限。

**功能特性：**
- 按申请时间倒序返回退款列表（最新申请在前）
- 支持分页查询（默认第 1 页，每页 10 条）
- 只返回当前用户的退款申请

**分页参数：**
- page: 页码（默认 1，最小 1）
- pageSize: 每页数量（默认 10，范围 1-20）`,
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
            refundNo: 'REF20240114123456789',
            status: 'PENDING',
            refundAmount: '299.00',
            reason: '行程有变，无法参加',
            appliedAt: '2024-01-14T12:00:00Z',
          },
          {
            id: 2,
            refundNo: 'REF20240113987654321',
            status: 'COMPLETED',
            refundAmount: '199.00',
            reason: '时间冲突',
            appliedAt: '2024-01-13T10:30:00Z',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败（page、pageSize 无效）',
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
  async findAll(
    @CurrentUser() user: CurrentUserType,
    @Query() queryDto: QueryRefundsDto,
  ) {
    try {
      this.logger.log(
        `Querying refunds for user ${user.id}: page=${queryDto.page}, pageSize=${queryDto.pageSize}`,
      );

      const result = await this.refundsService.findAll(user.id, queryDto);

      return result;
    } catch (error) {
      this.logger.error(`Failed to query refunds for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * 查询退款详情
   * @param user 当前用户（从 JWT 令牌中提取）
   * @param id 退款 ID
   * @returns 退款详情
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询退款详情',
    description: `家长查询单个退款申请的详细信息，需要 PARENT 角色权限。

**返回信息：**
- 退款基本信息（退款单号、状态、金额、原因）
- 退款详细说明和凭证图片
- 审批信息（审批时间、管理员备注、拒绝原因）
- 关联订单信息（订单号、状态、金额、预订日期）
- 关联产品信息（产品名称、图片）

**权限验证：**
- 只能查询自己的退款申请
- 退款记录不存在或不属于当前用户时返回 404`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiParam({
    name: 'id',
    description: '退款 ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        data: {
          id: 1,
          refundNo: 'REF20240114123456789',
          status: 'PENDING',
          refundAmount: '299.00',
          reason: '行程有变，无法参加',
          description: '由于孩子临时生病，需要请假复诊，无法参加预订的活动',
          images: ['https://oss.example.com/refunds/proof1.jpg'],
          appliedAt: '2024-01-14T12:00:00Z',
          approvedAt: null,
          adminNote: null,
          rejectedReason: null,
          refundedAt: null,
          order: {
            id: 1,
            orderNo: 'ORD20240114123456789',
            status: 'PAID',
            totalAmount: '299.00',
            bookingDate: '2024-02-15',
          },
          product: {
            id: 1,
            title: '上海科技馆探索之旅',
            images: ['https://oss.example.com/products/1/image1.jpg'],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效（退款 ID 格式错误）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（退款记录不属于当前用户）',
  })
  @ApiResponse({
    status: 404,
    description: '退款记录不存在',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async findOne(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      this.logger.log(
        `Querying refund detail for user ${user.id}, refund ${id}`,
      );

      const result = await this.refundsService.findOne(id, user.id);

      return { data: result };
    } catch (error) {
      this.logger.error(
        `Failed to query refund detail for user ${user.id}, refund ${id}:`,
        error,
      );
      throw error;
    }
  }
}
