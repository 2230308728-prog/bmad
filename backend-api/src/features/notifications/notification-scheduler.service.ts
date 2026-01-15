import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { OrderStatus } from '@prisma/client';

/**
 * 通知定时任务服务
 * 处理定期执行的通知任务（如出行提醒）
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 每天上午 10:00 执行出行提醒任务
   *
   * 查询明天出行的订单（booking_date = 明天，status = PAID）
   * 向已订阅出行提醒的用户发送通知
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleTravelReminders() {
    this.logger.log('开始执行出行提醒任务');

    try {
      // 计算明天的日期范围（从 00:00:00 到 23:59:59）
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      this.logger.log(
        `查询明天出行的订单: ${tomorrow.toISOString()} - ${tomorrowEnd.toISOString()}`,
      );

      // 查询明天出行的已支付订单
      const orders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PAID,
          bookingDate: {
            gte: tomorrow,
            lte: tomorrowEnd,
          },
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              openid: true,
            },
          },
        },
      });

      this.logger.log(`找到 ${orders.length} 个明天出行的订单`);

      let successCount = 0;
      let failureCount = 0;

      // 遍历订单，发送出行提醒通知
      for (const order of orders) {
        try {
          const firstItem = order.items[0];
          if (!firstItem) {
            this.logger.warn(`订单 ${order.orderNo} 没有订单项，跳过`);
            continue;
          }

          // 获取产品信息
          const product = await this.prisma.product.findUnique({
            where: { id: firstItem.productId },
            select: {
              title: true,
              location: true,
            },
          });

          if (!product) {
            this.logger.warn(
              `产品不存在: productId=${firstItem.productId}, 跳过`,
            );
            continue;
          }

          // 发送出行提醒通知
          const success = await this.notificationsService.sendTravelReminderNotification(
            order.userId,
            product.title,
            order.bookingDate || tomorrow,
            '09:00', // 默认出行时间（实际应从产品配置获取）
            product.location,
            product.location, // 集合地点默认为活动地点（实际应从产品配置获取）
            '客服电话：400-123-4567', // 联系方式（实际应从系统配置获取）
            '请携带好身份证件，提前15分钟到达集合地点', // 温馨提示
          );

          if (success) {
            successCount++;
            this.logger.log(
              `出行提醒发送成功: orderNo=${order.orderNo}, userId=${order.userId}`,
            );
          } else {
            failureCount++;
            this.logger.warn(
              `出行提醒发送失败: orderNo=${order.orderNo}, userId=${order.userId}`,
            );
          }
        } catch (error) {
          failureCount++;
          this.logger.error(
            `处理订单 ${order.orderNo} 出行提醒失败: ${(error as Error).message}`,
            error,
          );
        }
      }

      this.logger.log(
        `出行提醒任务完成: 成功 ${successCount}, 失败 ${failureCount}, 总计 ${orders.length}`,
      );
    } catch (error) {
      this.logger.error(
        `执行出行提醒任务失败: ${(error as Error).message}`,
        error,
      );
    }
  }
}
