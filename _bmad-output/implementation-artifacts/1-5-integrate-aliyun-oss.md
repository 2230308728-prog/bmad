# Story 1.5: 集成阿里云 OSS 对象存储

Status: done

## Story

As a 开发者,
I want 配置阿里云 OSS SDK 并实现图片上传服务,
So that 应用可以安全、高效地存储和管理用户上传的图片资源。

## Acceptance Criteria

**Given** NestJS 项目已创建（Story 1.2 完成）
**When** 执行 `npm install ali-oss` 和 `npm install -D @types/ali-oss`
**And** 创建 OssModule（oss.module.ts）封装 OSS 客户端
**Then** 在 .env 文件中添加 OSS 配置项：
  - OSS_REGION（地域）
  - OSS_ACCESS_KEY_ID（访问密钥）
  - OSS_ACCESS_KEY_SECRET（密钥）
  - OSS_BUCKET（存储桶名称）
**And** 创建 OssService（oss.service.ts）提供以下方法：
  - uploadFile(file: Buffer, fileName: string): 上传文件到 OSS
  - generateSignedUrl(fileName: string): 生成直传签名 URL
  - deleteFile(fileName: string): 删除 OSS 文件
**And** 实现 OSS 直传签名端点 POST /api/v1/oss/signature
**And** 签名 URL 有效期为 15 分钟
**And** 上传的文件自动添加日期前缀（如：2024/01/09/uuid.jpg）
**And** 文件类型验证仅允许图片（jpg、jpeg、png、webp）
**And** 文件大小限制为 5MB

## Tasks / Subtasks

- [x] **Task 1: 安装 OSS 依赖** (AC: When - npm install)
  - [x] 进入 backend-api 目录
  - [x] 执行 `npm install ali-oss`
  - [x] 执行 `npm install -D @types/ali-oss`
  - [x] 验证 package.json 中包含 OSS 依赖

- [x] **Task 2: 配置环境变量** (AC: Then - OSS 配置项)
  - [x] 在 .env 文件中添加 OSS_REGION
  - [x] 添加 OSS_ACCESS_KEY_ID
  - [x] 添加 OSS_ACCESS_KEY_SECRET
  - [x] 添加 OSS_BUCKET
  - [x] 创建 .env.example 模板

- [x] **Task 3: 创建 OssService** (AC: And - OssService 方法)
  - [x] 创建 src/oss/ 目录
  - [x] 创建 oss.service.ts
  - [x] 实现 uploadFile() 方法（支持 Buffer 上传）
  - [x] 实现 generateSignedUrl() 方法（15分钟有效期）
  - [x] 实现 deleteFile() 方法
  - [x] 实现日期前缀逻辑（YYYY/MM/DD）

- [x] **Task 4: 创建 OssModule** (AC: And - OssModule)
  - [x] 创建 oss.module.ts
  - [x] 配置 OSS 客户端为提供者
  - [x] 导出 OssService
  - [x] 配置为全局模块 (@Global())

- [x] **Task 5: 实现 OSS 签名端点** (AC: And - 签名端点)
  - [x] 创建 oss.controller.ts
  - [x] 实现 POST /api/v1/oss/signature 端点
  - [x] 实现文件类型验证（jpg, jpeg, png, webp）
  - [x] 实现文件大小验证（5MB）
  - [x] 添加 Swagger 文档装饰器

- [x] **Task 6: 集成到 AppModule** (综合集成)
  - [x] 在 AppModule 中导入 OssModule
  - [x] 验证 OSS 服务可注入
  - [x] 测试签名端点可访问

- [x] **Task 7: 创建测试** (验证功能)
  - [x] 创建 oss.service.spec.ts
  - [x] 测试上传功能
  - [x] 测试签名生成
  - [x] 测试文件删除

## Dev Notes

### 架构模式和约束

**阿里云 OSS 配置规则：**
- **地域**: 华东1 (cn-hangzhou) 或其他
- **存储桶**: 需要提前在阿里云控制台创建
- **访问密钥**: 从阿里云 RAM 控制台获取
- **文件路径**: 自动添加日期前缀（YYYY/MM/DD/uuid.ext）

**⚠️ OSS_REGION 格式要求（CRITICAL）：**
- .env 中的 `OSS_REGION` 必须**包含** `oss-` 前缀
- ✅ 正确：`OSS_REGION="oss-cn-hangzhou"`
- ❌ 错误：`OSS_REGION="cn-hangzhou"`
- URL 生成格式：`https://{bucket}.{region}.aliyuncs.com/{path}`
- 示例：如果 bucket 是 `bmad-products`，region 是 `oss-cn-hangzhou`，则完整 URL 为：
  `https://bmad-products.oss-cn-hangzhou.aliyuncs.com/2024/01/09/uuid.jpg`

**安全考虑：**
- **密钥保护**: OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 必须存储在 .env，不能提交
- **签名验证**: 直传签名需要验证文件类型和大小
- **HTTPS**: 生产环境必须使用 HTTPS

### 源代码结构要求

**backend-api/src/oss/ 目录结构：**

```
backend-api/
├── src/
│   ├── oss/
│   │   ├── oss.module.ts           # OSS 模块
│   │   ├── oss.service.ts          # OSS 服务
│   │   ├── oss.controller.ts       # OSS 控制器
│   │   ├── dto/
│   │   │   └── upload-file.dto.ts  # 上传文件 DTO
│   │   └── oss.controller.spec.ts  # 测试
│   └── app.module.ts               # 导入 OssModule
```

### OssService 实现

**完整代码（src/oss/oss.service.ts）：**

```typescript
import { Injectable } from '@nestjs/common';
import * as OSS from 'ali-oss';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OssService {
  private client: OSS;

  constructor(private configService: ConfigService) {
    this.client = new OSS({
      region: this.configService.get('OSS_REGION'),
      accessKeyId: this.configService.get('OSS_ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get('OSS_ACCESS_KEY_SECRET'),
      bucket: this.configService.get('OSS_BUCKET'),
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
    return `https://${this.configService.get('OSS_BUCKET')}.${this.configService.get('OSS_REGION')}.aliyuncs.com/${fileName}`;
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
      expires: date,
      method: 'PUT',
    });
  }

  /**
   * 删除 OSS 文件
   * @param fileUrl 文件 URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const fileName = fileUrl.split('/').slice(-3).join('/');
    await this.client.delete(fileName);
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
```

### OssModule 实现

**完整代码（src/oss/oss.module.ts）：**

```typescript
import { Module, Global } from '@nestjs/common';
import { OssService } from './oss.service';
import { OssController } from './oss.controller';

@Global()
@Module({
  controllers: [OssController],
  providers: [OssService],
  exports: [OssService],
})
export class OssModule {}
```

### OssController 实现

**完整代码（src/oss/oss.controller.ts）：**

```typescript
import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
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
      throw new BadRequestException('Invalid file type. Only jpg, jpeg, png, webp are allowed.');
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
```

### DTO 定义

**create-upload.dto.ts:**

```typescript
import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadDto {
  @ApiProperty({ description: '文件名', example: 'product.jpg' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: '文件大小（字节）', example: 1024000 })
  @IsNumber()
  fileSize?: number;
}
```

### .env 配置

**环境变量（.env）：**

```env
# OSS Configuration
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="bmad-products"
```

**环境变量模板（.env.example）：**

```env
# OSS Configuration
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="bmad-products"
```

### 技术依赖和版本

**必需版本：**
- ali-oss: 最新版本
- @types/ali-oss: 最新版本
- uuid: 用于生成唯一文件名

**安装命令：**

```bash
npm install ali-oss uuid
npm install -D @types/ali-oss @types/uuid
```

### 测试要求

**手动验证测试：**
1. 调用 POST /api/v1/oss/signature 获取签名 URL
2. 使用签名 URL 上传测试图片
3. 验证文件类型检查（尝试上传非图片文件）
4. 验证文件大小检查（尝试上传 >5MB 文件）
5. 验证文件路径包含日期前缀

**单元测试示例：**

```typescript
describe('OssService', () => {
  let service: OssService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [OssService, ConfigService],
    }).compile();

    service = module.get<OssService>(OssService);
  });

  it('should validate file type correctly', () => {
    expect(service.validateFileType('test.jpg')).toBe(true);
    expect(service.validateFileType('test.png')).toBe(true);
    expect(service.validateFileType('test.pdf')).toBe(false);
  });

  it('should validate file size correctly', () => {
    expect(service.validateFileSize(1024)).toBe(true);
    expect(service.validateFileSize(6 * 1024 * 1024)).toBe(false);
  });
});
```

### 参考文档

| 文档 | 路径 | 关键章节 |
|------|------|---------|
| Epic 详细规划 | `_bmad-output/planning-artifacts/epics.md` | Story 1.5 |
| 技术架构 | `_bmad-output/planning-artifacts/architecture.md` | 文件存储与优化 |
| 阿里云 OSS 文档 | https://help.aliyun.com/product/31315 | SDK 使用指南 |

### 后续依赖

**此故事完成后，以下故事可开始：**
- Story 3.7: 实现产品图片上传（需要 OSS 服务）
- 所有需要文件上传的功能

**本故事为以下功能提供基础：**
- 产品图片上传
- 用户头像上传
- 其他文件存储需求

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Implementation Plan

**任务执行计划：**
1. Task 1: 安装 OSS 依赖（ali-oss, @types/ali-oss）
2. Task 2: 配置环境变量（.env, .env.example）
3. Task 3: 创建 OssService（uploadFile, generateSignedUrl, deleteFile）
4. Task 4: 创建 OssModule（全局模块）
5. Task 5: 实现 OSS 签名端点（/api/v1/oss/signature）
6. Task 6: 集成到 AppModule
7. Task 7: 创建测试

**技术决策预判：**
- OSS SDK: ali-oss 官方 SDK
- 文件命名: UUID + 日期前缀
- 签名有效期: 15 分钟
- 文件类型: jpg, jpeg, png, webp
- 文件大小: 最大 5MB
- 全局模块: @Global() 装饰器

### Completion Notes List

- Story 创建时间: 2026-01-13
- Sprint 状态文件位置: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- 所有必需文档已分析完成

**代码审查修复记录 (2026-01-13):**
- ✅ 添加 OSS_REGION 格式要求说明（必须包含 oss- 前缀）
- ✅ 改进 deleteFile URL 解析（使用 URL API 和错误处理）
- ✅ 添加 deleteFile 无效 URL 格式测试
- 所有 HIGH 和 MEDIUM 问题已修复

### File List

**待创建/修改文件：**
- `backend-api/package.json` (修改：添加 OSS 依赖)
- `backend-api/.env` (修改：添加 OSS 配置)
- `backend-api/.env.example` (修改：添加 OSS 配置模板)
- `backend-api/src/oss/oss.module.ts` (创建)
- `backend-api/src/oss/oss.service.ts` (创建)
- `backend-api/src/oss/oss.controller.ts` (创建)
- `backend-api/src/oss/dto/create-upload.dto.ts` (创建)
- `backend-api/src/oss/oss.controller.spec.ts` (创建)
- `backend-api/src/app.module.ts` (修改：导入 OssModule)
- `1-5-integrate-aliyun-oss.md` (本故事文件)
