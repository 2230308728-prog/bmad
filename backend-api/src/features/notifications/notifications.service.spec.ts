import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '@/redis/cache.service';
import { NotificationType, RefundStatus } from '@prisma/client';
import { AxiosResponse } from 'axios';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpService: HttpService;
  let prismaService: PrismaService;
  let cacheService: CacheService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    userNotificationPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    httpService = module.get<HttpService>(HttpService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const configMap: Record<string, string> = {
        WECHAT_APP_ID: 'test_app_id',
        WECHAT_APP_SECRET: 'test_app_secret',
        WECHAT_ORDER_CONFIRM_TEMPLATE_ID: 'order_confirm_template',
        WECHAT_TRAVEL_REMINDER_TEMPLATE_ID: 'travel_reminder_template',
        WECHAT_REFUND_APPROVED_TEMPLATE_ID: 'refund_approved_template',
        WECHAT_REFUND_REJECTED_TEMPLATE_ID: 'refund_rejected_template',
        WECHAT_REFUND_COMPLETED_TEMPLATE_ID: 'refund_completed_template',
      };
      return configMap[key] || '';
    });
  });

  describe('getAccessToken', () => {
    it('should return cached access token if available', async () => {
      mockCacheService.get.mockResolvedValue('cached_token');

      const result = await service.getAccessToken();

      expect(result).toBe('cached_token');
      expect(mockCacheService.get).toHaveBeenCalledWith('wechat:access_token');
      expect(httpService.axiosRef.get).not.toHaveBeenCalled();
    });

    it('should fetch new access token from WeChat API if cache is empty', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.axiosRef.get.mockResolvedValue({
        data: {
          access_token: 'new_token',
          expires_in: 7200,
        },
      });

      const result = await service.getAccessToken();

      expect(result).toBe('new_token');
      expect(httpService.axiosRef.get).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/cgi-bin/token',
        {
          params: {
            grant_type: 'client_credential',
            appid: 'test_app_id',
            secret: 'test_app_secret',
          },
        },
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'wechat:access_token',
        'new_token',
        7000,
      );
    });

    it('should throw error if WeChat API returns invalid response', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.axiosRef.get.mockResolvedValue({
        data: {
          errcode: 40013,
          errmsg: 'invalid appid',
        },
      });

      await expect(service.getAccessToken()).rejects.toThrow(
        'Invalid access_token response from WeChat API',
      );
    });

    it('should throw error if WECHAT_APP_ID or WECHAT_APP_SECRET is missing', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue(null);

      await expect(service.getAccessToken()).rejects.toThrow(
        'WECHAT_APP_ID and WECHAT_APP_SECRET must be configured',
      );
    });

    it('should handle network errors gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.axiosRef.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getAccessToken()).rejects.toThrow(
        'Failed to fetch access_token from WeChat API',
      );
    });
  });

  describe('isUserSubscribed', () => {
    it('should return true if user is subscribed to the notification type', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [NotificationType.ORDER_CONFIRM, NotificationType.TRAVEL_REMINDER],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.isUserSubscribed(1, NotificationType.ORDER_CONFIRM);

      expect(result).toBe(true);
      expect(
        mockPrismaService.userNotificationPreference.findUnique,
      ).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });

    it('should return false if user is not subscribed to the notification type', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [NotificationType.TRAVEL_REMINDER],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.isUserSubscribed(1, NotificationType.ORDER_CONFIRM);

      expect(result).toBe(false);
    });

    it('should return false if user has no notification preferences', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.isUserSubscribed(1, NotificationType.ORDER_CONFIRM);

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.isUserSubscribed(1, NotificationType.ORDER_CONFIRM);

      expect(result).toBe(false);
    });
  });

  describe('sendOrderConfirmNotification', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        openid: 'test_openid',
      });
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [NotificationType.ORDER_CONFIRM],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });
      mockCacheService.get.mockResolvedValue('cached_token');
    });

    it('should send order confirm notification successfully', async () => {
      mockHttpService.axiosRef.post.mockResolvedValue({
        data: {
          errcode: 0,
          errmsg: 'ok',
        },
      });

      const result = await service.sendOrderConfirmNotification(
        1,
        'ORD20240101000001',
        '测试产品',
        new Date('2024-01-15'),
        2,
        '13800138000',
        299.0,
      );

      expect(result).toBe(true);
      expect(httpService.axiosRef.post).toHaveBeenCalled();
    });

    it('should return false if user is not subscribed', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [], // Empty array means no subscriptions
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.sendOrderConfirmNotification(
        1,
        'ORD20240101000001',
        '测试产品',
        new Date('2024-01-15'),
        2,
        '13800138000',
        299.0,
      );

      expect(result).toBe(false);
      expect(httpService.axiosRef.post).not.toHaveBeenCalled();
    });

    it('should return false if user has no openid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        openid: null,
      });

      const result = await service.sendOrderConfirmNotification(
        1,
        'ORD20240101000001',
        '测试产品',
        new Date('2024-01-15'),
        2,
        '13800138000',
        299.0,
      );

      expect(result).toBe(false);
      expect(httpService.axiosRef.post).not.toHaveBeenCalled();
    });

    it('should handle WeChat API errors gracefully', async () => {
      mockHttpService.axiosRef.post.mockRejectedValue(new Error('Network error'));

      const result = await service.sendOrderConfirmNotification(
        1,
        'ORD20240101000001',
        '测试产品',
        new Date('2024-01-15'),
        2,
        '13800138000',
        299.0,
      );

      expect(result).toBe(false);
    });

    it('should return false if WeChat API returns error', async () => {
      mockHttpService.axiosRef.post.mockResolvedValue({
        data: {
          errcode: 40037,
          errmsg: 'template_id不正确',
        },
      });

      const result = await service.sendOrderConfirmNotification(
        1,
        'ORD20240101000001',
        '测试产品',
        new Date('2024-01-15'),
        2,
        '13800138000',
        299.0,
      );

      expect(result).toBe(false);
    });
  });

  describe('sendTravelReminderNotification', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        openid: 'test_openid',
      });
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [NotificationType.TRAVEL_REMINDER],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });
      mockCacheService.get.mockResolvedValue('cached_token');
    });

    it('should send travel reminder notification successfully', async () => {
      mockHttpService.axiosRef.post.mockResolvedValue({
        data: {
          errcode: 0,
          errmsg: 'ok',
        },
      });

      const result = await service.sendTravelReminderNotification(
        1,
        '测试研学活动',
        new Date('2024-01-16'),
        '09:00',
        '北京市朝阳区',
        '地铁站A口',
        '400-123-4567',
        '请携带身份证件',
      );

      expect(result).toBe(true);
      expect(httpService.axiosRef.post).toHaveBeenCalled();
    });

    it('should return false if user is not subscribed', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.sendTravelReminderNotification(
        1,
        '测试研学活动',
        new Date('2024-01-16'),
        '09:00',
        '北京市朝阳区',
        '地铁站A口',
        '400-123-4567',
        '请携带身份证件',
      );

      expect(result).toBe(false);
    });
  });

  describe('sendRefundResultNotification', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        openid: 'test_openid',
      });
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [
          NotificationType.REFUND_APPROVED,
          NotificationType.REFUND_REJECTED,
          NotificationType.REFUND_COMPLETED,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });
      mockCacheService.get.mockResolvedValue('cached_token');
    });

    it('should send refund approved notification successfully', async () => {
      mockHttpService.axiosRef.post.mockResolvedValue({
        data: {
          errcode: 0,
          errmsg: 'ok',
        },
      });

      const result = await service.sendRefundResultNotification(
        1,
        'APPROVED',
        'REF20240101000001',
        299.0,
        '不想要了',
      );

      expect(result).toBe(true);
      expect(httpService.axiosRef.post).toHaveBeenCalled();
    });

    it('should send refund rejected notification successfully', async () => {
      mockHttpService.axiosRef.post.mockResolvedValue({
        data: {
          errcode: 0,
          errmsg: 'ok',
        },
      });

      const result = await service.sendRefundResultNotification(
        1,
        'REJECTED',
        'REF20240101000001',
        299.0,
        '不想要了',
        '不符合退款条件',
      );

      expect(result).toBe(true);
      expect(httpService.axiosRef.post).toHaveBeenCalled();
    });

    it('should send refund completed notification successfully', async () => {
      mockHttpService.axiosRef.post.mockResolvedValue({
        data: {
          errcode: 0,
          errmsg: 'ok',
        },
      });

      const result = await service.sendRefundResultNotification(
        1,
        'COMPLETED',
        'REF20240101000001',
        299.0,
        undefined,
        undefined,
        new Date('2024-01-15'),
      );

      expect(result).toBe(true);
      expect(httpService.axiosRef.post).toHaveBeenCalled();
    });

    it('should return false for unknown refund status', async () => {
      const result = await service.sendRefundResultNotification(
        1,
        'UNKNOWN_STATUS',
        'REF20240101000001',
        299.0,
      );

      expect(result).toBe(false);
      expect(httpService.axiosRef.post).not.toHaveBeenCalled();
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      // @ts-expect-error - testing private method
      const result = service.formatDate(date);

      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      const phone = '13800138000';
      // @ts-expect-error - testing private method
      const result = service.maskPhone(phone);

      expect(result).toBe('138****8000');
    });

    it('should handle short phone numbers', () => {
      const phone = '123';
      // @ts-expect-error - testing private method
      const result = service.maskPhone(phone);

      expect(result).toBe('123');
    });

    it('should handle empty phone numbers', () => {
      const phone = '';
      // @ts-expect-error - testing private method
      const result = service.maskPhone(phone);

      expect(result).toBe('');
    });
  });

  describe('updateUserSubscription', () => {
    it('should create new subscription preference for user', async () => {
      mockPrismaService.userNotificationPreference.upsert.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [NotificationType.ORDER_CONFIRM],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.updateUserSubscription(
        1,
        [NotificationType.ORDER_CONFIRM],
      );

      expect(result).toBeDefined();
      expect(result.notificationTypes).toContain(NotificationType.ORDER_CONFIRM);
      expect(mockPrismaService.userNotificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 1 },
        update: {
          notificationTypes: [NotificationType.ORDER_CONFIRM],
          updatedAt: expect.any(Date),
        },
        create: {
          userId: 1,
          notificationTypes: [NotificationType.ORDER_CONFIRM],
        },
      });
    });

    it('should update existing subscription preference', async () => {
      mockPrismaService.userNotificationPreference.upsert.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [
          NotificationType.ORDER_CONFIRM,
          NotificationType.TRAVEL_REMINDER,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.updateUserSubscription(1, [
        NotificationType.ORDER_CONFIRM,
        NotificationType.TRAVEL_REMINDER,
      ]);

      expect(result.notificationTypes).toHaveLength(2);
    });
  });

  describe('getUserSubscription', () => {
    it('should return existing subscription preference', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [NotificationType.ORDER_CONFIRM],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.getUserSubscription(1);

      expect(result).toBeDefined();
      expect(result.notificationTypes).toContain(NotificationType.ORDER_CONFIRM);
    });

    it('should create default preference when not exists', async () => {
      mockPrismaService.userNotificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.userNotificationPreference.create.mockResolvedValue({
        id: 1,
        userId: 1,
        notificationTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {},
      });

      const result = await service.getUserSubscription(1);

      expect(result).toBeDefined();
      expect(result.notificationTypes).toEqual([]);
      expect(mockPrismaService.userNotificationPreference.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          notificationTypes: [],
        },
      });
    });
  });
});
