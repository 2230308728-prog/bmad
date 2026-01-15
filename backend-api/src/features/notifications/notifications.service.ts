import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '@/redis/cache.service';
import { NotificationType } from '@prisma/client';

/**
 * 微信订阅消息通知服务
 *
 * 功能：
 * - 发送订单确认通知
 * - 发送出行提醒通知
 * - 发送退款结果通知
 * - 管理微信 access_token 缓存
 * - 管理用户订阅偏好
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly wechatApiBase = 'https://api.weixin.qq.com';

  // 缓存 TTL 常量（比微信有效期少 200 秒，提前刷新）
  private readonly ACCESS_TOKEN_CACHE_TTL = 7000; // 7000秒 = 1小时56分40秒

  // 微信模板字段键常量
  private readonly TEMPLATE_KEYS = {
    ORDER_NUMBER: 'thing1',
    PRODUCT_NAME: 'thing2',
    BOOKING_DATE: 'date3',
    PARTICIPANT_COUNT: 'number4',
    CONTACT_PHONE: 'phone_number5',
    ORDER_AMOUNT: 'amount6',
    TRAVEL_DATE: 'date2',
    TRAVEL_TIME: 'time3',
    LOCATION: 'thing4',
    MEETING_POINT: 'thing5',
    CONTACT_INFO: 'phone_number6',
    TIPS: 'thing7',
    REFUND_NUMBER: 'thing1',
    REFUND_AMOUNT: 'amount2',
    REFUND_DATE: 'date3',
    REJECTED_REASON: 'thing2',
    CUSTOMER_SERVICE: 'thing3',
  } as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // 消息模板 ID 常量 - 使用 getter 方法确保 configService 已注入
  private get ORDER_CONFIRM_TEMPLATE_ID(): string {
    return this.configService.get<string>('WECHAT_ORDER_CONFIRM_TEMPLATE_ID', '');
  }
  private get TRAVEL_REMINDER_TEMPLATE_ID(): string {
    return this.configService.get<string>('WECHAT_TRAVEL_REMINDER_TEMPLATE_ID', '');
  }
  private get REFUND_APPROVED_TEMPLATE_ID(): string {
    return this.configService.get<string>('WECHAT_REFUND_APPROVED_TEMPLATE_ID', '');
  }
  private get REFUND_REJECTED_TEMPLATE_ID(): string {
    return this.configService.get<string>('WECHAT_REFUND_REJECTED_TEMPLATE_ID', '');
  }
  private get REFUND_COMPLETED_TEMPLATE_ID(): string {
    return this.configService.get<string>('WECHAT_REFUND_COMPLETED_TEMPLATE_ID', '');
  }

  /**
   * 获取微信 access_token（带 Redis 缓存）
   *
   * access_token 有效期为 7200 秒（2小时）
   * 缓存到 Redis，TTL 设置为 7000 秒（提前刷新）
   */
  async getAccessToken(): Promise<string> {
    const cacheKey = 'wechat:access_token';

    // 先尝试从 Redis 缓存获取
    const cachedToken = await this.cache.get(cacheKey);
    if (cachedToken) {
      this.logger.debug('Retrieved access_token from cache');
      return cachedToken;
    }

    // 缓存未命中，从微信 API 获取
    const appId = this.configService.get<string>('WECHAT_APP_ID');
    const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');

    if (!appId || !appSecret) {
      throw new Error(
        'WECHAT_APP_ID and WECHAT_APP_SECRET must be configured',
      );
    }

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.wechatApiBase}/cgi-bin/token`,
        {
          params: {
            grant_type: 'client_credential',
            appid: appId,
            secret: appSecret,
          },
        },
      );

      const accessToken = response.data.access_token;
      if (!accessToken) {
        this.logger.error('Failed to get access_token', response.data);
        throw new Error('Invalid access_token response from WeChat API');
      }

      // 缓存 access_token，TTL 使用常量（比微信有效期少 200 秒）
      await this.cache.set(cacheKey, accessToken, this.ACCESS_TOKEN_CACHE_TTL);
      this.logger.log('Access token refreshed and cached');

      return accessToken;
    } catch (error) {
      this.logger.error('Error fetching access_token from WeChat API', error);
      throw new Error('Failed to fetch access_token from WeChat API');
    }
  }

  /**
   * 发送微信订阅消息
   *
   * @param openid 用户 openid
   * @param templateId 模板 ID
   * @param page 跳转页面
   * @param data 模板数据
   * @returns 是否发送成功
   */
  async sendSubscribeMessage(
    openid: string,
    templateId: string,
    page: string,
    data: Record<string, { value: string }>,
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await this.httpService.axiosRef.post(
        `${this.wechatApiBase}/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          touser: openid,
          template_id: templateId,
          page: page,
          data: data,
        },
      );

      if (response.data.errcode === 0) {
        this.logger.log(`Subscribe message sent successfully to ${openid}, template: ${templateId}`);
        return true;
      } else {
        // 改进：增加更多调试上下文
        this.logger.warn(
          `Failed to send subscribe message [openid: ${openid}, template: ${templateId}, errcode: ${response.data.errcode}, errmsg: ${response.data.errmsg}]`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error sending subscribe message [openid: ${openid}, template: ${templateId}]`,
        error,
      );
      return false;
    }
  }

  /**
   * 检查用户是否订阅了特定类型的通知
   *
   * @param userId 用户 ID
   * @param notificationType 通知类型
   * @returns 是否已订阅
   */
  async isUserSubscribed(
    userId: number,
    notificationType: NotificationType,
  ): Promise<boolean> {
    try {
      const preference = await this.prisma.userNotificationPreference.findUnique(
        {
          where: { userId },
        },
      );

      if (!preference) {
        return false;
      }

      return preference.notificationTypes.includes(notificationType);
    } catch (error) {
      this.logger.error('Error checking user subscription', error);
      return false;
    }
  }

  /**
   * 发送订单确认通知
   *
   * @param userId 用户 ID
   * @param orderNo 订单编号
   * @param productName 产品名称
   * @param bookingDate 预订日期
   * @param participantCount 参与人数
   * @param phone 联系电话
   * @param amount 订单金额（元）
   */
  async sendOrderConfirmNotification(
    userId: number,
    orderNo: string,
    productName: string,
    bookingDate: Date,
    participantCount: number,
    phone: string,
    amount: number,
  ): Promise<boolean> {
    try {
      // 检查用户是否订阅了订单确认通知
      const isSubscribed = await this.isUserSubscribed(
        userId,
        NotificationType.ORDER_CONFIRM,
      );
      if (!isSubscribed) {
        this.logger.debug(
          `User ${userId} not subscribed to order confirm notifications`,
        );
        return false;
      }

      // 获取用户 openid
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { openid: true },
      });

      if (!user?.openid) {
        this.logger.warn(`User ${userId} has no openid, cannot send notification`);
        return false;
      }

      // 构建消息模板数据（使用命名常量代替魔法字符串）
      const templateData = {
        [this.TEMPLATE_KEYS.ORDER_NUMBER]: { value: orderNo }, // 订单编号
        [this.TEMPLATE_KEYS.PRODUCT_NAME]: { value: productName }, // 产品名称
        [this.TEMPLATE_KEYS.BOOKING_DATE]: { value: this.formatDate(bookingDate) }, // 预订日期
        [this.TEMPLATE_KEYS.PARTICIPANT_COUNT]: { value: participantCount.toString() }, // 参与人数
        [this.TEMPLATE_KEYS.CONTACT_PHONE]: { value: this.maskPhone(phone) }, // 联系电话（脱敏）
        [this.TEMPLATE_KEYS.ORDER_AMOUNT]: { value: `¥${amount.toFixed(2)}` }, // 订单金额
      };

      return await this.sendSubscribeMessage(
        user.openid,
        this.ORDER_CONFIRM_TEMPLATE_ID,
        `pages/order-detail/order-detail?orderNo=${orderNo}`,
        templateData,
      );
    } catch (error) {
      this.logger.error('Error sending order confirm notification', error);
      return false;
    }
  }

  /**
   * 发送出行提醒通知
   *
   * @param userId 用户 ID
   * @param productName 产品名称
   * @param travelDate 出行日期
   * @param travelTime 出行时间
   * @param location 活动地点
   * @param meetingPoint 集合地点
   * @param contact 联系方式
   * @param tips 温馨提示
   */
  async sendTravelReminderNotification(
    userId: number,
    productName: string,
    travelDate: Date,
    travelTime: string,
    location: string,
    meetingPoint: string,
    contact: string,
    tips: string,
  ): Promise<boolean> {
    try {
      // 检查用户是否订阅了出行提醒通知
      const isSubscribed = await this.isUserSubscribed(
        userId,
        NotificationType.TRAVEL_REMINDER,
      );
      if (!isSubscribed) {
        this.logger.debug(
          `User ${userId} not subscribed to travel reminder notifications`,
        );
        return false;
      }

      // 获取用户 openid
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { openid: true },
      });

      if (!user?.openid) {
        this.logger.warn(`User ${userId} has no openid, cannot send notification`);
        return false;
      }

      // 构建消息模板数据（使用命名常量代替魔法字符串）
      const templateData = {
        [this.TEMPLATE_KEYS.PRODUCT_NAME]: { value: productName }, // 产品名称
        [this.TEMPLATE_KEYS.TRAVEL_DATE]: { value: this.formatDate(travelDate) }, // 活动日期
        [this.TEMPLATE_KEYS.TRAVEL_TIME]: { value: travelTime }, // 活动时间
        [this.TEMPLATE_KEYS.LOCATION]: { value: location }, // 活动地点
        [this.TEMPLATE_KEYS.MEETING_POINT]: { value: meetingPoint }, // 集合地点
        [this.TEMPLATE_KEYS.CONTACT_INFO]: { value: contact }, // 联系方式
        [this.TEMPLATE_KEYS.TIPS]: { value: tips }, // 温馨提示
      };

      return await this.sendSubscribeMessage(
        user.openid,
        this.TRAVEL_REMINDER_TEMPLATE_ID,
        'pages/index/index',
        templateData,
      );
    } catch (error) {
      this.logger.error('Error sending travel reminder notification', error);
      return false;
    }
  }

  /**
   * 发送退款结果通知
   *
   * @param userId 用户 ID
   * @param refundStatus 退款状态
   * @param refundNo 退款编号
   * @param amount 退款金额（元）
   * @param reason 退款原因
   * @param rejectedReason 拒绝原因
   * @param completedAt 完成时间
   */
  async sendRefundResultNotification(
    userId: number,
    refundStatus: string,
    refundNo: string,
    amount: number,
    reason?: string,
    rejectedReason?: string,
    completedAt?: Date,
  ): Promise<boolean> {
    try {
      let notificationType: NotificationType;
      let templateId: string;
      let templateData: Record<string, { value: string }>;

      switch (refundStatus) {
        case 'APPROVED':
          notificationType = NotificationType.REFUND_APPROVED;
          templateId = this.REFUND_APPROVED_TEMPLATE_ID;
          templateData = {
            [this.TEMPLATE_KEYS.REFUND_NUMBER]: { value: refundNo }, // 退款编号
            [this.TEMPLATE_KEYS.REFUND_AMOUNT]: { value: `¥${amount.toFixed(2)}` }, // 退款金额
            [this.TEMPLATE_KEYS.REFUND_DATE]: { value: this.formatDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)) }, // 预计到账时间（3天后）
          };
          break;

        case 'REJECTED':
          notificationType = NotificationType.REFUND_REJECTED;
          templateId = this.REFUND_REJECTED_TEMPLATE_ID;
          templateData = {
            [this.TEMPLATE_KEYS.REFUND_NUMBER]: { value: refundNo }, // 退款编号
            [this.TEMPLATE_KEYS.REJECTED_REASON]: { value: rejectedReason || '未提供原因' }, // 拒绝原因
            [this.TEMPLATE_KEYS.CUSTOMER_SERVICE]: { value: '请联系客服：400-123-4567' }, // 联系客服方式
          };
          break;

        case 'COMPLETED':
          notificationType = NotificationType.REFUND_COMPLETED;
          templateId = this.REFUND_COMPLETED_TEMPLATE_ID;
          templateData = {
            [this.TEMPLATE_KEYS.REFUND_NUMBER]: { value: refundNo }, // 退款编号
            [this.TEMPLATE_KEYS.REFUND_AMOUNT]: { value: `¥${amount.toFixed(2)}` }, // 退款金额
            [this.TEMPLATE_KEYS.REFUND_DATE]: { value: completedAt ? this.formatDate(completedAt) : this.formatDate(new Date()) }, // 到账时间
          };
          break;

        default:
          this.logger.warn(`Unknown refund status: ${refundStatus}`);
          return false;
      }

      // 检查用户是否订阅了对应类型的退款通知
      const isSubscribed = await this.isUserSubscribed(userId, notificationType);
      if (!isSubscribed) {
        this.logger.debug(
          `User ${userId} not subscribed to ${notificationType} notifications`,
        );
        return false;
      }

      // 获取用户 openid
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { openid: true },
      });

      if (!user?.openid) {
        this.logger.warn(`User ${userId} has no openid, cannot send notification`);
        return false;
      }

      return await this.sendSubscribeMessage(
        user.openid,
        templateId,
        `pages/refund-detail/refund-detail?refundNo=${refundNo}`,
        templateData,
      );
    } catch (error) {
      this.logger.error('Error sending refund result notification', error);
      return false;
    }
  }

  /**
   * 格式化日期为 YYYY-MM-DD（使用 UTC 时区）
   *
   * @param date 要格式化的日期
   * @returns 格式化后的日期字符串（YYYY-MM-DD）
   *
   * @example
   * formatDate(new Date('2024-01-15T10:30:00Z')) // '2024-01-15'
   */
  private formatDate(date: Date): string {
    // 使用 UTC 时间避免时区问题
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 脱敏手机号（保留前3位和后4位）
   *
   * @param phone 原始手机号
   * @returns 脱敏后的手机号
   *
   * @example
   * maskPhone('13800138000') // '138****8000'
   * maskPhone('123') // '123'
   * maskPhone('') // ''
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) {
      return phone;
    }
    return `${phone.substring(0, 3)}****${phone.substring(phone.length - 4)}`;
  }

  /**
   * 更新用户通知订阅偏好
   *
   * @param userId 用户 ID
   * @param notificationTypes 要订阅的通知类型数组
   * @returns 更新后的用户订阅偏好
   */
  async updateUserSubscription(
    userId: number,
    notificationTypes: NotificationType[],
  ) {
    const preference = await this.prisma.userNotificationPreference.upsert({
      where: { userId },
      update: {
        notificationTypes: notificationTypes as string[],
        updatedAt: new Date(),
      },
      create: {
        userId,
        notificationTypes: notificationTypes as string[],
      },
    });

    this.logger.log(`User ${userId} subscription updated: ${notificationTypes.join(', ')}`);

    return preference;
  }

  /**
   * 获取用户通知订阅偏好
   *
   * @param userId 用户 ID
   * @returns 用户订阅偏好（如果不存在则返回默认空数组）
   */
  async getUserSubscription(userId: number) {
    let preference = await this.prisma.userNotificationPreference.findUnique({
      where: { userId },
    });

    // 如果用户没有订阅偏好记录，创建一个默认的（空数组）
    if (!preference) {
      preference = await this.prisma.userNotificationPreference.create({
        data: {
          userId,
          notificationTypes: [],
        },
      });
      this.logger.log(`Created default subscription preference for user ${userId}`);
    }

    return preference;
  }
}
