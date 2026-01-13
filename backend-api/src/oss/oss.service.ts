import { Injectable, Optional } from '@nestjs/common';
import OSS = require('ali-oss');
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OssService {
  private client: OSS;

  constructor(
    private configService: ConfigService,
    @Optional() private ossClient?: OSS,
  ) {
    // Allow injection of mock OSS client for testing
    this.client =
      this.ossClient ||
      new OSS({
        region: this.configService.get<string>('OSS_REGION')!,
        accessKeyId: this.configService.get<string>('OSS_ACCESS_KEY_ID')!,
        accessKeySecret: this.configService.get<string>('OSS_ACCESS_KEY_SECRET')!,
        bucket: this.configService.get<string>('OSS_BUCKET')!,
      });
  }

  /**
   * 上传文件到 OSS
   * @param file 文件 Buffer
   * @param originalName 原始文件名
   * @returns 文件 URL
   */
  async uploadFile(file: Buffer, originalName: string): Promise<string> {
    const ext = originalName.split('.').pop();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fileName = `${year}/${month}/${day}/${uuidv4()}.${ext}`;

    await this.client.put(fileName, file);
    const bucket = this.configService.get<string>('OSS_BUCKET')!;
    const region = this.configService.get<string>('OSS_REGION')!;
    return `https://${bucket}.${region}.aliyuncs.com/${fileName}`;
  }

  /**
   * 生成直传签名 URL（15分钟有效）
   * @param fileName 文件名
   * @returns 签名 URL
   */
  async generateSignedUrl(fileName: string): Promise<string> {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 15);

    return this.client.signatureUrl(fileName, {
      expires: date.getTime() / 1000, // Convert to seconds for ali-oss
      method: 'PUT',
    });
  }

  /**
   * 删除 OSS 文件
   * @param fileUrl 文件 URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    // Extract filename from URL: https://bucket.region.aliyuncs.com/path/to/file
    try {
      const url = new URL(fileUrl);
      // Remove leading '/' from pathname and skip bucket name (first segment)
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const fileName = pathSegments.slice(1).join('/'); // Skip bucket name
      await this.client.delete(fileName);
    } catch (error) {
      throw new Error(`Invalid OSS URL format: ${fileUrl}`);
    }
  }

  /**
   * 验证文件类型
   * @param fileName 文件名
   * @returns 是否为允许的图片类型
   */
  validateFileType(fileName: string): boolean {
    const allowedTypes = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = fileName.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(ext || '');
  }

  /**
   * 验证文件大小
   * @param fileSize 文件大小（字节）
   * @returns 是否超过限制（5MB）
   */
  validateFileSize(fileSize: number): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return fileSize <= maxSize;
  }
}
