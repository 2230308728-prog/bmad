# Story 2.4: 实现家长微信授权登录

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 家长,
I want 使用微信授权快速登录小程序,
So that 我无需记住密码即可方便地访问系统功能。

## Acceptance Criteria

**Given** Epic 1、Epic 2.1、Epic 2.2 已完成（User 模型、JWT 基础设施已就绪）
**When** 创建 ParentAuthController（parent-auth.controller.ts）
**Then** 实现以下端点：
  - POST /api/v1/parent/auth/wechat-login: 微信授权登录

**When** POST /api/v1/parent/auth/wechat-login 接收请求：
  - Body: { code: string, userInfo: { nickname: string, avatarUrl: string } }
**Then** 使用微信 code 调用微信 API 换取 openid
**And** 微信 API 调用地址：https://api.weixin.qq.com/sns/jscode2session
**And** 从环境变量读取 WECHAT_APP_ID 和 WECHAT_APP_SECRET
**And** 根据 openid 查询数据库：
  - 如果用户存在：更新昵称和头像
  - 如果用户不存在：创建新用户（role: PARENT, status: ACTIVE）
**And** 生成访问令牌和刷新令牌（使用 Story 2.2 的 AuthService.generateTokens）
**And** 返回 200 状态码和响应：
  ```json
  {
    "data": {
      "accessToken": "string",
      "refreshToken": "string",
      "user": {
        "id": 1,
        "nickname": "微信用户",
        "avatarUrl": "https://...",
        "role": "PARENT"
      }
    }
  }
  ```

**When** 微信 API 调用失败（code 无效或过期）
**Then** 返回 401：{ "statusCode": 401, "message": "微信授权失败，请重试" }
**And** 记录错误日志包含微信 API 返回的详细信息

**And** 创建 WechatService（wechat.service.ts）封装微信 API 调用

## Tasks / Subtasks

- [x] **Task 1: 安装 HTTP 客户端依赖** (AC: Given - 依赖安装)
  - [x] 在 backend-api 目录安装 axios 或 @nestjs/axios
  - [x] 验证 package.json 中依赖已添加
  - [x] 确认 TypeScript 类型定义正确

- [x] **Task 2: 配置微信环境变量** (AC: Then - 环境配置)
  - [x] 在 .env 和 .env.example 添加 WECHAT_APP_ID
  - [x] 在 .env 和 .env.example 添加 WECHAT_APP_SECRET
  - [x] 更新 ConfigSchema（如果使用 @nestjs/config）

- [x] **Task 3: 创建 WechatLogin DTO** (AC: When - 请求体验证)
  - [x] 创建 backend-api/src/features/users/dto/wechat-login.dto.ts
    - [x] 定义 code 字段（@IsString(), @IsNotEmpty()）
    - [x] 定义 userInfo 嵌套对象：
      - [x] nickname: @IsString(), @IsOptional()
      - [x] avatarUrl: @IsString(), @IsOptional()

- [x] **Task 4: 创建 WechatService** (AC: Then - 微信 API 封装)
  - [x] 创建 backend-api/src/features/users/wechat.service.ts
  - [x] 实现 jscode2session() 方法：
    - [x] 调用微信 API: https://api.weixin.qq.com/sns/jscode2session
    - [x] 传递参数：appid, secret, js_code, grant_type=authorization_code
    - [x] 处理成功响应，返回 { openid, session_key }
    - [x] 处理失败响应，抛出 UnauthorizedException
    - [ ] 添加重试逻辑（可选，最多3次）
    - [x] 添加超时配置（5秒）
  - [ ] 实现 getUserInfo() 方法（可选，获取微信用户详细信息）

- [x] **Task 5: 扩展 UsersService** (综合 - 用户管理逻辑)
  - [x] 在 UsersService 中添加 findOrCreateParent() 方法：
    - [x] 根据 openid 查找用户（role: PARENT）
    - [x] 如果用户存在：更新 nickname 和 avatarUrl
    - [x] 如果用户不存在：创建新用户（role: PARENT, status: ACTIVE）
    - [x] 返回用户信息（移除 openid 字段）
  - [x] 添加 updateParentProfile() 方法：
    - [x] 更新用户的 nickname 和 avatarUrl
    - [x] 返回更新后的用户信息

- [x] **Task 6: 创建 ParentAuthController** (综合)
  - [x] 创建 backend-api/src/features/users/parent-auth.controller.ts
  - [x] 实现 POST /api/v1/parent/auth/wechat-login 端点：
    - [x] 使用 @Body() 验证 WechatLoginDto
    - [x] 调用 wechatService.jscode2session() 获取 openid
    - [x] 调用 usersService.findOrCreateParent() 处理用户
    - [x] 调用 authService.generateTokens() 生成令牌
    - [x] 返回 200 和令牌 + 用户信息
  - [x] 添加错误处理：微信 API 失败时返回 401
  - [x] 添加日志记录：记录微信 API 调用详情

- [x] **Task 7: 更新 UsersModule** (模块组织)
  - [x] 在 UsersModule 中注册 WechatService
  - [x] 在 UsersModule 中注册 ParentAuthController
  - [x] 导出 WechatService（供其他模块使用）

- [x] **Task 8: 编写单元测试** (测试标准)
  - [x] 创建 wechat.service.spec.ts
    - [x] 测试 jscode2session() 成功换取 openid
    - [x] 测试 jscode2session() 微信 API 失败时抛出异常
    - [ ] 测试 jscode2session() 重试逻辑（如果实现）
    - [x] 测试 jscode2session() 超时处理
  - [x] 创建 parent-auth.controller.spec.ts
    - [x] 测试 wechat-login 端点成功返回 200 和令牌
    - [x] 测试 wechat-login 端点微信 API 失败返回 401
    - [x] 测试 wechat-login 端点用户已存在时更新资料
    - [x] 测试 wechat-login 端点新用户创建成功
  - [x] 更新 users.service.spec.ts
    - [x] 添加 findOrCreateParent() 测试
    - [x] 添加 updateParentProfile() 测试

- [x] **Task 9: 验证和集成** (综合验证)
  - [x] 执行 `npm run build` 验证 TypeScript 编译通过
  - [x] 运行单元测试（所有测试通过）
  - [ ] 手动测试微信登录端点（使用真实微信 code 或 mock）
  - [x] 验证与 User 模型（Story 2.1）的集成
  - [x] 验证与 AuthService（Story 2.2）的集成
  - [x] 验证与 UsersService（Story 2.3）的集成

## Dev Notes

### 架构模式和约束

**关键架构决策（来自 architecture.md）：**
- **认证方案**: 小程序端微信授权登录 → JWT 令牌
- **令牌管理**: 访问令牌（短期）+ 刷新令牌（长期）由 AuthService 生成
- **HTTP 客户端**: axios 或 @nestjs/axios（推荐）
- **微信 API**: jscode2session 接口
- **环境配置**: @nestjs/config + .env 文件
- **错误处理**: NestJS 异常过滤器 + 结构化日志

**数据模型集成（来自 Story 2.1）：**
- User 模型已创建，包含 Role 枚举（PARENT, ADMIN）
- User 模型字段：id, openid?, nickname, avatarUrl, phone, role, status, created_at, updated_at
- Role 枚举值：PARENT（家长）、ADMIN（管理员）
- UserStatus 枚举：ACTIVE、INACTIVE、BANNED
- Prisma 版本：7.2.0

**JWT 基础设施（来自 Story 2.2）：**
- AuthModule 是全局模块（@Global()）
- AuthService.generateTokens(userId, role) 生成令牌对
- AuthService 已在 AppModule 中导入

**UsersService 集成（来自 Story 2.3）：**
- UsersService 已实现 findById()、createAdmin()、validateAdmin()
- 使用 PrismaService 访问数据库
- 密码使用 bcrypt 加密（仅 ADMIN 用户）

### 源代码结构要求

**backend-api/src/features/users/ 目录结构（新增文件）：**

```
backend-api/
├── src/
│   └── features/
│       └── users/
│           ├── users.module.ts           # Users 模块定义（已存在，需更新）
│           ├── users.service.ts          # 用户服务（已存在，需扩展）
│           ├── admin-auth.controller.ts  # 管理员认证控制器（已存在）
│           ├── parent-auth.controller.ts # 家长认证控制器（新建）
│           ├── wechat.service.ts         # 微信服务（新建）
│           ├── dto/
│           │   ├── admin-register.dto.ts
│           │   ├── admin-login.dto.ts
│           │   └── wechat-login.dto.ts   # 新建
│           ├── users.service.spec.ts     # 服务单元测试（已存在，需扩展）
│           ├── admin-auth.controller.spec.ts  # 管理员认证测试（已存在）
│           ├── wechat.service.spec.ts    # 微信服务测试（新建）
│           └── parent-auth.controller.spec.ts # 家长认证测试（新建）
```

### 文件修改清单

**本故事需创建的文件：**

| 文件 | 说明 | 类型 |
|------|------|------|
| `backend-api/src/features/users/wechat.service.ts` | 微信 API 服务 | 创建 |
| `backend-api/src/features/users/parent-auth.controller.ts` | 家长认证控制器 | 创建 |
| `backend-api/src/features/users/dto/wechat-login.dto.ts` | 微信登录 DTO | 创建 |
| `backend-api/src/features/users/wechat.service.spec.ts` | 微信服务测试 | 创建 |
| `backend-api/src/features/users/parent-auth.controller.spec.ts` | 家长认证测试 | 创建 |
| `backend-api/.env` | 微信配置 | 修改 |
| `backend-api/.env.example` | 微信配置模板 | 修改 |
| `backend-api/src/features/users/users.service.ts` | 扩展用户服务 | 修改 |
| `backend-api/src/features/users/users.module.ts` | 注册新服务 | 修改 |
| `backend-api/package.json` | 添加 axios 依赖 | 修改 |

### 微信 API 实现要求

**微信 jscode2session API：**

```typescript
// API 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2session.html

interface WechatJscode2sessionResponse {
  openid: string;           // 用户唯一标识
  session_key: string;      // 会话密钥
  unionid?: string;          // 用户在开放平台的唯一标识符（暂不需要）
  errcode?: number;         // 错误码
  errmsg?: string;          // 错误信息
}

// 请求参数
interface WechatJscode2sessionRequest {
  appid: string;             // 小程序 appId
  secret: string;            // 小程序 appSecret
  js_code: string;           // 登录时获取的 code
  grant_type: string;       // 授权类型，此处只需填写 authorization_code
}
```

**API 调用示例：**

```typescript
const url = 'https://api.weixin.qq.com/sns/jscode2session';
const params = {
  appid: this.appId,
  secret: this.appSecret,
  js_code: code,
  grant_type: 'authorization_code',
};

const response = await axios.get<WechatJscode2sessionResponse>(url, { params });
```

**错误码处理：**

```typescript
// 成功
{ openid: "oXXXX...", session_key: "xxx..." }

// 失败
{ errcode: 40029, errmsg: "invalid code" }
{ errcode: 40163, errmsg: "code been used" }
{ errcode: 40013, errmsg: "invalid appid" }
```

### WechatService 实现要求

**完整服务结构：**

```typescript
// backend-api/src/features/users/wechat.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios'; // 或使用 axios
import { retry, catchError } from 'rxjs/operators';
import { throwError, Observable, of } from 'rxjs';

interface Jscode2sessionResponse {
  openid: string;
  session_key: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly jscode2sessionUrl = 'https://api.weixin.qq.com/sns/jscode2session';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService, // 如果使用 @nestjs/axios
  ) {
    this.appId = this.configService.get<string>('WECHAT_APP_ID');
    this.appSecret = this.configService.get<string>('WECHAT_APP_SECRET');

    if (!this.appId || !this.appSecret) {
      throw new Error('WECHAT_APP_ID and WECHAT_APP_SECRET must be configured');
    }
  }

  /**
   * 使用微信 code 换取 openid
   * @param code 微信登录 code
   * @returns openid
   * @throws UnauthorizedException 如果微信 API 调用失败
   */
  async jscode2session(code: string): Promise<string> {
    try {
      this.logger.log(`Exchanging code for openid: ${code.substring(0, 10)}...`);

      const params = {
        appid: this.appId,
        secret: this.appSecret,
        js_code: code,
        grant_type: 'authorization_code',
      };

      // 使用 @nestjs/axios
      const response = await this.httpService.get<Jscode2sessionResponse>(
        this.jscode2sessionUrl,
        { params, timeout: 5000 },
      );

      // 或者使用 axios（如果不使用 @nestjs/axios）
      // const axios = require('axios');
      // const response = await axios.get(this.jscode2sessionUrl, { params, timeout: 5000 });

      if (response.data.errcode) {
        this.logger.error(`WeChat API error: ${response.data.errcode} - ${response.data.errmsg}`);
        throw new UnauthorizedException('微信授权失败，请重试');
      }

      this.logger.log(`Successfully obtained openid: ${response.data.openid.substring(0, 10)}...`);

      return response.data.openid;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`WeChat API call failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('微信授权失败，请重试');
    }
  }
}
```

**不使用 @nestjs/axios 的替代方案（使用 axios）：**

```typescript
import axios from 'axios';

@Injectable()
export class WechatService {
  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('WECHAT_APP_ID');
    this.appSecret = this.configService.get<string>('WECHAT_APP_SECRET');
  }

  async jscode2session(code: string): Promise<string> {
    try {
      const params = new URLSearchParams();
      params.append('appid', this.appId);
      params.append('secret', this.appSecret);
      params.append('js_code', code);
      params.append('grant_type', 'authorization_code');

      const response = await axios.get<Jscode2sessionResponse>(
        this.jscode2sessionUrl,
        { params, timeout: 5000 },
      );

      if (response.data.errcode) {
        throw new UnauthorizedException('微信授权失败，请重试');
      }

      return response.data.openid;
    } catch (error) {
      throw new UnauthorizedException('微信授权失败，请重试');
    }
  }
}
```

### UsersService 扩展要求

**新增方法：**

```typescript
// backend-api/src/features/users/users.service.ts（扩展）

/**
 * 查找或创建家长用户（微信登录）
 * @param openid 微信 openid
 * @param nickname 昵称
 * @param avatarUrl 头像 URL
 * @returns 用户信息（不包含 openid）
 */
async findOrCreateParent(
  openid: string,
  nickname?: string,
  avatarUrl?: string,
): Promise<User> {
  // 查找现有用户
  const existingUser = await this.prisma.user.findUnique({
    where: { openid },
  });

  if (existingUser) {
    // 用户已存在，更新昵称和头像
    const updatedUser = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...(nickname && { nickname }),
        ...(avatarUrl && { avatarUrl }),
      },
    });

    const { openid: _, ...userWithoutOpenid } = updatedUser;
    return userWithoutOpenid as any;
  }

  // 创建新用户
  const newUser = await this.prisma.user.create({
    data: {
      openid,
      nickname: nickname || '微信用户',
      avatarUrl,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
    },
  });

  const { openid: _, ...userWithoutOpenid } = newUser;
  return userWithoutOpenid as any;
}

/**
 * 更新家长资料
 * @param userId 用户ID
 * @param nickname 昵称
 * @param avatarUrl 头像 URL
 * @returns 更新后的用户信息
 */
async updateParentProfile(
  userId: number,
  nickname?: string,
  avatarUrl?: string,
): Promise<User> {
  const updatedUser = await this.prisma.user.update({
    where: { id: userId },
    data: {
      ...(nickname && { nickname }),
      ...(avatarUrl && { avatarUrl }),
    },
  });

  const { password: _, openid: __, ...userWithoutSensitive } = updatedUser;
  return userWithoutSensitive;
}
```

### ParentAuthController 实现要求

```typescript
// backend-api/src/features/users/parent-auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WechatService } from './wechat.service';
import { UsersService } from './users.service';
import { AuthService } from '@/auth/auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';

@ApiTags('parent-auth')
@Controller('parent/auth')
export class ParentAuthController {
  constructor(
    private readonly wechatService: WechatService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('wechat-login')
  @ApiOperation({ summary: '家长微信授权登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '微信授权失败' })
  async wechatLogin(@Body() loginDto: WechatLoginDto) {
    // 1. 使用 code 换取 openid
    const openid = await this.wechatService.jscode2session(loginDto.code);

    // 2. 查找或创建用户
    const user = await this.usersService.findOrCreateParent(
      openid,
      loginDto.userInfo?.nickname,
      loginDto.userInfo?.avatarUrl,
    );

    // 3. 生成令牌
    const tokens = await this.authService.generateTokens(user.id, user.role);

    // 4. 返回响应
    return {
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      },
    };
  }
}
```

### DTO 实现要求

**WechatLoginDto:**

```typescript
// backend-api/src/features/users/dto/wechat-login.dto.ts
import { IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WechatUserInfoDto {
  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

export class WechatLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'code不能为空' })
  code!: string;

  @ValidateNested()
  @Type(() => WechatUserInfoDto)
  @IsOptional()
  userInfo?: WechatUserInfoDto;
}
```

### 环境变量配置

**.env 和 .env.example：**

```bash
# WeChat Mini Program Configuration
WECHAT_APP_ID="your_wechat_appid"
WECHAT_APP_SECRET="your_wechat_app_secret"
```

**ConfigSchema（如果使用 @nestjs/config）：**

```typescript
// backend-api/src/config/configuration.ts
import { registerAs } from '@nestjs/config';

export default registerAs('configuration', () => ({
  // ... 其他配置

  wechat: {
    appId: process.env.WECHAT_APP_ID,
    appSecret: process.env.WECHAT_APP_SECRET,
  },
}));
```

### 测试要求

**WechatService 单元测试：**

```typescript
// backend-api/src/features/users/wechat.service.spec.ts
describe('WechatService', () => {
  let service: WechatService;
  let configService: ConfigService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'WECHAT_APP_ID') return 'test_appid';
              if (key === 'WECHAT_APP_SECRET') return 'test_secret';
              return undefined;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WechatService>(WechatService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
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
      };

      (httpService.get as jest.Mock).mockResolvedValue(mockResponse);

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
        },
      );
    });

    it('should throw UnauthorizedException when WeChat API returns error', async () => {
      // Arrange
      const mockResponse = {
        data: {
          errcode: 40029,
          errmsg: 'invalid code',
        },
      };

      (httpService.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.jscode2session('invalid_code'))
        .rejects.toThrow(UnauthorizedException);
      await expect(service.jscode2session('invalid_code'))
        .rejects.toThrow('微信授权失败，请重试');
    });

    it('should throw UnauthorizedException when network error occurs', async () => {
      // Arrange
      (httpService.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.jscode2session('any_code'))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### 技术依赖和版本

**必需版本：**
- NestJS: 最新稳定版
- axios 或 @nestjs/axios: 最新稳定版
- Prisma: 7.2.0
- Node.js: 20+ LTS
- TypeScript: 5+

**NPM 命令：**
```bash
# 安装依赖（axios）
npm install axios @types/axios

# 或安装 @nestjs/axios
npm install @nestjs/axios

# 运行测试
npm test wechat.service.spec
npm test parent-auth.controller.spec

# 构建
npm run build
```

**@nestjs/axios vs axios 对比：**

| 特性 | axios | @nestjs/axios |
|------|-------|----------------|
| 配置 | 手动配置 | 自动注册 HttpModule |
| 拦截器 | 手动添加 | 使用 NestJS 拦截器 |
| 日志 | 手动添加 | 集成 NestJS Logger |
| 推荐 | 简单场景 | NestJS 项目（推荐） |

### 参考文档

| 文档 | 路径 | 关键章节 |
|------|------|---------|
| Epic 详细规划 | `_bmad-output/planning-artifacts/epics.md` | Epic 2, Story 2.4 |
| 技术架构 | `_bmad-output/planning-artifacts/architecture.md` | 身份认证与安全 |
| Story 2.1 | `_bmad-output/implementation-artifacts/2-1-design-user-data-model.md` | User 模型 |
| Story 2.2 | `_bmad-output/implementation-artifacts/2-2-implement-jwt-auth-infrastructure.md` | JWT 基础设施 |
| Story 2.3 | `_bmad-output/implementation-artifacts/2-3-implement-admin-password-login.md` | UsersService 集成 |
| 微信登录 API | https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2session.html | 官方文档 |
| NestJS HTTP | https://docs.nestjs.com/techniques/http-module | 官方文档 |

### 前序 Story 经验 (Story 2.1, 2.2, 2.3)

**从 Story 2.1 学到的经验：**
1. **Prisma 版本**: 项目使用 Prisma 7.2.0
2. **User 模型**: openid 字段已定义，支持微信登录
3. **枚举类型**: Role 和 UserStatus 枚举已定义

**从 Story 2.2 学到的经验：**
1. **AuthService**: generateTokens(userId, role) 生成令牌对
2. **全局模块**: AuthModule 使用 @Global() 装饰器
3. **导入路径**: 使用 @/ 别名导入模块

**从 Story 2.3 学到的经验：**
1. **UsersService**: 已实现基础方法，可复用代码
2. **UsersModule**: 已集成 PrismaService 和 AuthModule
3. **测试模式**: jest.mock() 用于模拟外部服务
4. **路径别名**: tsconfig.json 和 Jest 已配置

### 安全考虑

**微信 API 安全：**
- **密钥管理**: WECHAT_APP_SECRET 绝不泄露到前端
- **环境隔离**: 开发/测试/生产环境使用不同的 appId
- **日志记录**: 记录微信 API 调用详情（不含敏感信息）
- **错误处理**: 不暴露微信 API 错误细节给前端

**用户数据安全：**
- **openid 保护**: openid 永不返回给前端
- **昵称和头像**: 用户可选择更新
- **自动创建**: 首次登录自动创建用户（role: PARENT）

**认证安全：**
- **code 一次性**: 微信 code 只能使用一次
- **code 过期**: code 5分钟过期
- **令牌生成**: 复用 Story 2.2 的 JWT 令牌机制

### 性能考虑

**微信 API 性能：**
- **超时配置**: 5秒超时，避免长时间等待
- **重试逻辑**: 可选重试机制（最多3次）
- **异步调用**: 不阻塞事件循环

**数据库查询优化：**
- openid 字段已添加唯一索引（Story 2.1 已定义）
- upsert 操作：一次查询完成查找或创建

### 常见问题和解决方案

**问题 1: 微信 API 调用超时**
- 原因：网络问题或微信服务器响应慢
- 排查：检查网络连接，增加超时时间
- 解决：添加重试逻辑，提供友好的错误消息

**问题 2: code 无效**
- 原因：code 已使用或过期（5分钟）
- 排查：检查 code 获取时机
- 解决：提示用户重新授权

**问题 3: openid 已存在但 role 错误**
- 原因：数据库脏数据
- 排查：检查用户记录的 role 字段
- 解决：添加 role 验证逻辑

**问题 4: @nestjs/axios 类型错误**
- 原因：版本不兼容
- 解决：使用原生 axios 或更新版本

### 后续依赖

**此故事完成后，以下故事可开始：**
- Story 2.5: 实现角色权限 Guard（需要登录功能）
- Story 2.6: 实现令牌刷新和会话管理（需要登录功能）

**本故事为以下功能提供基础：**
- 家长用户管理
- 微信支付集成（需要微信 openid）
- 订单提交（需要家长身份）

## Change Log

**2026-01-13 - Code Review 修复：**
- 修复 M1: 添加 avatarUrl null 值处理 (parent-auth.controller.ts:49)
- 修复 M2: 更新 File List，说明 .env 为本地配置未提交
- 修复 M3: 添加角色验证逻辑，确保返回用户为 PARENT 角色
- 新增测试：验证 ADMIN 角色用户登录时自动更新为 PARENT
- 测试结果：32 个测试全部通过

**2026-01-13 - Story 实现：**
- 完成 WechatService 实现，集成微信 jscode2session API
- 完成 ParentAuthController 实现，提供 /parent/auth/wechat-login 端点
- 扩展 UsersService，添加 findOrCreateParent() 和 updateParentProfile() 方法
- 创建 WechatLoginDto，支持嵌套 userInfo 对象验证
- 完成所有单元测试（31 个测试全部通过）
- 配置微信环境变量（WECHAT_APP_ID, WECHAT_APP_SECRET）
- 集成 @nestjs/axios 作为 HTTP 客户端
- 验证与 User 模型、AuthService、UsersService 的集成

**2026-01-13 - Story 创建：**
- 从 Epic 文档提取完整验收标准
- 集成 Story 2.1 的 User 模型和 openid 字段
- 集成 Story 2.2 的 JWT 基础设施
- 集成 Story 2.3 的 UsersService 和用户管理逻辑
- 创建详细的实现指南和代码示例
- 定义单元测试要求和模板
- 添加微信 API 官档参考（2025年1月）

**技术决策：**
- HTTP 客户端: @nestjs/axios（推荐）或 axios
- 微信 API: jscode2session 接口
- 用户创建: 自动创建（role: PARENT, status: ACTIVE）
- 错误处理: 统一返回"微信授权失败，请重试"
- 日志记录: 记录微信 API 调用详情
- 超时配置: 5秒超时
- WechatService: 独立服务封装微信 API 调用

## Dev Agent Record

glm-4.7 (claude-opus-4.5-20251101)

### Debug Log References

### Implementation Plan

**任务执行计划：**
1. Task 1: 安装 HTTP 客户端依赖（axios 或 @nestjs/axios）
2. Task 2: 配置微信环境变量（WECHAT_APP_ID, WECHAT_APP_SECRET）
3. Task 3: 创建 WechatLogin DTO
4. Task 4: 创建 WechatService（封装微信 jscode2session API）
5. Task 5: 扩展 UsersService（添加 findOrCreateParent, updateParentProfile）
6. Task 6: 创建 ParentAuthController（实现 wechat-login 端点）
7. Task 7: 更新 UsersModule（注册新服务和控制器）
8. Task 8: 编写完整的单元测试
9. Task 9: 验证集成和构建

**技术决策：**
- HTTP 客户端待定：@nestjs/axios（推荐）或 axios（根据开发者偏好）
- 微信 API: jscode2session 接口，5秒超时
- 用户创建: 首次登录自动创建 PARENT 用户
- 错误处理: 统一返回 401 "微信授权失败，请重试"
- 日志记录: 使用 NestJS Logger 记录微信 API 调用
- WechatService: 独立服务，便于测试和重用

### Completion Notes List

### File List

**创建文件：**
- `backend-api/src/features/users/wechat.service.ts`
- `backend-api/src/features/users/parent-auth.controller.ts`
- `backend-api/src/features/users/dto/wechat-login.dto.ts`
- `backend-api/src/features/users/wechat.service.spec.ts`
- `backend-api/src/features/users/parent-auth.controller.spec.ts`

**修改文件：**
- `backend-api/.env.example` （添加微信配置模板）
- `backend-api/.env` （本地配置，未提交到 git）
- `backend-api/src/features/users/users.service.ts` （添加 findOrCreateParent, updateParentProfile，添加角色验证）
- `backend-api/src/features/users/users.service.spec.ts` （添加 findOrCreateParent, updateParentProfile 测试）
- `backend-api/src/features/users/users.module.ts` （注册 WechatService, ParentAuthController, 导入 HttpModule）
- `backend-api/package.json` （添加 @nestjs/axios 依赖）
- `backend-api/src/features/users/parent-auth.controller.ts` （添加 avatarUrl null 处理）
- `2-4-implement-parent-wechat-login.md` （本故事文件）
