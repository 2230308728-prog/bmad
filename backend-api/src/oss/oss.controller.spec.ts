import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OssController } from './oss.controller';
import { OssService } from './oss.service';
import { CreateUploadDto } from './dto/create-upload.dto';

describe('OssController', () => {
  let controller: OssController;

  const mockOssService = {
    validateFileType: jest.fn(),
    validateFileSize: jest.fn(),
    generateSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OssController],
      providers: [
        {
          provide: OssService,
          useValue: mockOssService,
        },
      ],
    }).compile();

    controller = module.get<OssController>(OssController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSignature', () => {
    it('should return signed URL for valid file', () => {
      const createUploadDto: CreateUploadDto = {
        fileName: 'test.jpg',
        fileSize: 1024000,
      };

      mockOssService.validateFileType.mockReturnValue(true);
      mockOssService.validateFileSize.mockReturnValue(true);
      mockOssService.generateSignedUrl.mockReturnValue(
        'https://bmad-products.oss-cn-hangzhou.aliyuncs.com/signed-url',
      );

      const result = controller.getSignature(createUploadDto);

      expect(mockOssService.validateFileType).toHaveBeenCalledWith('test.jpg');
      expect(mockOssService.validateFileSize).toHaveBeenCalledWith(1024000);
      expect(mockOssService.generateSignedUrl).toHaveBeenCalledWith('test.jpg');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('signedUrl');
      expect(result.data).toHaveProperty('method', 'PUT');
      expect(result.data).toHaveProperty('headers');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('version', '1.0');
    });

    it('should throw BadRequestException for invalid file type', () => {
      const createUploadDto: CreateUploadDto = {
        fileName: 'test.pdf',
        fileSize: 1024000,
      };

      mockOssService.validateFileType.mockReturnValue(false);

      expect(() => controller.getSignature(createUploadDto)).toThrow(
        BadRequestException,
      );
      expect(() => controller.getSignature(createUploadDto)).toThrow(
        'Invalid file type. Only jpg, jpeg, png, webp are allowed.',
      );
    });

    it('should throw BadRequestException for file size exceeding limit', () => {
      const createUploadDto: CreateUploadDto = {
        fileName: 'test.jpg',
        fileSize: 10 * 1024 * 1024, // 10MB
      };

      mockOssService.validateFileType.mockReturnValue(true);
      mockOssService.validateFileSize.mockReturnValue(false);

      expect(() => controller.getSignature(createUploadDto)).toThrow(
        BadRequestException,
      );
      expect(() => controller.getSignature(createUploadDto)).toThrow(
        'File size exceeds 5MB limit.',
      );
    });

    it('should handle all allowed image types', () => {
      const allowedTypes = ['test.jpg', 'test.jpeg', 'test.png', 'test.webp'];

      for (const fileName of allowedTypes) {
        const createUploadDto: CreateUploadDto = {
          fileName,
          fileSize: 1024000,
        };

        mockOssService.validateFileType.mockReturnValue(true);
        mockOssService.validateFileSize.mockReturnValue(true);
        mockOssService.generateSignedUrl.mockReturnValue(
          'https://bmad-products.oss-cn-hangzhou.aliyuncs.com/signed-url',
        );

        const result = controller.getSignature(createUploadDto);
        expect(result).toHaveProperty('data');
      }
    });

    it('should handle case-insensitive file extensions', () => {
      const createUploadDto: CreateUploadDto = {
        fileName: 'test.JPG',
        fileSize: 1024000,
      };

      mockOssService.validateFileType.mockReturnValue(true);
      mockOssService.validateFileSize.mockReturnValue(true);
      mockOssService.generateSignedUrl.mockReturnValue(
        'https://bmad-products.oss-cn-hangzhou.aliyuncs.com/signed-url',
      );

      const result = controller.getSignature(createUploadDto);
      expect(result).toHaveProperty('data');
      expect(mockOssService.validateFileType).toHaveBeenCalledWith('test.JPG');
    });
  });
});
