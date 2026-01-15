import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma.service';
import { CacheService } from '@/redis/cache.service';
import { QueryIssuesDto } from './dto/admin/query-issues.dto';
import { CreateIssueDto } from './dto/admin/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/admin/update-issue-status.dto';
import { IssueResponseDto } from './dto/admin/issue-response.dto';
import { IssueStatsResponseDto } from './dto/admin/issue-stats-response.dto';
import { IssueStatus, IssuePriority, IssueType, Prisma } from '@prisma/client';

/**
 * 管理员问题服务
 * 处理管理员视角的问题查询、创建、状态更新和统计功能
 */
@Injectable()
export class AdminIssuesService {
  private readonly logger = new Logger(AdminIssuesService.name);
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes

  // 优先级权重映射（用于排序）
  private readonly PRIORITY_WEIGHT = {
    [IssuePriority.URGENT]: 4,
    [IssuePriority.HIGH]: 3,
    [IssuePriority.MEDIUM]: 2,
    [IssuePriority.LOW]: 1,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 查询问题列表（管理员视角）
   * @param queryDto 查询参数
   * @returns 分页问题列表
   */
  async findIssues(queryDto: QueryIssuesDto) {
    this.logger.log(`Admin querying issues with filters: ${JSON.stringify({
      ...queryDto,
      // 不记录敏感信息
    })}`);

    const {
      page = 1,
      pageSize = 20,
      status,
      type,
      priority,
      userId,
      assignedTo,
    } = queryDto;

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建 WHERE 条件
    const where: Prisma.UserIssueWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (userId) {
      where.userId = userId;
    }

    if (assignedTo !== undefined) {
      where.assignedTo = assignedTo;
    }

    // 并行查询问题和总数
    const [issues, total] = await Promise.all([
      this.prisma.userIssue.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true,
              avatarUrl: true,
            },
          },
          order: {
            select: {
              orderNo: true,
            },
          },
          assignee: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      }),
      this.prisma.userIssue.count({ where }),
    ]);

    // 应用优先级排序（自定义排序逻辑）
    const sortedIssues = this.sortByPriority(issues);

    // 转换为响应 DTO 格式
    const data = sortedIssues.map((issue) => this.mapToIssueResponseDto(issue));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 创建问题
   * @param createDto 创建请求
   * @returns 创建的问题详情
   */
  async createIssue(createDto: CreateIssueDto): Promise<IssueResponseDto> {
    const { userId, orderId, type, title, description, priority } = createDto;

    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }

    // 验证订单存在（如果提供）
    if (orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException(`订单 ${orderId} 不存在`);
      }
    }

    // 创建问题
    const issue = await this.prisma.userIssue.create({
      data: {
        userId,
        orderId,
        type,
        title,
        description,
        priority: priority ?? IssuePriority.MEDIUM,
        status: IssueStatus.OPEN,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true,
            avatarUrl: true,
          },
        },
        order: {
          select: {
            orderNo: true,
          },
        },
        assignee: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    this.logger.log(`Issue created: ${issue.id} by admin for user ${userId}`);

    return this.mapToIssueResponseDto(issue);
  }

  /**
   * 更新问题状态
   * @param id 问题 ID
   * @param updateDto 更新请求
   * @returns 更新后的问题详情
   */
  async updateIssueStatus(
    id: number,
    updateDto: UpdateIssueStatusDto,
  ): Promise<IssueResponseDto> {
    const { status, assignedTo, resolution } = updateDto;

    // 验证问题存在
    const existingIssue = await this.prisma.userIssue.findUnique({
      where: { id },
    });

    if (!existingIssue) {
      throw new NotFoundException(`问题 ${id} 不存在`);
    }

    // 状态转换验证
    if (status) {
      this.validateStatusTransition(existingIssue.status, status);
    }

    // 验证 RESOLVED/CLOSED 必须提供 resolution
    const newStatus = status || existingIssue.status;
    if ((newStatus === IssueStatus.RESOLVED || newStatus === IssueStatus.CLOSED) && !resolution) {
      throw new BadRequestException('状态变更为 RESOLVED 或 CLOSED 时必须提供解决方案（resolution）');
    }

    // 准备更新数据
    const updateData: Prisma.UserIssueUpdateInput = {};

    if (status) {
      updateData.status = status;
    }

    if (assignedTo !== undefined) {
      updateData.assignee = { connect: { id: assignedTo } };
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution;
    }

    // 如果状态变更为 RESOLVED 或 CLOSED，设置 resolved_at
    if (status && (status === IssueStatus.RESOLVED || status === IssueStatus.CLOSED)) {
      updateData.resolvedAt = new Date();
    }

    // 更新问题
    const updatedIssue = await this.prisma.userIssue.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true,
            avatarUrl: true,
          },
        },
        order: {
          select: {
            orderNo: true,
          },
        },
        assignee: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    // 清除缓存
    await this.clearStatsCache();

    this.logger.log(`Issue ${id} status updated to ${newStatus}`);

    return this.mapToIssueResponseDto(updatedIssue);
  }

  /**
   * 获取问题统计
   * @returns 问题统计数据
   */
  async getIssueStats(): Promise<IssueStatsResponseDto> {
    this.logger.log('Admin querying issue stats');

    // 尝试从缓存获取
    const cacheKey = 'issue:stats';
    const cached = await this.cacheService.get<IssueStatsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug('Issue stats cache hit');
      return cached;
    }

    // 并行查询统计数据
    const [
      statusStats,
      priorityStats,
      resolvedIssues,
      todayIssues,
      total,
    ] = await Promise.all([
      // 各状态问题数量
      this.prisma.userIssue.groupBy({
        by: ['status'],
        _count: true,
      }),
      // 各优先级问题数量
      this.prisma.userIssue.groupBy({
        by: ['priority'],
        _count: true,
        where: {
          status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
        },
      }),
      // 已解决问题（用于计算平均解决时间）
      this.prisma.userIssue.findMany({
        where: {
          status: { in: [IssueStatus.RESOLVED, IssueStatus.CLOSED] },
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      }).then((issues) =>
        issues.map((issue) => ({
          createdAt: issue.createdAt,
          resolvedAt: issue.resolvedAt!,
        })),
      ),
      // 今日新增问题
      this.prisma.userIssue.count({
        where: {
          createdAt: {
            gte: this.getTodayStart(),
          },
        },
      }),
      // 总问题数
      this.prisma.userIssue.count(),
    ]);

    // 构建统计结果
    const stats: IssueStatsResponseDto = {
      total,
      open: this.getCountByStatus(statusStats, IssueStatus.OPEN),
      inProgress: this.getCountByStatus(statusStats, IssueStatus.IN_PROGRESS),
      resolved: this.getCountByStatus(statusStats, IssueStatus.RESOLVED),
      closed: this.getCountByStatus(statusStats, IssueStatus.CLOSED),
      urgent: this.getCountByPriority(priorityStats, IssuePriority.URGENT),
      high: this.getCountByPriority(priorityStats, IssuePriority.HIGH),
      avgResolutionTime: this.calculateAvgResolutionTime(resolvedIssues),
      todayCreated: todayIssues,
    };

    // 缓存统计结果
    await this.cacheService.set(cacheKey, stats, this.CACHE_TTL_SECONDS);

    return stats;
  }

  /**
   * 按优先级排序问题
   * 优先级从高到低：URGENT > HIGH > MEDIUM > LOW
   * 同优先级按创建时间倒序
   */
  private sortByPriority(issues: { priority: IssuePriority; createdAt: Date }[]): any[] {
    return issues.sort((a, b) => {
      const weightA = this.PRIORITY_WEIGHT[a.priority as keyof typeof this.PRIORITY_WEIGHT];
      const weightB = this.PRIORITY_WEIGHT[b.priority as keyof typeof this.PRIORITY_WEIGHT];

      // 优先级高的在前
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // 同优先级按创建时间倒序
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * 将 Prisma 模型映射为响应 DTO
   */
  private mapToIssueResponseDto(issue: any): IssueResponseDto {
    return {
      id: issue.id,
      userId: issue.userId,
      orderId: issue.orderId,
      orderNo: issue.order?.orderNo || null,
      type: issue.type,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      assignedTo: issue.assignedTo,
      assignedToName: issue.assignee?.nickname || null,
      resolution: issue.resolution,
      resolvedAt: issue.resolvedAt,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      userName: issue.user.nickname,
      userPhone: issue.user.phone ? this.maskPhone(issue.user.phone) : null,
      userAvatarUrl: issue.user.avatarUrl,
    };
  }

  /**
   * 脱敏手机号
   * 对无效的手机号返回空字符串以避免泄露原始数据
   */
  private maskPhone(phone: string): string {
    if (!phone || typeof phone !== 'string' || phone.length < 7) {
      return '';  // 返回空字符串而非原始值，避免泄露数据
    }
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  /**
   * 验证状态转换是否合法
   */
  private validateStatusTransition(currentStatus: IssueStatus, newStatus: IssueStatus): void {
    const validTransitions: Record<IssueStatus, IssueStatus[]> = {
      [IssueStatus.OPEN]: [IssueStatus.IN_PROGRESS, IssueStatus.CLOSED],
      [IssueStatus.IN_PROGRESS]: [IssueStatus.OPEN, IssueStatus.RESOLVED, IssueStatus.CLOSED],
      [IssueStatus.RESOLVED]: [IssueStatus.IN_PROGRESS, IssueStatus.CLOSED],
      [IssueStatus.CLOSED]: [], // 已关闭不能变更状态
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `非法的状态转换：${currentStatus} -> ${newStatus}`,
      );
    }
  }

  /**
   * 从状态统计中获取指定状态的计数
   */
  private getCountByStatus(stats: { status: IssueStatus; _count: number }[], status: IssueStatus): number {
    const stat = stats.find((s) => s.status === status);
    return stat?._count || 0;
  }

  /**
   * 从优先级统计中获取指定优先级的计数
   */
  private getCountByPriority(
    stats: { priority: IssuePriority; _count: number }[],
    priority: IssuePriority,
  ): number {
    const stat = stats.find((s) => s.priority === priority);
    return stat?._count || 0;
  }

  /**
   * 计算平均解决时间
   */
  private calculateAvgResolutionTime(resolvedIssues: { createdAt: Date; resolvedAt: Date }[]): string {
    if (resolvedIssues.length === 0) {
      return '0小时';
    }

    const totalHours = resolvedIssues.reduce((sum, issue) => {
      const resolvedAt = issue.resolvedAt!.getTime();
      const createdAt = issue.createdAt.getTime();
      const diffHours = (resolvedAt - createdAt) / (1000 * 60 * 60);
      return sum + diffHours;
    }, 0);

    const avgHours = Math.round(totalHours / resolvedIssues.length);
    return `${avgHours}小时`;
  }

  /**
   * 获取今天开始时间（00:00:00）
   */
  private getTodayStart(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  /**
   * 清除统计数据缓存
   */
  private async clearStatsCache(): Promise<void> {
    try {
      await this.cacheService.del('issue:stats');
      this.logger.debug('Issue stats cache cleared');
    } catch (error) {
      this.logger.warn('Failed to clear issue stats cache:', error);
    }
  }
}
