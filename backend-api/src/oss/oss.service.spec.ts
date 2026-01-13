import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OssService } from './oss.service';

interface OSSClient {
  put: (name: string, file: Buffer) => Promise<{ name: string; url: string }>;
  signatureUrl: (
    name: string,
    options: { expires: number; method: string },
  ) => string;
  delete: (name: string) => Promise<void>;
}

describe('OssService', () => {
  let service: OssService;
  let mockOssClient: jest.Mocked<OSSClient>;

  const mockConfig = {
    OSS_REGION: 'oss-cn-hangzhou',
    OSS_ACCESS_KEY_ID: 'test-access-key-id',
    OSS_ACCESS_KEY_SECRET: 'test-access-key-secret',
    OSS_BUCKET: 'bmad-products',
  };

  beforeEach(async () => {
    mockOssClient = {
      put: jest.fn(),
      signatureUrl: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<OSSClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OssService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string) => mockConfig[key as keyof typeof mockConfig],
            ),
          },
        },
      ],
    })
      .overrideProvider(OssService)
      .useFactory({
        factory: (configService: ConfigService) => {
          return new OssService(configService, mockOssClient);
        },
        inject: [ConfigService],
      })
      .compile();

    service = module.get<OssService>(OssService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFileType', () => {
    it('should return true for valid image types', () => {
      expect(service.validateFileType('test.jpg')).toBe(true);
      expect(service.validateFileType('test.jpeg')).toBe(true);
      expect(service.validateFileType('test.png')).toBe(true);
      expect(service.validateFileType('test.webp')).toBe(true);
    });

    it('should return true for uppercase extensions', () => {
      expect(service.validateFileType('test.JPG')).toBe(true);
      expect(service.validateFileType('test.PNG')).toBe(true);
    });

    it('should return false for invalid file types', () => {
      expect(service.validateFileType('test.pdf')).toBe(false);
      expect(service.validateFileType('test.gif')).toBe(false);
      expect(service.validateFileType('test.bmp')).toBe(false);
      expect(service.validateFileType('test.txt')).toBe(false);
      expect(service.validateFileType('test')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should return true for files under 5MB', () => {
      expect(service.validateFileSize(1024)).toBe(true);
      expect(service.validateFileSize(5 * 1024 * 1024)).toBe(true); // Exactly 5MB
    });

    it('should return false for files over 5MB', () => {
      expect(service.validateFileSize(5 * 1024 * 1024 + 1)).toBe(false);
      expect(service.validateFileSize(10 * 1024 * 1024)).toBe(false); // 10MB
    });
  });

  describe('uploadFile', () => {
    it('should upload file and return URL', async () => {
      const fileBuffer = Buffer.from('test file content');
      const originalName = 'test.jpg';
      mockOssClient.put.mockResolvedValue({
        name: '2024/01/09/uuid.jpg',
        url: 'test-url',
      });

      const result = await service.uploadFile(fileBuffer, originalName);

      expect(mockOssClient.put).toHaveBeenCalled();
      expect(result).toContain('https://');
      expect(result).toContain(mockConfig.OSS_BUCKET);
      expect(result).toContain(mockConfig.OSS_REGION);
      expect(result).toContain('aliyuncs.com');
    });

    it('should generate correct file path with date prefix', async () => {
      const fileBuffer = Buffer.from('test');
      const originalName = 'product.png';
      mockOssClient.put.mockResolvedValue({
        name: 'file-path',
        url: 'test-url',
      });

      await service.uploadFile(fileBuffer, originalName);

      const putCallArgs = mockOssClient.put.mock.calls[0];
      const fileName = putCallArgs[0];
      expect(fileName).toMatch(/^\d{4}\/\d{2}\/\d{2}\//); // YYYY/MM/DD/
      expect(fileName).toMatch(/\.png$/);
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL with 15 minute expiry', () => {
      const fileName = 'test-file.jpg';
      const mockSignedUrl = 'https://signed-url.example.com';
      mockOssClient.signatureUrl.mockReturnValue(mockSignedUrl);

      const beforeCall = Date.now() / 1000; // Convert to seconds
      const result = service.generateSignedUrl(fileName);
      const afterCall = Date.now() / 1000;

      expect(mockOssClient.signatureUrl).toHaveBeenCalledWith(fileName, {
        expires: expect.any(Number) as unknown,
        method: 'PUT',
      });

      const callArgs = mockOssClient.signatureUrl.mock.calls[0];

      const expiryTime = (callArgs as unknown[])[1] as {
        expires: number;
        method: string;
      };
      const method = expiryTime.method;

      expect(method).toBe('PUT');
      expect(typeof expiryTime.expires).toBe('number');

      // Check that expiry is approximately 15 minutes (900 seconds) from now
      const timeDiff = expiryTime.expires - beforeCall;
      const expectedDiff = 15 * 60; // 15 minutes in seconds
      expect(timeDiff).toBeGreaterThanOrEqual(expectedDiff - 1); // Allow 1s tolerance
      expect(timeDiff).toBeLessThanOrEqual(
        expectedDiff + 1 + (afterCall - beforeCall),
      );

      expect(result).toBe(mockSignedUrl);
    });
  });

  describe('deleteFile', () => {
    it('should delete file from OSS', async () => {
      const fileUrl =
        'https://bmad-products.oss-cn-hangzhou.aliyuncs.com/2024/01/09/uuid.jpg';
      mockOssClient.delete.mockResolvedValue({});

      await service.deleteFile(fileUrl);

      expect(mockOssClient.delete).toHaveBeenCalledWith('2024/01/09/uuid.jpg');
    });

    it('should extract correct filename from URL', async () => {
      const fileUrl =
        'https://bmad-products.oss-cn-hangzhou.aliyuncs.com/2024/12/25/test-file.png';
      mockOssClient.delete.mockResolvedValue({});

      await service.deleteFile(fileUrl);

      expect(mockOssClient.delete).toHaveBeenCalledWith(
        '2024/12/25/test-file.png',
      );
    });

    it('should throw error for invalid URL format', async () => {
      const invalidUrl = 'not-a-valid-url';

      await expect(service.deleteFile(invalidUrl)).rejects.toThrow(
        'Invalid OSS URL format',
      );
    });
  });
});
