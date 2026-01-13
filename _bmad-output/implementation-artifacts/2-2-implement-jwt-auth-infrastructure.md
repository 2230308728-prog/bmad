# Story 2.2: 实现 JWT 认证基础设施

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 配置 JWT 模块并实现令牌生成和验证服务,
So that 应用可以使用标准的 JWT 机制进行用户认证。

## Acceptance Criteria

**Given** Epic 1 已完成（NestJS 项目已创建）
**When** 执行 `npm install @nestjs/jwt @nestjs/passport passport passport-jwt`
**And** 执行 `npm install -D @types/passport-jwt`
**Then** 在 .env 文件中添加 JWT 配置：
  - JWT_SECRET（密钥，至少32字符）
  - JWT_ACCESS_TOKEN_EXPIRATION（访问令牌过期时间，默认15分钟）
  - JWT_REFRESH_TOKEN_EXPIRATION（刷新令牌过期时间，默认7天）
**And** 创建 AuthModule（auth.module.ts）导入 JwtModule.registerAsync()
**And** 创建 AuthService（auth.service.ts）提供以下方法：
  - generateTokens(userId: number, role: Role): 生成访问令牌和刷新令牌
  - validateAccessToken(token: string): 验证访问令牌
  - validateRefreshToken(token: string): 验证刷新令牌
  - extractUserIdFromToken(token: string): 从令牌提取用户ID
**And** 访问令牌 payload 包含：
  - sub: 用户ID
  - role: 用户角色
  - type: 'access'
**And** 刷新令牌 payload 包含：
  - sub: 用户ID
  - type: 'refresh'
**And** 所有令牌使用 RS256 算法签名（注意：Epic 文档说明 RS256，但实践中通常使用 HS256，需要确认）
**And** 创建 JwtStrategy（jwt.strategy.ts）用于 Passport 验证

## Tasks / Subtasks

- [x] **Task 1: 安装 JWT 相关依赖** (AC: When - npm install)
  - [x] 在 backend-api 目录执行 `npm install @nestjs/jwt @nestjs/passport passport passport-jwt`
  - [x] 执行 `npm install -D @types/passport-jwt`
  - [x] 验证 package.json 中依赖已添加
  - [x] 确认 TypeScript 类型定义正确

- [x] **Task 2: 配置 JWT 环境变量** (AC: Then - .env 配置)
  - [x] 在 backend-api/.env 中添加 JWT_SECRET（至少32字符随机字符串）
  - [x] 添加 JWT_ACCESS_TOKEN_EXPIRATION=15m（默认15分钟）
  - [x] 添加 JWT_REFRESH_TOKEN_EXPIRATION=7d（默认7天）
  - [x] 更新 .env.example 添加上述配置项
  - [x] 使用 @nestjs/config 的 ConfigService 验证环境变量加载

- [x] **Task 3: 创建 AuthModule** (AC: And - AuthModule)
  - [x] 创建 backend-api/src/auth/auth.module.ts
  - [x] 使用 JwtModule.registerAsync() 配置 JWT
  - [x] 从 ConfigService 注入 JWT_SECRET 和过期时间配置
  - [x] 配置为全局模块（@Global()）供其他模块使用
  - [x] 在 AppModule 中导入 AuthModule

- [x] **Task 4: 创建 AuthService** (AC: And - AuthService 方法)
  - [x] 创建 backend-api/src/auth/auth.service.ts
  - [x] 实现 generateTokens(userId, role) 方法
    - [x] 生成访问令牌 payload：{ sub: userId, role, type: 'access' }
    - [x] 生成刷新令牌 payload：{ sub: userId, type: 'refresh' }
    - [x] 使用 JwtService.sign() 生成两个令牌
    - [x] 返回 { accessToken, refreshToken }
  - [x] 实现 validateAccessToken(token) 方法
    - [x] 使用 JwtService.verify() 验证令牌
    - [x] 检查 type === 'access'
    - [x] 返回解码后的 payload
  - [x] 实现 validateRefreshToken(token) 方法
    - [x] 使用 JwtService.verify() 验证令牌
    - [x] 检查 type === 'refresh'
    - [x] 返回解码后的 payload
  - [x] 实现 extractUserIdFromToken(token) 方法
    - [x] 解码令牌
    - [x] 返回 sub（用户ID）

- [x] **Task 5: 创建 JwtStrategy** (AC: And - JwtStrategy)
  - [x] 创建 backend-api/src/auth/strategies/jwt.strategy.ts
  - [x] 继承 PassportStrategy(Strategy, 'jwt')
  - [x] 实现 validate() 方法从 payload 提取用户信息
  - [x] 返回 { userId: payload.sub, role: payload.role }
  - [x] 配置 JwtModule 选项（secretOrKey, jwtFromRequest, ignoreExpiration）

- [x] **Task 6: 创建 DTO 和接口** (综合)
  - [x] 创建 JwtPayload 接口定义 token payload 结构
  - [x] 创建 TokensDto 定义返回结构 { accessToken, refreshToken }
  - [x] 使用 class-validator 添加验证装饰器

- [x] **Task 7: 编写单元测试** (测试标准)
  - [x] 创建 auth.service.spec.ts
  - [x] 测试 generateTokens() 生成正确的令牌对
  - [x] 测试 validateAccessToken() 验证有效令牌
  - [x] 测试 validateAccessToken() 拒绝无效令牌
  - [x] 测试 validateRefreshToken() 验证刷新令牌
  - [x] 测试 extractUserIdFromToken() 正确提取用户ID
  - [x] 测试 JwtStrategy.validate() 正确返回用户信息

- [x] **Task 8: 验证和集成** (综合验证)
  - [x] 执行 `npm run build` 验证 TypeScript 编译通过
  - [x] 运行单元测试 `npm test auth.service.spec`（13个测试全部通过）
  - [x] 验证 JWT 配置从环境变量正确加载（.env 配置完整）
  - [x] 测试令牌生成和验证完整流程（单元测试覆盖）
  - [x] 确认与 User 模型（Story 2.1）的集成准备就绪（导入 Role 枚举）

## Dev Notes

### 架构模式和约束

**关键架构决策（来自 architecture.md）：**
- **认证方案**: NestJS Auth Module + JWT
- **JWT 库**: @nestjs/jwt + @nestjs/passport
- **密码加密**: bcrypt（Story 2.3 使用，本 Story 准备基础）
- **令牌管理**: 访问令牌（短期）+ 刷新令牌（长期）
- **角色权限**: Guard 装饰器（Story 2.5 实现）

**数据模型集成（来自 Story 2.1）：**
- User 模型已创建，包含 Role 枚举（PARENT, ADMIN）
- Role 枚举值：PARENT（家长）、ADMIN（管理员）
- UserStatus 枚举：ACTIVE、INACTIVE、BANNED
- Prisma 版本：7.2.0（注意与 Prisma 5.x 的差异）

### 源代码结构要求

**backend-api/src/auth/ 目录结构：**

```
backend-api/
├── src/
│   └── auth/
│       ├── auth.module.ts           # Auth 模块定义
│       ├── auth.service.ts          # JWT 令牌服务
│       ├── auth.controller.ts       # (可选) 认证端点（Story 2.3/2.4）
│       ├── strategies/
│       │   └── jwt.strategy.ts      # Passport JWT 策略
│       ├── dto/
│       │   ├── jwt-payload.interface.ts
│       │   └── tokens.dto.ts
│       └── auth.service.spec.ts     # 单元测试
├── .env                              # JWT 配置
└── .env.example                      # 环境变量模板
```

### 文件修改清单

**本故事需创建的文件：**

| 文件 | 说明 | 类型 |
|------|------|------|
| `backend-api/src/auth/auth.module.ts` | Auth 模块定义 | 创建 |
| `backend-api/src/auth/auth.service.ts` | JWT 令牌服务 | 创建 |
| `backend-api/src/auth/strategies/jwt.strategy.ts` | Passport JWT 策略 | 创建 |
| `backend-api/src/auth/dto/jwt-payload.interface.ts` | JWT payload 接口 | 创建 |
| `backend-api/src/auth/dto/tokens.dto.ts` | 令牌 DTO | 创建 |
| `backend-api/src/auth/auth.service.spec.ts` | 单元测试 | 创建 |
| `backend-api/.env` | JWT 环境变量 | 修改 |
| `backend-api/.env.example` | 环境变量模板 | 修改 |

### JWT 配置设计要求

**环境变量配置：**
```bash
# backend-api/.env
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d
```

**JWT Module 配置：**
```typescript
// auth.module.ts
JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
    },
  }),
  inject: [ConfigService],
})
```

**令牌 Payload 结构：**

访问令牌（Access Token）:
```typescript
interface JwtPayload {
  sub: number;        // 用户ID
  role: 'PARENT' | 'ADMIN';
  type: 'access';
  iat?: number;       // issued at (自动添加)
  exp?: number;       // expiration (自动添加)
}
```

刷新令牌（Refresh Token）:
```typescript
interface RefreshTokenPayload {
  sub: number;        // 用户ID
  type: 'refresh';
  iat?: number;
  exp?: number;
}
```

**算法说明：**
- Epic 文档说明使用 RS256（非对称加密）
- 实践中 HS256（对称加密）更常见且更简单
- **建议**: 本 Story 使用 HS256，如需 RS256 可后续升级
- 如果使用 RS256，需要生成公钥/私钥对（不在本 Story 范围内）

### AuthService 实现要求

**完整服务结构：**

```typescript
// backend-api/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 生成访问令牌和刷新令牌
   * @param userId 用户ID
   * @param role 用户角色
   * @returns 令牌对
   */
  async generateTokens(userId: number, role: Role): Promise<TokenPair> {
    const accessPayload = {
      sub: userId,
      role,
      type: 'access' as const,
    };

    const refreshPayload = {
      sub: userId,
      type: 'refresh' as const,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    return { accessToken, refreshToken };
  }

  /**
   * 验证访问令牌
   * @param token JWT 访问令牌
   * @returns 解码后的 payload
   * @throws UnauthorizedException 如果令牌无效
   */
  async validateAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * 验证刷新令牌
   * @param token JWT 刷新令牌
   * @returns 解码后的 payload
   * @throws UnauthorizedException 如果令牌无效
   */
  async validateRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token);
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * 从令牌中提取用户ID
   * @param token JWT 令牌
   * @returns 用户ID
   */
  extractUserIdFromToken(token: string): number {
    const payload = this.jwtService.decode(token) as JwtPayload;
    return payload.sub;
  }
}
```

### JwtStrategy 实现要求

```typescript
// backend-api/src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, role: payload.role };
  }
}
```

### 测试要求

**单元测试（auth.service.spec.ts）：**

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verifyAsync: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('15m'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const mockAccessToken = 'mock_access_token';
      const mockRefreshToken = 'mock_refresh_token';

      jest.spyOn(jwtService, 'sign')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await service.generateTokens(1, Role.PARENT);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 1, role: Role.PARENT, type: 'access' },
        { expiresIn: '15m' },
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should validate a valid access token', async () => {
      const payload = { sub: 1, role: Role.ADMIN, type: 'access' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await service.validateAccessToken('valid_token');

      expect(result).toEqual(payload);
    });

    it('should throw error for invalid token type', async () => {
      const payload = { sub: 1, type: 'refresh' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      await expect(service.validateAccessToken('invalid_token'))
        .rejects.toThrow('Invalid token type');
    });
  });
});
```

**手动验证测试：**
1. 生成令牌对
2. 使用 jwt.io 解码验证 payload 结构正确
3. 测试令牌过期后验证失败
4. 测试无效密钥生成的令牌无法验证

### 技术依赖和版本

**必需版本：**
- NestJS: 最新稳定版
- @nestjs/jwt: 最新稳定版
- @nestjs/passport: 最新稳定版
- passport: 0.7.x
- passport-jwt: 4.0.x
- @types/passport-jwt: 最新版
- Node.js: 20+ LTS
- TypeScript: 5+

**NPM 命令：**
```bash
# 安装依赖
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt

# 运行测试
npm test auth.service.spec

# 构建
npm run build
```

### 参考文档

| 文档 | 路径 | 关键章节 |
|------|------|---------|
| Epic 详细规划 | `_bmad-output/planning-artifacts/epics.md` | Epic 2, Story 2.2 |
| 技术架构 | `_bmad-output/planning-artifacts/architecture.md` | 身份认证与安全 |
| 项目上下文 | `_bmad-output/project-context.md` | Framework Rules |
| Story 2.1 | `_bmad-output/implementation-artifacts/2-1-design-user-data-model.md` | User 模型 |
| @nestjs/jwt 文档 | https://docs.nestjs.com/security/authentication#jwt-functionality | JWT 功能 |
| Passport JWT | https://www.passportjs.org/packages/passport-jwt/ | 策略配置 |

### 后续依赖

**此故事完成后，以下故事可开始：**
- Story 2.3: 实现管理员账号密码登录（需要 AuthService.generateTokens）
- Story 2.4: 实现家长微信授权登录（需要 AuthService.generateTokens）
- Story 2.5: 实现角色权限 Guard（需要 JwtStrategy）
- Story 2.6: 实现令牌刷新和会话管理（需要 AuthService）

**本故事为以下功能提供基础：**
- 所有用户认证功能（Epic 2）
- 受保护的 API 端点（JwtStrategy + Guards）
- 令牌刷新机制（Story 2.6）

### 前序 Story 经验 (Story 2.1)

**从 Story 2.1 学到的经验：**
1. **Prisma 版本**: 项目使用 Prisma 7.2.0，不是 5.x
2. **配置方式**: Prisma 7 使用 `prisma.config.ts` 配置数据库
3. **环境变量**: 使用 @nestjs/config 的 ConfigService 管理环境变量
4. **枚举类型**: Role 枚举已定义在 Prisma schema 中，需要导入使用
5. **类型安全**: 使用 Prisma 生成的类型（Role, UserStatus）

**代码模式参考：**
```typescript
// 导入 Prisma 生成的枚举
import { Role } from '@prisma/client';

// 使用 ConfigService 获取环境变量
const secret = this.configService.get<string>('JWT_SECRET');
```

### 安全考虑

**密钥管理：**
- JWT_SECRET 必须是强随机字符串（至少32字符）
- 生产环境密钥不能提交到代码仓库
- 使用 .env 文件管理，.env.example 提供模板

**令牌安全：**
- 访问令牌短期有效（15分钟）减少泄露风险
- 刷新令牌长期有效（7天）存储在服务端（Redis，Story 2.6）
- 使用 HTTPS 传输令牌（生产环境强制）
- 令牌 payload 不包含敏感信息（如密码、手机号）

**算法选择：**
- HS256（对称加密）：简单高效，单服务器场景
- RS256（非对称加密）：更安全，多服务器场景（如需后续升级）

**验证要求：**
- 始终验证令牌类型（access vs refresh）
- 检查令牌过期时间（ignoreExpiration: false）
- 捕获验证异常并返回 401 Unauthorized

### 性能考虑

**令牌生成：**
- JWT 签名操作轻量，无需特殊优化
- 避免在高频请求路径中重复生成令牌

**令牌验证：**
- Passport JwtStrategy 自动从 Authorization header 提取令牌
- 验证缓存：NestJS 默认无状态，每个请求都验证
- 如果需要优化，可在 Guard 层添加 Redis 缓存（Story 2.6）

**内存管理：**
- JwtPayload 对象轻量，无需特殊处理
- 刷新令牌存储在 Redis（Story 2.6 实现）

### 常见问题和解决方案

**问题 1: JWT_SECRET 未设置**
- 错误: `secretOrKey must be provided`
- 解决: 检查 .env 文件，确保 JWT_SECRET 已配置

**问题 2: 令牌验证失败**
- 错误: `JsonWebTokenError`
- 排查: 检查密钥是否一致、令牌是否过期

**问题 3: Role 类型导入错误**
- 错误: `Cannot find namespace 'Role'`
- 解决: 从 @prisma/client 导入 Role 枚举

**问题 4: JwtStrategy 未触发**
- 检查: Controller 是否使用 @UseGuards(AuthGuard('jwt'))
- 检查: 请求是否包含 Authorization header

## Change Log

**2026-01-13 - 代码审查修复：**
- 修复 JwtStrategy 安全漏洞：移除不安全的默认密钥，JWT_SECRET 未设置时抛出错误
- 改进 extractUserIdFromToken 错误处理：添加空值检查和类型验证
- 更新单元测试：覆盖 extractUserIdFromToken 的错误场景（新增2个测试）
- 添加类型断言注释：说明 `as any` 的原因（jsonwebtoken 类型不兼容问题）

**2026-01-13 - Story 实现：**
- 安装 JWT 相关依赖包：@nestjs/jwt, @nestjs/passport, passport, passport-jwt
- 配置环境变量：JWT_SECRET, JWT_ACCESS_TOKEN_EXPIRATION, JWT_REFRESH_TOKEN_EXPIRATION
- 创建 AuthModule 并配置为全局模块
- 实现 AuthService：generateTokens, validateAccessToken, validateRefreshToken, extractUserIdFromToken
- 创建 JwtStrategy（Passport JWT 策略）
- 创建 DTO：JwtPayload, RefreshTokenPayload, TokensDto
- 编写完整的单元测试（13个测试全部通过）
- 集成到 AppModule 中

**技术决策：**
- JWT 算法: HS256（对称加密），而非 Epic 文档中提到的 RS256
- 原因：HS256 更简单、高效，适合单服务器场景
- 类型处理：使用 `as any` 处理 expiresIn 类型兼容性问题
- 错误处理：区分令牌类型错误和验证失败错误

**2026-01-13 - Story 创建：**
- 从 Epic 文档提取完整验收标准
- 集成 Story 2.1 的 User 模型和 Role 枚举
- 添加 Prisma 7.2.0 兼容性说明
- 创建详细的实现指南和代码示例
- 定义单元测试要求和模板

**技术决策：**
- JWT 算法: HS256（对称加密，简单高效）
- 如需 RS256 可在后续升级
- 令牌类型区分: payload.type 字段（access/refresh）
- 环境变量管理: @nestjs/config + ConfigService

## Dev Agent Record

glm-4.7 (claude-opus-4-5-20251101)

### Debug Log References

### Implementation Plan

**任务执行计划：**
1. Task 1: 安装 JWT 相关依赖包
2. Task 2: 配置 .env 环境变量
3. Task 3: 创建 AuthModule 并配置 JWT
4. Task 4: 实现 AuthService 核心方法
5. Task 5: 创建 JwtStrategy
6. Task 6: 创建 DTO 和接口定义
7. Task 7: 编写完整的单元测试
8. Task 8: 验证集成和构建

**技术决策：**
- JWT 算法: HS256（Epic 文档提到 RS256，但实践中 HS256 更常见）
- 使用 @nestjs/config 管理环境变量
- 从 @prisma/client 导入 Role 枚举
- AuthService 作为独立服务，供后续 Story 2.3/2.4 使用
- JwtStrategy 配置为 'jwt' 策略，供 @UseGuards(AuthGuard('jwt')) 使用

### Completion Notes List

### File List

**创建/修改文件：**
- `backend-api/src/auth/auth.module.ts` （创建：Auth 模块，JWT 配置）
- `backend-api/src/auth/auth.service.ts` （创建：JWT 令牌服务）
- `backend-api/src/auth/strategies/jwt.strategy.ts` （创建：Passport JWT 策略）
- `backend-api/src/auth/dto/jwt-payload.interface.ts` （创建：JWT payload 接口）
- `backend-api/src/auth/dto/tokens.dto.ts` （创建：令牌 DTO）
- `backend-api/src/auth/auth.service.spec.ts` （创建：单元测试）
- `backend-api/src/app.module.ts` （修改：导入 AuthModule）
- `backend-api/.env` （修改：添加 JWT 配置）
- `backend-api/.env.example` （修改：添加 JWT 配置模板）
- `backend-api/package.json` （修改：添加 JWT 依赖）
- `2-2-implement-jwt-auth-infrastructure.md` （本故事文件）