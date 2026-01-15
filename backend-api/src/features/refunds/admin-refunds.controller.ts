import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminRefundsService } from './admin-refunds.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AdminQueryRefundsDto,
  AdminPaginatedRefundsResponseDto,
  AdminRefundDetailResponseDto,
  ApproveRefundDto,
  RejectRefundDto,
  RefundStatsResponseDto,
} from './dto/admin';

/**
 * Admin Refunds Controller
 * 管理员退款审核控制器
 */
@ApiTags('Admin Refunds')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/refunds')
export class AdminRefundsController {
  constructor(private readonly adminRefundsService: AdminRefundsService) {}

  /**
   * 查询退款列表（管理员视角）
   */
  @Get()
  @ApiOperation({
    summary: '查询退款列表',
    description: '管理员查询所有退款申请，支持多条件筛选，PENDING 状态优先显示',
  })
  @ApiResponse({
    status: 200,
    description: '返回分页退款列表',
    type: AdminPaginatedRefundsResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足（需要 ADMIN 角色）' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, example: 20, description: '每页数量' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'COMPLETED'], description: '退款状态' })
  @ApiQuery({ name: 'refundNo', required: false, example: 'REF20240114', description: '退款编号（部分匹配）' })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01', description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-31', description: '结束日期' })
  async findAll(
    @Query(ValidationPipe) queryDto: AdminQueryRefundsDto,
  ): Promise<AdminPaginatedRefundsResponseDto> {
    return this.adminRefundsService.findAll(queryDto);
  }

  /**
   * 获取退款统计数据
   * NOTE: This route must be defined before /:id to avoid 'stats' being caught as an id parameter
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取退款统计数据',
    description: '返回退款数量统计（按状态分组）和金额统计',
  })
  @ApiResponse({
    status: 200,
    description: '返回统计数据',
    type: RefundStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足（需要 ADMIN 角色）' })
  async getStats(): Promise<RefundStatsResponseDto> {
    return this.adminRefundsService.getStats();
  }

  /**
   * 查询退款详情（管理员视角）
   */
  @Get(':id')
  @ApiOperation({
    summary: '查询退款详情',
    description: '管理员查询退款完整详情，包含所有用户、订单、支付记录信息（不脱敏）',
  })
  @ApiParam({ name: 'id', example: 1, description: '退款 ID' })
  @ApiResponse({
    status: 200,
    description: '返回完整退款详情',
    type: AdminRefundDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足（需要 ADMIN 角色）' })
  @ApiResponse({ status: 404, description: '退款记录不存在' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminRefundDetailResponseDto> {
    return this.adminRefundsService.findOne(id);
  }

  /**
   * 批准退款
   */
  @Patch(':id/approve')
  @ApiOperation({
    summary: '批准退款',
    description: '管理员批准退款申请，更新退款状态为 APPROVED，订单状态更新为 REFUNDED',
  })
  @ApiParam({ name: 'id', example: 1, description: '退款 ID' })
  @ApiResponse({
    status: 200,
    description: '退款已批准，返回更新后的退款详情',
    type: AdminRefundDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足（需要 ADMIN 角色）' })
  @ApiResponse({ status: 404, description: '退款记录不存在' })
  @ApiResponse({ status: 400, description: '退款状态不允许批准（非 PENDING 状态）' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) approveDto: ApproveRefundDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<AdminRefundDetailResponseDto> {
    return this.adminRefundsService.approve(
      id,
      approveDto.adminNote,
      user.id,
    );
  }

  /**
   * 拒绝退款
   */
  @Patch(':id/reject')
  @ApiOperation({
    summary: '拒绝退款',
    description: '管理员拒绝退款申请，更新退款状态为 REJECTED，订单状态保持 PAID',
  })
  @ApiParam({ name: 'id', example: 1, description: '退款 ID' })
  @ApiResponse({
    status: 200,
    description: '退款已拒绝，返回更新后的退款详情',
    type: AdminRefundDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足（需要 ADMIN 角色）' })
  @ApiResponse({ status: 404, description: '退款记录不存在' })
  @ApiResponse({ status: 400, description: '退款状态不允许拒绝（非 PENDING 状态）或拒绝原因未提供' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) rejectDto: RejectRefundDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<AdminRefundDetailResponseDto> {
    return this.adminRefundsService.reject(
      id,
      rejectDto.rejectedReason,
      user.id,
    );
  }
}
