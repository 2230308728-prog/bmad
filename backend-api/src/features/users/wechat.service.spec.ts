import { Test, TestingModule } from '@nestjs/testing';
import { WechatService } from './wechat.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('WechatService', () => {
  let service: WechatService;
  let configService: ConfigService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'WECHAT_APP_ID') return 'test_appid';
      if (key === 'WECHAT_APP_SECRET') return 'test_secret';
      return undefined;
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<WechatService>(WechatService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('jscode2session', () => {
    it('should exchange code for openid successfully', async () => {
      // Arrange
      const mockResponse = {
        data: {
          openid: 'test_openid_123',
          session_key: 'test_session_key',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const openid = await service.jscode2session('valid_code');

      // Assert
      expect(openid).toBe('test_openid_123');
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/sns/jscode2session',
        {
          params: {
            appid: 'test_appid',
            secret: 'test_secret',
            js_code: 'valid_code',
            grant_type: 'authorization_code',
          },
          timeout: 5000,
        },
      );
    });

    it('should throw UnauthorizedException when WeChat API returns error', async () => {
      // Arrange
      const mockErrorResponse = {
        data: {
          errcode: 40029,
          errmsg: 'invalid code',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockHttpService.get.mockReturnValue(of(mockErrorResponse));

      // Act & Assert
      await expect(service.jscode2session('invalid_code')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.jscode2session('invalid_code')).rejects.toThrow(
        '微信授权失败，请重试',
      );
    });

    it('should throw UnauthorizedException when network error occurs', async () => {
      // Arrange
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      // Act & Assert
      await expect(service.jscode2session('any_code')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.jscode2session('any_code')).rejects.toThrow(
        '微信授权失败，请重试',
      );
    });

    it('should handle timeout error', async () => {
      // Arrange
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('timeout of 5000ms exceeded')),
      );

      // Act & Assert
      await expect(service.jscode2session('any_code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should correctly handle successful response with unionid', async () => {
      // Arrange
      const mockResponse = {
        data: {
          openid: 'test_openid_456',
          session_key: 'test_session_key',
          unionid: 'test_unionid_789',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const openid = await service.jscode2session('valid_code_with_unionid');

      // Assert
      expect(openid).toBe('test_openid_456');
    });
  });

  describe('constructor', () => {
    it('should throw Error if WECHAT_APP_ID is not configured', async () => {
      // Arrange
      const invalidConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'WECHAT_APP_ID') return '';
          if (key === 'WECHAT_APP_SECRET') return 'test_secret';
          return undefined;
        }),
      };

      // Act & Assert
      await expect(
        Test.createTestingModule({
          providers: [
            WechatService,
            {
              provide: ConfigService,
              useValue: invalidConfigService,
            },
            {
              provide: HttpService,
              useValue: mockHttpService,
            },
          ],
        }).compile(),
      ).rejects.toThrow(Error);
    });

    it('should throw Error if WECHAT_APP_SECRET is not configured', async () => {
      // Arrange
      const invalidConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'WECHAT_APP_ID') return 'test_appid';
          if (key === 'WECHAT_APP_SECRET') return '';
          return undefined;
        }),
      };

      // Act & Assert
      await expect(
        Test.createTestingModule({
          providers: [
            WechatService,
            {
              provide: ConfigService,
              useValue: invalidConfigService,
            },
            {
              provide: HttpService,
              useValue: mockHttpService,
            },
          ],
        }).compile(),
      ).rejects.toThrow(Error);
    });
  });
});
