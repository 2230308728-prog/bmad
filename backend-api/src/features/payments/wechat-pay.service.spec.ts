import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WechatPayService } from './wechat-pay.service';

// Mock fs module before importing WechatPayService
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => Buffer.from('mocked_private_key_content')),
}));

// Mock wechatpay-node-v3
jest.mock('wechatpay-node-v3', () => {
  return jest.fn().mockImplementation(() => ({
    transactions_jsapi: jest.fn(),
    query: jest.fn(),
    close: jest.fn(),
    verifySign: jest.fn(),
    decipher_gcm: jest.fn(),
    sha256WithRsa: jest.fn(),
    refund: jest.fn(),
    query_refund: jest.fn(),
  }));
});

describe('WechatPayService', () => {
  let service: WechatPayService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatPayService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WechatPayService>(WechatPayService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log warning when config is incomplete', () => {
      mockConfigService.get.mockReturnValue('');

      service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
    });

    it('should initialize successfully with complete config', async () => {
      // Create a fresh module with complete config
      const completeMockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            WECHAT_PAY_APPID: 'test_appid',
            WECHAT_PAY_MCHID: 'test_mchid',
            WECHAT_PAY_SERIAL_NO: 'test_serial',
            WECHAT_PAY_PRIVATE_KEY_PATH: './certs/test_key.pem',
            WECHAT_PAY_APIV3_KEY: 'test_key',
            WECHAT_PAY_NOTIFY_URL: 'https://example.com/notify',
          };
          return config[key] || '';
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WechatPayService,
          {
            provide: ConfigService,
            useValue: completeMockConfigService,
          },
        ],
      }).compile();

      const freshService = module.get<WechatPayService>(WechatPayService);
      freshService.onModuleInit();

      expect(freshService.isAvailable()).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return false when wxpay is not initialized', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('createJsapiOrder', () => {
    it('should throw error when service is not available', async () => {
      await expect(
        service.createJsapiOrder('Test Product', 'ORD123', 100, 'test_openid'),
      ).rejects.toThrow('微信支付服务不可用');
    });
  });

  describe('generateJsapiParams', () => {
    it('should throw error when service is not available', () => {
      expect(() => service.generateJsapiParams('test_prepay_id')).toThrow('微信支付服务不可用');
    });
  });

  describe('queryOrder', () => {
    it('should throw error when service is not available', async () => {
      await expect(service.queryOrder('ORD123')).rejects.toThrow('微信支付服务不可用');
    });
  });

  describe('verifyNotify', () => {
    it('should throw error when service is not available', async () => {
      await expect(
        service.verifyNotify('123', 'abc', '{}', 'sig', 'serial'),
      ).rejects.toThrow('微信支付服务不可用');
    });
  });

  describe('closeOrder', () => {
    it('should throw error when service is not available', async () => {
      await expect(service.closeOrder('ORD123')).rejects.toThrow('微信支付服务不可用');
    });
  });

  describe('refund', () => {
    beforeEach(() => {
      // Initialize service before each refund test
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          WECHAT_PAY_APPID: 'test_appid',
          WECHAT_PAY_MCHID: 'test_mchid',
          WECHAT_PAY_SERIAL_NO: 'test_serial',
          WECHAT_PAY_PRIVATE_KEY_PATH: './certs/test_key.pem',
          WECHAT_PAY_APIV3_KEY: 'test_key',
          WECHAT_PAY_NOTIFY_URL: 'https://example.com/notify',
        };
        return config[key] || '';
      });
      service.onModuleInit();
    });

    it('should throw error when service is not available', async () => {
      // Reset service to unavailable state
      jest.resetModules();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WechatPayService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => '') },
          },
        ],
      }).compile();
      const unavailableService = module.get<WechatPayService>(WechatPayService);

      await expect(
        unavailableService.refund('ORD123', 'REF123', 100, 29900, '用户申请退款'),
      ).rejects.toThrow('微信支付服务不可用');
    });

    it('should successfully create refund when service is available', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.refund.mockResolvedValue({
        status: 200,
        data: {
          refund_id: 'REFUND_WX_123',
          out_refund_no: 'REF123',
          transaction_id: 'TXN123',
          out_trade_no: 'ORD123',
          channel: 'ORIGINAL',
          user_received_account: '用户微信零钱',
          success_time: '2024-01-15T10:30:00+08:00',
          create_time: '2024-01-15T10:29:00+08:00',
          status: 'PROCESSING',
          amount: {
            total: 29900,
            refund: 100,
            payer_total: 29900,
            payer_refund: 100,
            currency: 'CNY',
          },
        },
      });

      const result = await service.refund('ORD123', 'REF123', 100, 29900, '用户申请退款');

      expect(result.refund_id).toBe('REFUND_WX_123');
      expect(result.out_refund_no).toBe('REF123');
      expect(result.status).toBe('PROCESSING');
      expect(mockWxPay.refund).toHaveBeenCalledWith({
        out_trade_no: 'ORD123',
        out_refund_no: 'REF123',
        reason: '用户申请退款',
        notify_url: 'https://example.com/refund/notify',
        amount: {
          refund: 100,
          total: 29900,
          currency: 'CNY',
        },
      });
    });

    it('should handle refund API error', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.refund.mockResolvedValue({
        status: 500,
        data: { code: 'SYSTEM_ERROR', message: '系统错误' },
      });

      await expect(
        service.refund('ORD123', 'REF123', 100, 29900, '用户申请退款'),
      ).rejects.toThrow('微信退款申请失败');
    });

    it('should handle network error', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.refund.mockRejectedValue(new Error('Network error'));

      await expect(
        service.refund('ORD123', 'REF123', 100, 29900, '用户申请退款'),
      ).rejects.toThrow('微信退款申请失败: Network error');
    });

    it('should throw error when refund amount exceeds total amount (AC #32)', async () => {
      const mockWxPay = (service as any).wxpay;

      // 尝试退款 30000 分，但订单总金额只有 29900 分
      await expect(
        service.refund('ORD123', 'REF123', 30000, 29900, '用户申请退款'),
      ).rejects.toThrow('退款金额不能超过订单原支付金额');

      // 验证没有调用微信支付 API
      expect(mockWxPay.refund).not.toHaveBeenCalled();
    });

    it('should allow refund when amount equals total amount', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.refund.mockResolvedValue({
        status: 200,
        data: {
          refund_id: 'REFUND_WX_123',
          out_refund_no: 'REF123',
          status: 'PROCESSING',
          amount: { total: 29900, refund: 29900, currency: 'CNY' },
        },
      });

      // 全额退款应该被允许
      await expect(
        service.refund('ORD123', 'REF123', 29900, 29900, '用户申请退款'),
      ).resolves.toBeDefined();
    });

    it('should throw error when refund exceeds 365 days (AC #33)', async () => {
      const mockWxPay = (service as any).wxpay;

      // 创建一个 366 天前的支付时间
      const paymentTime = new Date();
      paymentTime.setDate(paymentTime.getDate() - 366);

      await expect(
        service.refund('ORD123', 'REF123', 100, 29900, '用户申请退款', paymentTime),
      ).rejects.toThrow('退款必须在支付完成后365天内进行');

      // 验证没有调用微信支付 API
      expect(mockWxPay.refund).not.toHaveBeenCalled();
    });

    it('should allow refund within 365 days', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.refund.mockResolvedValue({
        status: 200,
        data: {
          refund_id: 'REFUND_WX_123',
          out_refund_no: 'REF123',
          status: 'PROCESSING',
          amount: { total: 29900, refund: 100, currency: 'CNY' },
        },
      });

      // 创建一个 364 天前的支付时间
      const paymentTime = new Date();
      paymentTime.setDate(paymentTime.getDate() - 364);

      await expect(
        service.refund('ORD123', 'REF123', 100, 29900, '用户申请退款', paymentTime),
      ).resolves.toBeDefined();
    });

    it('should skip 365-day validation when paymentTime is not provided', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.refund.mockResolvedValue({
        status: 200,
        data: {
          refund_id: 'REFUND_WX_123',
          out_refund_no: 'REF123',
          status: 'PROCESSING',
          amount: { total: 29900, refund: 100, currency: 'CNY' },
        },
      });

      // 不提供 paymentTime，应该跳过365天验证
      await expect(
        service.refund('ORD123', 'REF123', 100, 29900, '用户申请退款'),
      ).resolves.toBeDefined();

      expect(mockWxPay.refund).toHaveBeenCalled();
    });
  });

  describe('queryRefund', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          WECHAT_PAY_APPID: 'test_appid',
          WECHAT_PAY_MCHID: 'test_mchid',
          WECHAT_PAY_SERIAL_NO: 'test_serial',
          WECHAT_PAY_PRIVATE_KEY_PATH: './certs/test_key.pem',
          WECHAT_PAY_APIV3_KEY: 'test_key',
          WECHAT_PAY_NOTIFY_URL: 'https://example.com/notify',
        };
        return config[key] || '';
      });
      service.onModuleInit();
    });

    it('should throw error when service is not available', async () => {
      jest.resetModules();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WechatPayService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => '') },
          },
        ],
      }).compile();
      const unavailableService = module.get<WechatPayService>(WechatPayService);

      await expect(unavailableService.queryRefund('REF123')).rejects.toThrow('微信支付服务不可用');
    });

    it('should successfully query refund when service is available', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.query_refund.mockResolvedValue({
        status: 200,
        data: {
          refund_id: 'REFUND_WX_123',
          out_refund_no: 'REF123',
          transaction_id: 'TXN123',
          out_trade_no: 'ORD123',
          channel: 'ORIGINAL',
          user_received_account: '用户微信零钱',
          success_time: '2024-01-15T10:30:00+08:00',
          create_time: '2024-01-15T10:29:00+08:00',
          status: 'SUCCESS',
          amount: {
            total: 29900,
            refund: 100,
            payer_total: 29900,
            payer_refund: 100,
            currency: 'CNY',
          },
        },
      });

      const result = await service.queryRefund('REF123');

      expect(result.refund_id).toBe('REFUND_WX_123');
      expect(result.out_refund_no).toBe('REF123');
      expect(result.status).toBe('SUCCESS');
      expect(mockWxPay.query_refund).toHaveBeenCalledWith({
        out_refund_no: 'REF123',
      });
    });

    it('should handle query refund API error', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.query_refund.mockResolvedValue({
        status: 500,
        data: { code: 'SYSTEM_ERROR', message: '系统错误' },
      });

      await expect(service.queryRefund('REF123')).rejects.toThrow('查询退款失败');
    });

    it('should handle query refund network error', async () => {
      const mockWxPay = (service as any).wxpay;
      mockWxPay.query_refund.mockRejectedValue(new Error('Network error'));

      await expect(service.queryRefund('REF123')).rejects.toThrow('Network error');
    });
  });
});
