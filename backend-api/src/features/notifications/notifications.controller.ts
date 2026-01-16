import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import type { RequestWithUser } from '@/types/request';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { SubscribeNotificationsDto } from './dto/subscribe-notifications.dto';
import { NotificationTemplateResponseDto } from './dto/notification-template-response.dto';
import { NotificationPreferenceResponseDto } from './dto/notification-preference-response.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { NotificationType } from '@prisma/client';

/**
 * 通知管理控制器
 *
 * 提供通知模板查询和用户订阅管理功能
 */
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 获取可用的通知模板列表
   */
  @Get('templates')
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: '获取通知模板列表',
    description: '返回当前用户可订阅的消息模板列表',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取通知模板列表',
    type: [NotificationTemplateResponseDto],
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getNotificationTemplates(): Promise<NotificationTemplateResponseDto[]> {
    this.logger.log('Getting notification templates');

    return [
      {
        type: NotificationType.ORDER_CONFIRM,
        name: '订单确认通知',
        description: '支付成功后发送的订单确认通知',
        templateId: 'ORDER_CONFIRM',
      },
      {
        type: NotificationType.TRAVEL_REMINDER,
        name: '出行提醒通知',
        description: '活动前24小时发送的出行提醒',
        templateId: 'TRAVEL_REMINDER',
      },
      {
        type: NotificationType.REFUND_APPROVED,
        name: '退款批准通知',
        description: '退款申请审核通过时发送',
        templateId: 'REFUND_APPROVED',
      },
      {
        type: NotificationType.REFUND_REJECTED,
        name: '退款拒绝通知',
        description: '退款申请被拒绝时发送',
        templateId: 'REFUND_REJECTED',
      },
      {
        type: NotificationType.REFUND_COMPLETED,
        name: '退款完成通知',
        description: '退款到账后发送',
        templateId: 'REFUND_COMPLETED',
      },
    ];
  }

  /**
   * 订阅通知类型
   */
  @Post('subscribe')
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: '订阅通知类型',
    description: '用户订阅特定类型的消息通知',
  })
  @ApiResponse({
    status: 200,
    description: '成功订阅通知类型',
    type: NotificationPreferenceResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async subscribeNotifications(
    @Request() req: RequestWithUser,
    @Body() subscribeDto: SubscribeNotificationsDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const userId = req.user.userId;
    this.logger.log(
      `User ${userId} subscribing to notifications: ${subscribeDto.notificationTypes.join(', ')}`,
    );

    // 使用 Prisma 的 upsert 操作创建或更新用户订阅偏好
    const preference = await this.notificationsService.updateUserSubscription(
      userId,
      subscribeDto.notificationTypes,
    );

    return {
      userId: preference.userId,
      notificationTypes: preference.notificationTypes,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }

  /**
   * 获取当前用户的订阅偏好
   */
  @Get('preferences')
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: '获取订阅偏好',
    description: '返回当前用户的订阅偏好设置',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取订阅偏好',
    type: NotificationPreferenceResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getNotificationPreferences(
    @Request() req: RequestWithUser,
  ): Promise<NotificationPreferenceResponseDto> {
    const userId = req.user.userId;
    this.logger.log(`Getting notification preferences for user ${userId}`);

    // 获取用户订阅偏好（如果不存在则返回默认空数组）
    const preference =
      await this.notificationsService.getUserSubscription(userId);

    return {
      userId: preference.userId,
      notificationTypes: preference.notificationTypes,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }
}
