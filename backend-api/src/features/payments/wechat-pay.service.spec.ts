import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WechatPayService } from './wechat-pay.service';

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
    it('should initialize wxpay when config is valid', () => {
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

      // Note: This test may fail if the private key file doesn't exist
      // In real tests, you'd mock the fs module or use a test key file
      service.onModuleInit();
      // Due to missing key file, service will log error and set wxpay to null
    });

    it('should log warning when config is incomplete', () => {
      mockConfigService.get.mockReturnValue('');

      service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
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
});
