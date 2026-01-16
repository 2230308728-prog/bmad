import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminIssuesService } from './admin-issues.service';
import { QueryIssuesDto } from './dto/admin/query-issues.dto';
import { CreateIssueDto } from './dto/admin/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/admin/update-issue-status.dto';
import { IssueResponseDto } from './dto/admin/issue-response.dto';
import { IssueListResponseDto } from './dto/admin/issue-list-response.dto';
import { IssueStatsResponseDto } from './dto/admin/issue-stats-response.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  type CurrentUserType,
} from '@/common/decorators/current-user.decorator';

/**
 * 管理员问题控制器
 * 处理管理员视角的问题查询、创建、状态更新和统计功能
 */
@ApiTags('Admin Issues')
@ApiBearerAuth()
@Controller('admin/issues')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminIssuesController {
  private readonly logger = new Logger(AdminIssuesController.name);

  constructor(private readonly adminIssuesService: AdminIssuesService) {}

  /**
   * 查询问题列表（管理员视角）
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询问题列表（管理员）',
    description: `管理员查询平台上的所有问题，支持多条件筛选和优先级排序。

**功能特性：**
- 按优先级排序（URGENT > HIGH > MEDIUM > LOW）
- 同优先级按创建时间倒序
- 支持分页查询（默认第 1 页，每页 20 条，最多 50 条/页）
- 支持状态筛选（OPEN、IN_PROGRESS、RESOLVED、CLOSED）
- 支持类型筛选（COMPLAINT、QUESTION、SUGGESTION、REFUND_REQUEST）
- 支持优先级筛选（LOW、MEDIUM、HIGH、URGENT）
- 支持用户 ID 筛选
- 支持分配管理员筛选
- 包含用户、订单、分配管理员信息

**数据权限：**
- 管理员可以查看所有问题
- 用户手机号脱敏显示（保留前3位和后4位）`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: '页码' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: 20,
    description: '每页数量',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    description: '状态筛选',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['COMPLAINT', 'QUESTION', 'SUGGESTION', 'REFUND_REQUEST'],
    description: '类型筛选',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    description: '优先级筛选',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    example: 1,
    description: '用户 ID 筛选',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    example: 2,
    description: '分配管理员筛选',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: IssueListResponseDto,
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
    @Query(ValidationPipe) queryDto: QueryIssuesDto,
  ): Promise<IssueListResponseDto> {
    try {
      this.logger.log(
        `Admin ${user.id} querying issues with filters: ${JSON.stringify(queryDto)}`,
      );
      const result = await this.adminIssuesService.findIssues(queryDto);
      return result;
    } catch (error) {
      this.logger.error(`Failed to query issues for admin ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * 获取问题统计数据
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取问题统计数据（管理员）',
    description: `获取平台问题的统计数据，包括：

**统计指标：**
- total: 总问题数
- open: 待处理问题数
- inProgress: 处理中的问题数
- resolved: 已解决问题数
- closed: 已关闭问题数
- urgent: 紧急问题数（OPEN + IN_PROGRESS）
- high: 高优先级问题数（OPEN + IN_PROGRESS）
- avgResolutionTime: 平均解决时间（小时）
- todayCreated: 今日新增问题数

**数据用途：**
- 管理后台仪表盘展示
- 问题概览和趋势分析
- 客服工作量评估

**缓存策略：**
- 统计结果缓存 5 分钟
- 问题状态变更时自动清除缓存`,
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
    type: IssueStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async getStats(
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ data: IssueStatsResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} querying issue stats`);
      const result = await this.adminIssuesService.getIssueStats();
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to query issue stats:`, error);
      throw error;
    }
  }

  /**
   * 创建问题
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建问题（管理员）',
    description: `管理员为用户创建问题记录。

**业务逻辑：**
- 验证用户存在
- 验证订单存在（如果提供 orderId）
- 问题状态默认为 OPEN
- 优先级默认为 MEDIUM

**用途：**
- 客服接收用户反馈后创建问题记录
- 将线下投诉数字化记录
- 问题跟踪和处理管理`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({ type: CreateIssueDto })
  @ApiResponse({
    status: 201,
    description: '创建成功',
    type: IssueResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败',
  })
  @ApiResponse({
    status: 404,
    description: '用户或订单不存在',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body(ValidationPipe) createDto: CreateIssueDto,
  ): Promise<{ data: IssueResponseDto }> {
    try {
      this.logger.log(
        `Admin ${user.id} creating issue for user ${createDto.userId}`,
      );
      const result = await this.adminIssuesService.createIssue(createDto);
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to create issue:`, error);
      throw error;
    }
  }

  /**
   * 更新问题状态
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新问题状态（管理员）',
    description: `管理员更新问题状态、分配管理员或添加解决方案。

**状态转换规则：**
- OPEN → IN_PROGRESS → RESOLVED → CLOSED
- RESOLVED → IN_PROGRESS（重新处理）
- 任何状态 → CLOSED（直接关闭）
- CLOSED 不能变更状态

**业务规则：**
- 状态变更为 RESOLVED 或 CLOSED 时必须提供解决方案（resolution）
- 状态变更为 RESOLVED 或 CLOSED 时自动记录解决时间（resolved_at）
- 可以分配或更换处理管理员（assigned_to）

**用途：**
- 更新问题处理进度
- 分配问题给特定管理员
- 记录问题和解决方案`,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer JWT 令牌（访问令牌）',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({ type: UpdateIssueStatusDto })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: IssueResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败或非法的状态转换',
  })
  @ApiResponse({
    status: 404,
    description: '问题不存在',
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
    @Body(ValidationPipe) updateDto: UpdateIssueStatusDto,
  ): Promise<{ data: IssueResponseDto }> {
    try {
      this.logger.log(`Admin ${user.id} updating issue ${id} status`);
      const result = await this.adminIssuesService.updateIssueStatus(
        id,
        updateDto,
      );
      return { data: result };
    } catch (error) {
      this.logger.error(`Failed to update issue ${id} status:`, error);
      throw error;
    }
  }
}
