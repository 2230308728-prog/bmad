import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryRefundsDto } from './dto/query-refunds.dto';
import { RefundStatus, OrderStatus, Order } from '@prisma/client';

// 48小时（毫秒）
const REFUND_DEADLINE_HOURS = 48;
const REFUND_DEADLINE_MS = REFUND_DEADLINE_HOURS * 60 * 60 * 1000;

// 退款编号重试次数
const REFUND_NO_MAX_RETRIES = 3;

// Order 类型扩展（包含 bookingDate）
type OrderWithBookingDate = Order & {
  bookingDate: Date | null;
};

/**
 * Refunds Service
 * 处理家长端退款申请的业务逻辑
 */
@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 创建退款申请
   * @param userId 用户 ID
   * @param dto 创建退款申请 DTO
   * @returns 创建的退款信息
   */
  async create(userId: number, dto: CreateRefundDto) {
    const { orderId, reason, description, images } = dto;

    // 1. 验证订单存在且属于当前用户
    const order = (await this.prisma.order.findUnique({
      where: { id: orderId },
    })) as OrderWithBookingDate | null;

    if (!order) {
      this.logger.warn(`退款申请失败: 订单不存在`);
      throw new NotFoundException('订单不存在');
    }

    if (order.userId !== userId) {
      this.logger.warn(`退款申请失败: 无权访问该订单`);
      throw new ForbiddenException('无权访问此订单');
    }

    // 2. 验证订单状态为 PAID
    if (order.status !== OrderStatus.PAID) {
      this.logger.warn(`退款申请失败: 订单状态不允许退款`);
      throw new BadRequestException('订单状态不允许退款');
    }

    // 3. 检查是否已有进行中的退款（PENDING 或 PROCESSING 状态）
    const existingRefund = await this.prisma.refundRecord.findFirst({
      where: {
        orderId,
        status: {
          in: [RefundStatus.PENDING, RefundStatus.PROCESSING],
        },
      },
    });

    if (existingRefund) {
      this.logger.warn(`退款申请失败: 订单已有进行中的退款`);
      throw new BadRequestException(
        `该订单已有进行中的退款申请（退款单号: ${existingRefund.refundNo}）`,
      );
    }

    // 4. 验证退款时间限制（活动开始前 48 小时内不可退款）
    // MEDIUM #8: 如果订单没有预订日期，则不允许退款（明确的业务规则）
    if (!order.bookingDate) {
      this.logger.warn(`退款申请失败: 订单缺少预订日期信息`);
      throw new BadRequestException('订单缺少预订日期信息，暂时无法申请退款');
    }

    const now = new Date();
    const bookingDate = new Date(order.bookingDate);
    const timeUntilBooking = bookingDate.getTime() - now.getTime();

    if (timeUntilBooking < REFUND_DEADLINE_MS) {
      this.logger.warn(`退款申请失败: 已超过退款期限`);
      throw new BadRequestException(
        '已超过退款期限（活动开始前 48 小时内不可退款）',
      );
    }

    // 5-6. 生成退款编号（带重试机制）和使用事务创建退款记录
    let refundNo: string;
    let refundCreated = false;
    let lastError: any = null;

    for (let attempt = 0; attempt < REFUND_NO_MAX_RETRIES; attempt++) {
      refundNo = this.generateRefundNo(userId, orderId);

      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // 创建退款记录
          const refund = await tx.refundRecord.create({
            data: {
              refundNo,
              orderId,
              userId,
              amount: order.actualAmount,
              reason,
              description,
              images: images || [],
              status: RefundStatus.PENDING,
              appliedBy: userId,
            },
          });

          // 更新订单的退款申请时间
          await tx.order.update({
            where: { id: orderId },
            data: {
              refundRequestAt: new Date(),
            },
          });

          return refund;
        });

        refundCreated = true;

        this.logger.log(`退款申请创建成功: refundNo=${refundNo}`);

        // 7. 清除相关 Redis 缓存
        // MEDIUM #7: 清除缓存时不使用通配符，只清除当前用户的订单列表缓存
        try {
          await this.cacheService.del(`order:${orderId}`);
          await this.cacheService.del(`order:user:${userId}:list`);
          this.logger.log(`已清除订单相关缓存`);
        } catch (error) {
          this.logger.error(`清除缓存失败:`, error);
          // 缓存清除失败不影响退款创建操作
        }

        // 8. 返回退款信息
        return {
          id: result.id,
          refundNo: result.refundNo,
          status: result.status,
          refundAmount: result.amount.toString(),
          appliedAt: result.createdAt.toISOString(),
        };
      } catch (error: any) {
        lastError = error;
        // 如果是唯一约束冲突（退款编号重复），重试
        if (error.code === 'P2002' && attempt < REFUND_NO_MAX_RETRIES - 1) {
          this.logger.warn(`退款编号冲突，重试生成: attempt=${attempt + 1}`);
          continue;
        }
        throw error;
      }
    }

    // 如果所有重试都失败，抛出最后一个错误
    this.logger.error(`退款申请创建失败:`, lastError);
    throw lastError;
  }

  /**
   * 生成唯一退款编号
   * 格式：REF + YYYYMMDD + userId后4位 + orderId后4位 + 4位随机数
   * 包含 userId 和 orderId 以确保唯一性和可追溯性
   * @param userId 用户 ID
   * @param orderId 订单 ID
   * @returns 退款编号
   */
  private generateRefundNo(userId: number, orderId: number): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const userSuffix = String(userId).slice(-4).padStart(4, '0'); // userId 后 4 位
    const orderSuffix = String(orderId).slice(-4).padStart(4, '0'); // orderId 后 4 位
    const random = Math.random().toString(10).substring(2, 6).padEnd(4, '0'); // 4 位随机数
    return `REF${date}${userSuffix}${orderSuffix}${random}`;
  }

  /**
   * 查询用户退款列表
   * @param userId 用户 ID
   * @param queryDto 查询参数
   * @returns 分页退款列表
   */
  async findAll(userId: number, queryDto: QueryRefundsDto) {
    const { page = 1, pageSize = 10 } = queryDto;

    // 计算分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 并行查询退款数据和总数
    const [refunds, total] = await Promise.all([
      this.prisma.refundRecord.findMany({
        where: {
          userId,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }, // 按创建时间降序排序
      }),
      this.prisma.refundRecord.count({
        where: {
          userId,
        },
      }),
    ]);

    // 构建响应数据
    const data = refunds.map((refund) => ({
      id: refund.id,
      refundNo: refund.refundNo,
      status: refund.status,
      refundAmount: refund.amount.toString(),
      reason: refund.reason,
      appliedAt: refund.createdAt.toISOString(), // createdAt maps to appliedAt in response
    }));

    // MEDIUM #5: 保持与 API 契约一致，直接返回分页格式（data 在顶层）
    // 根据故事文档的 API 设计约定（第 135 行）："分页格式 { data: [], total, page, pageSize }"
    // 此处直接返回该格式，与 create 和 findOne 端点一致
    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询退款详情
   * @param refundId 退款 ID
   * @param userId 当前用户 ID
   * @returns 退款详情
   */
  async findOne(refundId: number, userId: number) {
    // MEDIUM #6: 使用单次查询同时获取退款、订单和产品信息（修复 N+1 问题）
    const refund = await this.prisma.refundRecord.findFirst({
      where: {
        id: refundId,
      },
      include: {
        order: {
          include: {
            items: {
              take: 1,
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!refund) {
      this.logger.warn(`退款记录不存在: refundId=${refundId}`);
      throw new NotFoundException('退款记录不存在');
    }

    if (refund.userId !== userId) {
      this.logger.warn(
        `退款记录不属于当前用户: refundId=${refundId}, userId=${userId}, refundUserId=${refund.userId}`,
      );
      throw new ForbiddenException('无权访问此退款记录');
    }

    // 获取订单和产品信息（从单次查询结果中提取）
    const order = refund.order as any;
    const firstItem = (order.items || [])[0];
    const product = firstItem?.product || null;

    // 构建响应数据
    return {
      id: refund.id,
      refundNo: refund.refundNo,
      status: refund.status,
      refundAmount: refund.amount.toString(),
      reason: refund.reason,
      description: refund.description,
      images: refund.images,
      appliedAt: refund.createdAt.toISOString(), // createdAt maps to appliedAt in response
      approvedAt: refund.approvedAt?.toISOString(),
      adminNote: refund.adminNote,
      rejectedReason: refund.rejectedReason,
      refundedAt: refund.refundedAt?.toISOString(),
      order: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        bookingDate: order.bookingDate?.toISOString().split('T')[0] || null,
      },
      product,
    };
  }
}
