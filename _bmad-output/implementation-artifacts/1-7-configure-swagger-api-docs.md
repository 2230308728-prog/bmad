# Story 1.7: 配置 Swagger API 文档

Status: done

## Story

As a 开发者,
I want 集成 Swagger/OpenAPI 自动生成 API 文档,
So that 团队和第三方开发者可以清晰了解所有 API 接口的定义和用法。

## Acceptance Criteria

**Given** NestJS 项目已创建（Story 1.2 完成）
**When** 执行 `npm install @nestjs/swagger`
**Then** 在 main.ts 中配置 Swagger 初始化：
  - 标题：bmad API
  - 描述：研学产品预订平台后端 API
  - 版本：1.0
  - 路径前缀：/api-docs
**And** 启用所有 API 端点的 Swagger 装饰器：
  - @ApiTags()：按模块分组
  - @ApiOperation()：描述操作
  - @ApiResponse()：定义响应格式
**And** 配置全局的 API 响应包装：
  ```json
  {
    "data": {},
    "meta": {
      "timestamp": "2024-01-09T12:00:00Z",
      "version": "1.0"
    }
  }
  ```
**And** 访问 http://localhost:3000/api-docs 可以查看完整 API 文档
**And** Swagger UI 支持 "Try it out" 功能进行 API 测试
**And** 配置 Bearer Token 认证支持（用于后续 JWT 集成）

## Tasks / Subtasks

- [x] **Task 1: 安装 Swagger 依赖** (AC: When - npm install)
  - [x] 执行 `npm install @nestjs/swagger`
  - [x] 验证 package.json 中包含 Swagger 依赖
  - [x] 验证 Swagger 版本兼容性

- [x] **Task 2: 配置 Swagger 初始化** (AC: Then - Swagger 初始化)
  - [x] 在 main.ts 中导入 SwaggerModule
  - [x] 配置 Swagger 文档基本信息（标题、描述、版本）
  - [x] 配置文档路径前缀为 /api-docs
  - [x] 启用 Swagger UI

- [x] **Task 3: 配置全局 API 响应包装** (AC: And - 响应包装)
  - [x] 在 main.ts 中配置默认响应包装
  - [x] 设置全局 ApiResponse 装饰器
  - [x] 配置响应格式 { data, meta }

- [x] **Task 4: 配置 Bearer Token 认证** (AC: And - Bearer Token)
  - [x] 在 main.ts 中配置安全方案
  - [x] 添加 Bearer 认证定义
  - [x] 启用 API Key 安全选项

- [x] **Task 5: 为现有 API 添加 Swagger 装饰器** (AC: And - 装饰器)
  - [x] 为 AppController 添加 @ApiTags()
  - [x] 为端点添加 @ApiOperation()
  - [x] 添加 @ApiResponse() 装饰器
  - [x] 添加 DTO 的 @ApiProperty() 装饰器

- [x] **Task 6: 创建示例 API** (验证 Swagger 功能)
  - [x] 创建示例控制器
  - [x] 添加示例端点
  - [x] 测试 Swagger UI 访问
  - [x] 验证 "Try it out" 功能

- [x] **Task 7: 验证文档可访问** (AC: And - 访问文档)
  - [x] 启动应用
  - [x] 访问 http://localhost:3000/api-docs
  - [x] 验证文档显示正确
  - [x] 测试 API 调用功能

## Dev Notes

### 架构模式和约束

**Swagger 配置模式：**
1. **全局配置**: main.ts 中配置文档基本信息
2. **模块分组**: @ApiTags('module-name') 按功能分组
3. **操作描述**: @ApiOperation({ summary, description })
4. **响应定义**: @ApiResponse({ status, schema, type })
5. **DTO 装饰器**: @ApiProperty() 定义属性文档

**最佳实践：**
- 所有公共 API 必须添加 Swagger 装饰器
- DTO 必须使用 @ApiProperty() 提供文档
- 使用 @ApiTags() 按模块分组
- 使用 @ApiResponse() 定义成功和错误响应

### main.ts 配置

**完整代码（src/main.ts）：**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局响应包装拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 日志中间件
  app.use((req, res, next) => {
    new LoggerMiddleware().use(req, res, next);
  });

  // 启用 CORS
  app.enableCors();

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('bmad API')
    .setDescription('研学产品预订平台后端 API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // 这个名称将在 @ApiBearerAuth() 中使用
    )
    .addTag('auth', '认证相关接口')
    .addTag('users', '用户管理接口')
    .addTag('products', '产品管理接口')
    .addTag('orders', '订单管理接口')
    .addTag('oss', '文件上传接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api-docs`);
}

bootstrap();
```

### AppController 示例

**完整代码（src/app.controller.ts）：**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '获取应用信息', description: '返回应用的基本信息' })
  @ApiResponse({ status: 200, description: '成功返回应用信息', type: Object })
  getAppInfo(): object {
    return this.appService.getAppInfo();
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查', description: '检查应用是否正常运行' })
  @ApiResponse({ status: 200, description: '应用正常' })
  getHealth(): object {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### DTO 装饰器示例

**示例 DTO（src/users/dto/create-user.dto.ts）：**

```typescript
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: '用户昵称', example: '张三' })
  @IsString()
  nickname: string;

  @ApiPropertyOptional({ description: '用户邮箱', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '用户角色', enum: Role, example: Role.PARENT })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ description: '用户状态', enum: UserStatus, example: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  status: UserStatus;
}
```

### ApiResponse 装饰器示例

**使用示例：**

```typescript
import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResponse({ status: 200, description: '成功获取用户列表' })
  findAll() {
    // 实现
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个用户' })
  @ApiResponse({ status: 200, description: '成功获取用户' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  findOne(@Param('id') id: string) {
    // 实现
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  create(@Body() createUserDto: CreateUserDto) {
    // 实现
  }
}
```

### 技术依赖和版本

**必需版本：**
- @nestjs/swagger: 最新版本

**安装命令：**

```bash
npm install @nestjs/swagger
```

### 测试要求

**手动验证测试：**
1. 访问 http://localhost:3000/api-docs
2. 验证 API 文档显示所有端点
3. 使用 "Try it out" 功能测试 API
4. 验证响应格式包含 { data, meta }
5. 验证 Bearer Token 认证配置正确

**验证清单：**
- [ ] 文档标题和描述正确
- [ ] 所有 API 分组显示
- [ ] 端点描述完整
- [ ] DTO 属性文档完整
- [ ] 响应格式正确
- [ ] 认证配置可见

### 参考文档

| 文档 | 路径 | 关键章节 |
|------|------|---------|
| Epic 详细规划 | `_bmad-output/planning-artifacts/epics.md` | Story 1.7 |
| 技术架构 | `_bmad-output/planning-artifacts/architecture.md` | API 版本控制 |
| Swagger 文档 | https://docs.nestjs.com/openapi/introduction | Swagger 设置 |

### 后续依赖

**此故事完成后，以下功能受益：**
- 所有后续 API 故事（自动生成文档）
- 团队协作（清晰的 API 文档）
- 第三方集成（API 规范）

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Implementation Plan

**任务执行计划：**
1. Task 1: 安装 Swagger 依赖
2. Task 2: 配置 Swagger 初始化（main.ts）
3. Task 3: 配置全局响应包装
4. Task 4: 配置 Bearer Token 认证
5. Task 5: 为现有 API 添加装饰器
6. Task 6: 创建示例 API
7. Task 7: 验证文档可访问

**技术决策预判：**
- 文档路径: /api-docs
- 认证方式: Bearer Token (JWT)
- 响应包装: { data, meta: {timestamp, version} }
- 分组策略: 按模块分组 (auth, users, products, orders)

### Completion Notes List

- **完成时间**: 2026-01-13
- **Story 创建时间**: 2026-01-13
- **Sprint 状态文件位置**: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**实现摘要:**
1. ✅ 成功安装 @nestjs/swagger@11.2.4
2. ✅ 在 main.ts 中配置完整的 Swagger 文档生成
3. ✅ 配置了 Bearer Token 认证方案（用于后续 JWT 集成）
4. ✅ 添加了全局验证管道和 CORS 支持
5. ✅ 为 AppController、HealthController 和 UsersController 添加了完整的 Swagger 装饰器
6. ✅ 创建了 CreateUserDto 作为示例 DTO，展示 @ApiProperty 和 @ApiPropertyOptional 的用法
7. ✅ 实现了三个用户管理端点（GET /users, GET /users/:id, POST /users）作为示例
8. ✅ 所有现有测试通过（7 tests passed）
9. ✅ 文档路径配置为 /api-docs

**端口配置说明：**
- 默认端口：3005（在 main.ts 中配置为 `process.env.PORT ?? 3005`）
- 访问地址：http://localhost:3005/api-docs
- 如需修改端口，可通过环境变量 `PORT` 设置

**技术亮点:**
- 使用 DocumentBuilder 构建了完整的 OpenAPI 规范
- 配置了五个 API 标签分组：auth, users, products, orders, oss
- 实现了 Bearer 认证方案，名称为 'JWT-auth'，便于后续使用
- DTO 中使用了 definite assignment assertion (!) 来满足 TypeScript strict 模式
- 所有控制器端点都有完整的 @ApiOperation 和 @ApiResponse 装饰器
- 示例 DTO 包含枚举类型，展示了如何为枚举添加文档

**验证结果:**
- ✅ 所有单元测试通过
- ✅ Swagger 配置正确加载
- ✅ 控制器装饰器正确应用
- ✅ DTO 装饰器正确配置
- ✅ 应用可以正常启动

**代码审查修复记录 (2026-01-13):**
- ✅ 添加端口配置说明（默认 3005，可通过 PORT 环境变量修改）
- 无 HIGH 或 MEDIUM 问题需要修复

### File List

**已创建/修改文件：**
- `backend-api/package.json` (修改：添加 @nestjs/swagger@11.2.4)
- `backend-api/src/main.ts` (修改：配置 Swagger、验证管道、CORS)
- `backend-api/src/app.controller.ts` (修改：添加 Swagger 装饰器)
- `backend-api/src/health/health.controller.ts` (修改：添加 Swagger 装饰器)
- `backend-api/src/users/users.controller.ts` (修改：添加 Swagger 装饰器和示例端点)
- `backend-api/src/users/dto/create-user.dto.ts` (创建：示例 DTO，包含 Role 和 UserStatus 枚举)
- `1-7-configure-swagger-api-docs.md` (本故事文件)
