import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OssService } from './oss.service';
import { CreateUploadDto } from './dto/create-upload.dto';

@ApiTags('oss')
@Controller('api/v1/oss')
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Post('signature')
  @ApiOperation({ summary: '获取 OSS 直传签名 URL' })
  @ApiResponse({ status: 200, description: '签名 URL 生成成功' })
  async getSignature(@Body() createUploadDto: CreateUploadDto) {
    const { fileName } = createUploadDto;

    // 验证文件类型
    if (!this.ossService.validateFileType(fileName)) {
      throw new BadRequestException(
        'Invalid file type. Only jpg, jpeg, png, webp are allowed.',
      );
    }

    // 验证文件大小
    if (!this.ossService.validateFileSize(createUploadDto.fileSize || 0)) {
      throw new BadRequestException('File size exceeds 5MB limit.');
    }

    const signedUrl = await this.ossService.generateSignedUrl(fileName);
    return {
      data: {
        signedUrl,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    };
  }
}
