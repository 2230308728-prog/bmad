# Story 2.3: 实现管理员账号密码登录

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 管理员,
I want 使用账号和密码登录管理后台,
So that 我可以安全地访问系统的管理功能。

## Acceptance Criteria

**Given** Epic 1、Epic 2.1、Epic 2.2 已完成（User 模型、JWT 基础设施已就绪）
**When** 创建 AdminAuthController（admin-auth.controller.ts）
**Then** 实现以下端点：
  - POST /api/v1/admin/auth/register: 管理员注册
  - POST /api/v1/admin/auth/login: 管理员登录

**When** POST /api/v1/admin/auth/register 接收请求：
  - Body: { email: string, password: string, nickname: string }
**Then** 验证 email 格式和密码强度（至少8位，包含字母和数字）
**And** 使用 bcrypt（salt rounds: 10）加密密码
**And** 创建管理员用户（role: ADMIN, status: ACTIVE）
**And** 返回 201 状态码和用户信息（不包含密码）

**When** POST /api/v1/admin/auth/login 接收请求：
  - Body: { email: string, password: string }
**Then** 验证 email 和密码是否正确
**And** 验证用户状态是否为 ACTIVE
**And** 生成访问令牌和刷新令牌（使用 Story 2.2 的 AuthService.generateTokens）
**And** 返回 200 状态码和响应：
  ```json
  {
    "data": {
      "accessToken": "string",
      "refreshToken": "string",
      "user": {
        "id": 1,
        "email": "admin@example.com",
        "nickname": "管理员",
        "role": "ADMIN"
      }
    }
  }
  ```
**And** 密码错误返回 401：{ "statusCode": 401, "message": "邮箱或密码错误" }
**And** 用户不存在返回 401：{ "statusCode": 401, "message": "邮箱或密码错误" }
**And** 用户被禁用返回 403：{ "statusCode": 403, "message": "账号已被禁用" }

## Tasks / Subtasks

- [x] **Task 1: 安装 bcrypt 相关依赖** (AC: Given - 依赖安装)
  - [x] 在 backend-api 目录执行 `npm install bcrypt @types/bcrypt`
  - [x] 验证 package.json 中依赖已添加
  - [x] 确认 TypeScript 类型定义正确

- [x] **Task 2: 创建 AdminAuth DTO** (AC: When - 请求体验证)
  - [x] 创建 backend-api/src/features/users/dto/admin-register.dto.ts
    - [x] 定义 email 字段（@IsEmail(), @IsNotEmpty()）
    - [x] 定义 password 字段（@IsString(), @MinLength(8), @Matches(/^(?=.*[A-Za-z])(?=.*\d)/)）
    - [x] 定义 nickname 字段（@IsString(), @IsNotEmpty()）
  - [x] 创建 backend-api/src/features/users/dto/admin-login.dto.ts
    - [x] 定义 email 字段（@IsEmail(), @IsNotEmpty()）
    - [x] 定义 password 字段（@IsString(), @IsNotEmpty()）

- [x] **Task 3: 创建 UsersService** (AC: Then - 业务逻辑)
  - [x] 创建 backend-api/src/features/users/users.service.ts
  - [x] 实现 createAdmin() 方法：
    - [x] 检查 email 是否已存在（抛出 ConflictException 如果存在）
    - [x] 使用 bcrypt.hash() 加密密码（salt rounds: 10）
    - [x] 使用 Prisma 创建 User（role: ADMIN, status: ACTIVE）
    - [x] 返回创建的用户（移除 password 字段）
  - [x] 实现 validateAdmin() 方法：
    - [x] 通过 email 查找用户（role: ADMIN）
    - [x] 如果用户不存在，抛出 UnauthorizedException
    - [x] 使用 bcrypt.compare() 验证密码
    - [x] 如果密码错误，抛出 UnauthorizedException
    - [x] 如果用户状态不是 ACTIVE，抛出 ForbiddenException
    - [x] 返回用户信息（移除 password 字段）
  - [x] 实现 findById() 方法：
    - [x] 通过 id 查找用户
    - [x] 返回用户信息（移除 password 字段）

- [x] **Task 4: 创建 AdminAuthController** (综合)
  - [x] 创建 backend-api/src/features/users/admin-auth.controller.ts
  - [x] 实现 POST /api/v1/admin/auth/register 端点：
    - [x] 使用 @Body() 验证 AdminRegisterDto
    - [x] 调用 usersService.createAdmin()
    - [x] 返回 201 和用户信息
  - [x] 实现 POST /api/v1/admin/auth/login 端点：
    - [x] 使用 @Body() 验证 AdminLoginDto
    - [x] 调用 usersService.validateAdmin()
    - [x] 调用 authService.generateTokens() 生成令牌
    - [x] 返回 200 和令牌 + 用户信息

- [x] **Task 5: 创建 UsersModule** (模块组织)
  - [x] 创建 backend-api/src/features/users/users.module.ts
  - [x] 导入 PrismaModule（或 PrismaService）
  - [x] 导入 AuthModule（使用 AuthService.generateTokens）
  - [x] 注册 UsersService 和 AdminAuthController
  - [x] 在 AppModule 中导入 UsersModule

- [x] **Task 6: 编写单元测试** (测试标准)
  - [x] 创建 users.service.spec.ts
    - [x] 测试 createAdmin() 创建管理员成功
    - [x] 测试 createAdmin() email 重复时抛出异常
    - [x] 测试 createAdmin() 密码正确加密
    - [x] 测试 validateAdmin() 验证成功
    - [x] 测试 validateAdmin() 用户不存在时抛出异常
    - [x] 测试 validateAdmin() 密码错误时抛出异常
    - [x] 测试 validateAdmin() 用户被禁用时抛出异常
  - [x] 创建 admin-auth.controller.spec.ts
    - [x] 测试 register 端点返回 201
    - [x] 测试 register 端点验证失败时返回 400
    - [x] 测试 login 端点返回 200 和令牌
    - [x] 测试 login 端点验证失败时返回 401

- [x] **Task 7: 验证和集成** (综合验证)
  - [x] 执行 `npm run build` 验证 TypeScript 编译通过
  - [x] 运行单元测试 `npm test users.service.spec`（所有测试通过）
  - [x] 运行单元测试 `npm test admin-auth.controller.spec`（所有测试通过）
  - [x] 手动测试注册端点（curl 或 Postman）
  - [x] 手动测试登录端点并验证 JWT 令牌
  - [x] 验证与 User 模型（Story 2.1）的集成
  - [x] 验证与 AuthService（Story 2.2）的集成

## Dev Notes

### 架构模式和约束

**关键架构决策（来自 architecture.md）：**
- **认证方案**: NestJS Auth Module + JWT
- **密码加密**: bcrypt（salt rounds: 10）
- **令牌管理**: 访问令牌（短期）+ 刷新令牌（长期）由 AuthService 生成
- **角色权限**: Guard 装饰器（Story 2.5 实现）

**数据模型集成（来自 Story 2.1）：**
- User 模型已创建，包含 Role 枚举（PARENT, ADMIN）
- User 模型字段：id, email?, nickname, password?, role, status, created_at, updated_at
- Role 枚举值：PARENT（家长）、ADMIN（管理员）
- UserStatus 枚举：ACTIVE、INACTIVE、BANNED
- Prisma 版本：7.2.0

**JWT 基础设施（来自 Story 2.2）：**
- AuthModule 是全局模块（@Global()）
- AuthService.generateTokens(userId, role) 生成令牌对
- AuthService 已在 AppModule 中导入

### 源代码结构要求

**backend-api/src/features/users/ 目录结构：**

```
backend-api/
├── src/
│   └── features/
│       └── users/
│           ├── users.module.ts           # Users 模块定义
│           ├── users.service.ts          # 用户业务逻辑
│           ├── admin-auth.controller.ts  # 管理员认证端点
│           ├── dto/
│           │   ├── admin-register.dto.ts
│           │   └── admin-login.dto.ts
│           ├── users.service.spec.ts     # 服务单元测试
│           └── admin-auth.controller.spec.ts  # 控制器单元测试
```

### 文件修改清单

**本故事需创建的文件：**

| 文件 | 说明 | 类型 |
|------|------|------|
| `backend-api/src/features/users/users.module.ts` | Users 模块定义 | 创建 |
| `backend-api/src/features/users/users.service.ts` | 用户服务 | 创建 |
| `backend-api/src/features/users/admin-auth.controller.ts` | 管理员认证控制器 | 创建 |
| `backend-api/src/features/users/dto/admin-register.dto.ts` | 注册 DTO | 创建 |
| `backend-api/src/features/users/dto/admin-login.dto.ts` | 登录 DTO | 创建 |
| `backend-api/src/features/users/users.service.spec.ts` | 服务单元测试 | 创建 |
| `backend-api/src/features/users/admin-auth.controller.spec.ts` | 控制器单元测试 | 创建 |
| `backend-api/src/app.module.ts` | 导入 UsersModule | 修改 |
| `backend-api/package.json` | 添加 bcrypt 依赖 | 修改 |

### bcrypt 密码加密实现要求

**最新最佳实践（2025）：**

```typescript
import * as bcrypt from 'bcrypt';

// 加密密码（salt rounds: 10）
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// 验证密码
const isPasswordValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**安全考虑：**
- **salt rounds: 10** - 平衡安全性和性能（2025年推荐值）
- **不使用 salt 参数** - bcrypt 自动生成随机 salt
- **异步操作** - 始终使用 async/await 避免阻塞事件循环
- **错误处理** - bcrypt 操作可能失败，需要 try-catch

**性能考虑：**
- salt rounds: 10 在现代 CPU 上约 100ms
- 登录路径是性能热点，但安全性更重要
- 注册路径可以接受稍慢的哈希速度

### UsersService 实现要求

**完整服务结构：**

```typescript
// backend-api/src/features/users/users.service.ts
import { Injectable, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建管理员用户
   * @param email 管理员邮箱
   * @param password 明文密码
   * @param nickname 昵称
   * @returns 创建的用户（不包含密码）
   * @throws ConflictException 如果邮箱已存在
   */
  async createAdmin(email: string, password: string, nickname: string) {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员用户
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    // 返回用户信息（移除密码）
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 验证管理员登录
   * @param email 邮箱
   * @param password 明文密码
   * @returns 验证通过的用户信息（不包含密码）
   * @throws UnauthorizedException 如果邮箱或密码错误
   * @throws ForbiddenException 如果账号被禁用
   */
  async validateAdmin(email: string, password: string) {
    // 查找管理员用户
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        role: Role.ADMIN,
      },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('账号已被禁用');
    }

    // 返回用户信息（移除密码）
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 根据 ID 查找用户
   * @param id 用户ID
   * @returns 用户信息（不包含密码）
   * @throws NotFoundException 如果用户不存在
   */
  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
```

### AdminAuthController 实现要求

```typescript
// backend-api/src/features/users/admin-auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthService } from '@/auth/auth.service';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '管理员注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '验证失败' })
  @ApiResponse({ status: 409, description: '邮箱已存在' })
  async register(@Body() registerDto: AdminRegisterDto) {
    const user = await this.usersService.createAdmin(
      registerDto.email,
      registerDto.password,
      registerDto.nickname,
    );

    return {
      data: user,
    };
  }

  @Post('login')
  @ApiOperation({ summary: '管理员登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  @ApiResponse({ status: 403, description: '账号已被禁用' })
  async login(@Body() loginDto: AdminLoginDto) {
    const user = await this.usersService.validateAdmin(
      loginDto.email,
      loginDto.password,
    );

    const tokens = await this.authService.generateTokens(user.id, user.role);

    return {
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
        },
      },
    };
  }
}
```

### DTO 实现要求

**AdminRegisterDto:**

```typescript
// backend-api/src/features/users/dto/admin-register.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class AdminRegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码至少8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password!: string;

  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  nickname!: string;
}
```

**AdminLoginDto:**

```typescript
// backend-api/src/features/users/dto/admin-login.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;

  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;
}
```

### UsersModule 实现要求

```typescript
// backend-api/src/features/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminAuthController } from './admin-auth.controller';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
```

**在 AppModule 中导入：**

```typescript
// backend-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { UsersModule } from './features/users/users.module';

@Module({
  imports: [
    // ... other imports
    UsersModule,
  ],
})
export class AppModule {}
```

### 测试要求

**单元测试（users.service.spec.ts）：**

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createAdmin', () => {
    it('should create admin user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        nickname: '管理员',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword');
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser);

      const result = await service.createAdmin(
        'admin@example.com',
        'Password123',
        '管理员',
      );

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('admin@example.com');
    });

    it('should throw ConflictException if email exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
      } as any);

      await expect(
        service.createAdmin('admin@example.com', 'Password123', '管理员'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateAdmin', () => {
    it('should validate admin successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await service.validateAdmin(
        'admin@example.com',
        'Password123',
      );

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('admin@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(
        service.validateAdmin('admin@example.com', 'Password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: Role.ADMIN,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        service.validateAdmin('admin@example.com', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if user is banned', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: Role.ADMIN,
        status: UserStatus.BANNED,
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await expect(
        service.validateAdmin('admin@example.com', 'Password123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
```

### 技术依赖和版本

**必需版本：**
- NestJS: 最新稳定版
- bcrypt: 最新稳定版（5.1.x）
- @types/bcrypt: 最新版
- Prisma: 7.2.0
- Node.js: 20+ LTS
- TypeScript: 5+

**NPM 命令：**
```bash
# 安装依赖
npm install bcrypt @types/bcrypt

# 运行测试
npm test users.service.spec
npm test admin-auth.controller.spec

# 构建
npm run build
```

### 参考文档

| 文档 | 路径 | 关键章节 |
|------|------|---------|
| Epic 详细规划 | `_bmad-output/planning-artifacts/epics.md` | Epic 2, Story 2.3 |
| 技术架构 | `_bmad-output/planning-artifacts/architecture.md` | 身份认证与安全 |
| 项目上下文 | `project-context.md` | Framework Rules |
| Story 2.1 | `_bmad-output/implementation-artifacts/2-1-design-user-data-model.md` | User 模型 |
| Story 2.2 | `_bmad-output/implementation-artifacts/2-2-implement-jwt-auth-infrastructure.md` | JWT 基础设施 |
| NestJS 加密哈希 | https://docs.nestjs.com/security/encryption-and-hashing | 官方文档 |
| NestJS 认证 | https://docs.nestjs.com/security/authentication | 官方文档 |

### 前序 Story 经验 (Story 2.1, 2.2)

**从 Story 2.1 学到的经验：**
1. **Prisma 版本**: 项目使用 Prisma 7.2.0，不是 5.x
2. **配置方式**: Prisma 7 使用 `prisma.config.ts` 配置数据库
3. **枚举类型**: Role 和 UserStatus 枚举已定义在 Prisma schema 中
4. **类型安全**: 使用 Prisma 生成的类型

**从 Story 2.2 学到的经验：**
1. **AuthService**: 已实现 generateTokens(userId, role) 方法
2. **全局模块**: AuthModule 使用 @Global() 装饰器
3. **导入路径**: 使用 @/ 别名导入模块（如 @/auth/auth.service）
4. **类型断言**: expiresIn 类型不兼容时使用 `as any` 并添加注释

### 安全考虑

**密码安全：**
- 密码强度要求：至少8位，包含字母和数字
- 使用 bcrypt 加密（salt rounds: 10）
- 密码永远不返回给前端
- 错误消息不泄露用户是否存在（统一返回"邮箱或密码错误"）

**认证安全：**
- 生成访问令牌和刷新令牌（由 Story 2.2 的 AuthService 提供）
- 访问令牌包含用户角色信息
- 禁用用户无法登录（检查 UserStatus）

**输入验证：**
- 使用 class-validator 验证所有输入
- 邮箱格式验证（@IsEmail()）
- 密码强度验证（@MinLength(8), @Matches(/^(?=.*[A-Za-z])(?=.*\d)/)）
- 昵称非空验证

### 性能考虑

**密码哈希性能：**
- salt rounds: 10 约 100ms，可接受
- 注册路径可接受稍慢的哈希速度
- 登录路径是性能热点，但安全性更重要

**数据库查询优化：**
- email 字段添加唯一索引（Story 2.1 已定义）
- 查询管理员时使用 WHERE 条件过滤（role: ADMIN）
- 避免返回 password 字段

### 常见问题和解决方案

**问题 1: bcrypt.compare 返回 false**
- 原因：密码未正确哈希或存储
- 排查：检查 createAdmin() 中的哈希逻辑
- 验证：确保 password 字段正确存储在数据库

**问题 2: 用户状态检查不生效**
- 原因：UserStatus 枚举导入错误
- 解决：从 @prisma/client 导入 UserStatus
- 验证：检查 status === UserStatus.ACTIVE

**问题 3: AuthService 未定义**
- 原因：AuthModule 未导入
- 解决：在 UsersModule 中导入 AuthModule
- 验证：检查 constructor 中的依赖注入

**问题 4: PrismaService 未定义**
- 原因：PrismaService 未提供
- 解决：在 UsersModule providers 中添加 PrismaService
- 验证：检查 constructor 中的依赖注入

### 后续依赖

**此故事完成后，以下故事可开始：**
- Story 2.4: 实现家长微信授权登录（需要 UsersService 和 AuthService）
- Story 2.5: 实现角色权限 Guard（需要 JwtStrategy 和登录功能）
- Story 2.6: 实现令牌刷新和会话管理（需要登录功能）

**本故事为以下功能提供基础：**
- 管理员后台登录
- 管理员用户管理
- 角色权限控制

## Change Log

**2026-01-13 - 代码审查修复：**
- HIGH 修复: 添加 @HttpCode(201) 到 register 端点（AC 要求返回 201 状态码）
- MEDIUM 修复: 更新 File List 记录所有修改的文件（包括 main.ts、schema.prisma、tsconfig.json）
- MEDIUM 修复: 添加 email null 断言（user.email!）确保类型安全
- MEDIUM 修复: 添加 DTO 验证测试（邮箱格式、密码强度）
- MEDIUM 修复: 添加 HTTP 状态码验证测试
- 更新 AdminAuthController 导入 HttpCode 装饰器

**2026-01-13 - Story 实现：**
- 安装 bcrypt 相关依赖包：bcrypt 6.0.0, @types/bcrypt 6.0.0
- 创建 AdminAuth DTO（AdminRegisterDto, AdminLoginDto）
  - 邮箱格式验证
  - 密码强度验证（至少8位，包含字母和数字）
  - 昵称非空验证
- 创建 UsersService：
  - createAdmin() 方法：检查邮箱重复、bcrypt 密码加密、创建管理员用户
  - validateAdmin() 方法：验证邮箱和密码、检查用户状态
  - findById() 方法：根据 ID 查找用户
- 创建 AdminAuthController：
  - POST /admin/auth/register：管理员注册端点
  - POST /admin/auth/login：管理员登录端点（返回 JWT 令牌）
- 创建 UsersModule 并集成到 AppModule
- 配置 TypeScript 路径别名（@/*）
- 配置 Jest moduleNameMapper 支持 @/ 别名
- 更新 Prisma Schema：添加 email 和 password 字段到 User 模型
- 生成 Prisma Client
- 编写完整的单元测试：
  - UsersService: 12 个测试全部通过
  - AdminAuthController: 8 个测试全部通过（新增 3 个）
  - 总计 90/90 测试通过

**技术决策：**
- bcrypt 版本: 6.0.0（最新稳定版）
- salt rounds: 10（2025年推荐值，平衡安全性和性能）
- 密码验证: 包含字母和数字的正则表达式 `/^(?=.*[A-Za-z])(?=.*\d)/`
- 错误处理: 统一返回"邮箱或密码错误"不泄露用户是否存在
- UsersService: 单独服务，供后续 Story 2.4/2.5 使用
- 路径别名: 使用 @/ 别名简化导入路径
- Prisma Schema: email 和 password 可选字段（支持两种登录方式）

**遇到的问题和解决方案：**
- 问题 1: Prisma Schema 缺少 email 和 password 字段
  - 解决: 更新 schema.prisma 添加字段，重新生成 Prisma Client
- 问题 2: TypeScript 无法识别 @/ 路径别名
  - 解决: 在 tsconfig.json 中添加 paths 配置
- 问题 3: Jest 无法识别 @/ 路径别名
  - 解决: 在 package.json 的 Jest 配置中添加 moduleNameMapper
- 问题 4: bcrypt.compare() 类型错误（password 可能为 null）
  - 解决: 在比较前添加 null 检查
- 问题 5: Jest spyOn 与原生 bcrypt 模块冲突
  - 解决: 使用 jest.mock() 在顶层模拟 bcrypt 模块
- 问题 6: 注册端点返回 200 而非 201 状态码（代码审查发现）
  - 解决: 添加 @HttpCode(201) 装饰器
- 问题 7: user.email 可能为 null 导致类型不安全（代码审查发现）
  - 解决: 使用 non-null 断言 user.email!
- 问题 8: 测试缺少 DTO 验证和 HTTP 状态码覆盖（代码审查发现）
  - 解决: 添加新的测试用例

**2026-01-13 - Story 创建：**
- 从 Epic 文档提取完整验收标准
- 集成 Story 2.1 的 User 模型和 Role 枚举
- 集成 Story 2.2 的 JWT 基础设施
- 添加 Prisma 7.2.0 兼容性说明
- 创建详细的实现指南和代码示例
- 定义单元测试要求和模板
- 添加 2025 年 bcrypt 最佳实践（来源：2025年1月最新文档）

## Dev Agent Record

glm-4.7 (claude-opus-4-5-20251101)

### Debug Log References

### Implementation Plan

**任务执行计划：**
1. Task 1: 安装 bcrypt 相关依赖包
2. Task 2: 创建 AdminAuth DTO（注册和登录）
3. Task 3: 创建 UsersService（createAdmin, validateAdmin, findById）
4. Task 4: 创建 AdminAuthController（register, login 端点）
5. Task 5: 创建 UsersModule 并集成到 AppModule
6. Task 6: 编写完整的单元测试
7. Task 7: 验证集成和构建

**技术决策：**
- bcrypt 版本: 最新稳定版（5.1.x）
- salt rounds: 10（2025年推荐值）
- 密码验证: 包含字母和数字的正则表达式
- 错误处理: 统一返回"邮箱或密码错误"不泄露用户是否存在
- UsersService: 单独服务，供后续 Story 2.4/2.5 使用
- AuthModule: 全局模块，直接导入使用 AuthService

### Completion Notes List

### File List

**创建文件：**
- `backend-api/src/features/users/users.module.ts`
- `backend-api/src/features/users/users.service.ts`
- `backend-api/src/features/users/admin-auth.controller.ts`
- `backend-api/src/features/users/dto/admin-register.dto.ts`
- `backend-api/src/features/users/dto/admin-login.dto.ts`
- `backend-api/src/features/users/users.service.spec.ts`
- `backend-api/src/features/users/admin-auth.controller.spec.ts`

**修改文件：**
- `backend-api/package.json` （添加 Jest moduleNameMapper 配置）
- `backend-api/tsconfig.json` （添加 paths 配置支持 @/ 别名）
- `backend-api/prisma/schema.prisma` （添加 email 和 password 字段到 User 模型）
- `backend-api/src/app.module.ts` （更新 UsersModule 导入路径）
- `backend-api/src/main.ts` （已存在，包含全局 ValidationPipe 配置）
- `backend-api/src/features/users/admin-auth.controller.ts` （代码审查修复：添加 @HttpCode(201) 和 email null 断言）
- `backend-api/src/features/users/admin-auth.controller.spec.ts` （代码审查修复：添加 DTO 验证和 HTTP 状态码测试）
- `2-3-implement-admin-password-login.md` （本故事文件）
