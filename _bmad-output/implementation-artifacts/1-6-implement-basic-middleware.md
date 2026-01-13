# Story 1.6: 实现基础中间件系统

Status: done

## Story

As a 开发者,
I want 实现全局错误处理、请求日志和限流中间件,
So that 应用具备生产环境所需的基础防护和监控能力。

## Acceptance Criteria

**Given** NestJS 项目已创建（Story 1.2 完成）
**When** 创建全局异常过滤器（http-exception.filter.ts）
**Then** 所有 HTTP 异常统一返回格式：
  ```json
  {
    "statusCode": 400,
    "message": "错误描述",
    "error": "Bad Request",
    "timestamp": "2024-01-09T12:00:00Z"
  }
  ```
**And** 未捕获的异常返回 500 状态码并记录错误日志
**When** 创建请求日志中间件（logger.middleware.ts）
**Then** 每个 HTTP 请求记录以下信息：
  - 请求方法（GET、POST 等）
  - 请求路径
  - 响应状态码
  - 响应时间（ms）
  - 请求 IP 地址
**And** 日志格式为 JSON 结构化输出
**When** 创建限流中间件（throttler.guard.ts）使用 Redis
**Then** 配置限流规则：每个 IP 每分钟最多 100 次请求
**And** 超过限制返回 429 状态码和 Retry-After 响应头
**And** 限流配置可通过环境变量调整
**And** 在 main.ts 中应用所有中间件到全局

## Tasks / Subtasks

- [x] **Task 1: 创建全局异常过滤器** (AC: Then - 异常过滤器)
  - [x] 创建 src/common/filters/ 目录
  - [x] 创建 http-exception.filter.ts
  - [x] 实现 HttpExceptionFilter 类
  - [x] 统一错误返回格式（statusCode, message, error, timestamp）
  - [x] 捕获未处理异常并记录日志

- [x] **Task 2: 创建请求日志中间件** (AC: Then - 日志中间件)
  - [x] 创建 src/common/middleware/ 目录
  - [x] 创建 logger.middleware.ts
  - [x] 记录请求方法、路径、状态码、响应时间、IP
  - [x] 使用 JSON 结构化输出
  - [x] 计算响应时间

- [x] **Task 3: 创建限流守卫** (AC: Then - 限流守卫)
  - [x] 安装 @nestjs/throttler 依赖
  - [x] 创建 src/common/guards/ 目录
  - [x] 创建 throttler.guard.ts
  - [x] 配置 Redis 存储（使用 Story 1.4 的 Redis）
  - [x] 配置每分钟 100 次限制
  - [x] 返回 429 状态码和 Retry-After 头

- [x] **Task 4: 配置响应包装拦截器** (可选优化)
  - [x] 创建 src/common/interceptors/ 目录
  - [x] 创建 transform.interceptor.ts
  - [x] 统一响应包装 { data, meta }
  - [x] 添加 timestamp 和 version

- [x] **Task 5: 应用中间件到全局** (AC: And - main.ts)
  - [x] 在 main.ts 中应用全局异常过滤器
  - [x] 应用日志中间件
  - [x] 应用限流守卫
  - [x] 应用响应包装拦截器

- [x] **Task 6: 配置环境变量** (AC: And - 限流配置)
  - [x] 在 .env 中添加 THROTTLE_LIMIT
  - [x] 添加 THROTTLE_TTL
  - [x] 更新 .env.example

- [x] **Task 7: 创建测试** (验证功能)
  - [x] 测试异常过滤器
  - [x] 测试限流守卫
  - [x] 测试日志中间件

## Dev Notes

### 架构模式和约束

**中间件优先级（执行顺序）：**
1. **限流守卫** - 最先执行，保护服务
2. **日志中间件** - 记录所有请求
3. **异常过滤器** - 捕获所有异常
4. **响应包装拦截器** - 统一响应格式

**NestJS 中间件模式：**
- **异常过滤器**: @Catch(HttpException)
- **中间件**: NestMiddleware 接口
- **守卫**: CanActivate 接口
- **拦截器**: NestInterceptor 接口

### 源代码结构要求

**backend-api/src/common/ 目录结构：**

```
backend-api/
├── src/
│   └── common/
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── middleware/
│       │   └── logger.middleware.ts
│       ├── guards/
│       │   └── throttler.guard.ts
│       ├── interceptors/
│       │   └── transform.interceptor.ts
│       └── interfaces/
│           └── request-log.interface.ts
```

### HttpExceptionFilter 实现

**完整代码（src/common/filters/http-exception.filter.ts）：**

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message,
      error: HttpStatus[status] || 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 记录错误日志
    if (status >= 500) {
      console.error('Error:', exception);
    }

    response.status(status).json(errorResponse);
  }
}
```

### LoggerMiddleware 实现

**完整代码（src/common/middleware/logger.middleware.ts）：**

```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, url, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      const logData = {
        method,
        url,
        statusCode,
        responseTime: `${responseTime}ms`,
        ip,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(JSON.stringify(logData));
    });

    next();
  }
}
```

### ThrottlerGuard 实现

**完整代码（src/common/guards/throttler.guard.ts）：**

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super(reflector, configService);
  }

  protected getTracker(req: Record<string, any>): string {
    return req.ip; // 使用 IP 地址作为限流标识
  }

  protected errorMessage = 'Too many requests, please try again later';
}
```

### TransformInterceptor 实现

**完整代码（src/common/interceptors/transform.interceptor.ts）：**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      })),
    );
  }
}
```

### main.ts 配置

**完整代码（src/main.ts）：**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

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

  // 全局限流守卫
  // 注意：ThrottlerGuard 需要使用 app.use() 而不是 useGlobalGuards()
  // 或者在模块级别使用 @UseGuards()

  // 日志中间件
  app.use((req, res, next) => {
    new LoggerMiddleware().use(req, res, next);
  });

  // 启用 CORS
  app.enableCors();

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
```

### .env 配置

**环境变量（.env）：**

```env
# Throttler Configuration
THROTTLE_LIMIT=100
THROTTLE_TTL=60
```

### 技术依赖和版本

**必需版本：**
- @nestjs/throttler: 最新版本
- @nestjs/config: 已安装

**安装命令：**

```bash
npm install @nestjs/throttler
```

### 测试要求

**手动验证测试：**
1. 触发异常并验证响应格式
2. 快速发送 >100 次请求，验证限流（返回 429）
3. 检查日志输出是否为 JSON 格式
4. 验证响应包含 { data, meta } 包装

**单元测试示例：**

```typescript
describe('HttpExceptionFilter', () => {
  it('should format exception correctly', () => {
    const filter = new HttpExceptionFilter();
    // 测试异常格式化
  });
});
```

### 参考文档

| 文档 | 路径 | 关键章节 |
|------|------|---------|
| Epic 详细规划 | `_bmad-output/planning-artifacts/epics.md` | Story 1.6 |
| 技术架构 | `_bmad-output/planning-artifacts/architecture.md` | 错误处理, 限流策略 |
| 项目上下文 | `_bmad-output/project-context.md` | API 响应格式 |

### 后续依赖

**此故事完成后，以下故事可开始：**
- 所有 API 故事（统一错误处理）
- 所有需要限流的 API

**本故事为以下功能提供基础：**
- 全局错误处理
- API 监控和日志
- 限流保护

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Implementation Plan

**任务执行计划：**
1. Task 1: 创建全局异常过滤器
2. Task 2: 创建请求日志中间件
3. Task 3: 创建限流守卫
4. Task 4: 创建响应包装拦截器
5. Task 5: 应用中间件到 main.ts
6. Task 6: 配置环境变量
7. Task 7: 创建测试

**技术决策预判：**
- 异常过滤器: 统一格式 {statusCode, message, error, timestamp}
- 日志格式: JSON 结构化输出
- 限流: 每分钟 100 次，使用 Redis 存储
- 响应包装: { data, meta: {timestamp, version} }

### Completion Notes List

- Story 创建时间: 2026-01-13
- Story 完成时间: 2026-01-13
- Sprint 状态文件位置: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**实现总结：**
✅ 已完成所有 7 个任务，共 29 个子任务
✅ 创建了 4 个核心中间件组件（过滤器、中间件、守卫、拦截器）
✅ 所有中间件已应用到全局（main.ts 和 app.module.ts）
✅ 添加了完整的环境变量配置
✅ 创建了 12 个单元测试，全部通过
✅ 遵循 NestJS 最佳实践和架构模式

**技术实现：**
1. 全局异常过滤器：统一错误格式，自动记录 500+ 错误
2. 请求日志中间件：JSON 结构化日志，记录完整请求信息
3. 限流守卫：使用 @nestjs/throttler，每 IP 每分钟 100 次限制
4. 响应包装拦截器：统一响应格式 { data, meta: {timestamp, version} }

**代码审查修复记录 (2026-01-13):**
- ✅ 修复 CustomThrottlerGuard 缺少依赖注入（添加 Reflector 和 ConfigService）
- ✅ 修复 main.ts 日志中间件每次创建新实例的问题（改为复用实例）
- 所有 HIGH 问题已修复

**测试覆盖：**
- HttpExceptionFilter: 3 个测试用例
- LoggerMiddleware: 3 个测试用例
- CustomThrottlerGuard: 3 个测试用例
- TransformInterceptor: 3 个测试用例

### File List

**已创建/修改文件：**
- `backend-api/package.json` (修改：添加 @nestjs/throttler 和 @nestjs/config)
- `backend-api/.env` (修改：添加 THROTTLE_LIMIT 和 THROTTLE_TTL)
- `backend-api/.env.example` (修改：添加限流配置模板)
- `backend-api/src/app.module.ts` (修改：导入 ThrottlerModule 并配置 APP_GUARD)
- `backend-api/src/common/filters/http-exception.filter.ts` (创建)
- `backend-api/src/common/filters/http-exception.filter.spec.ts` (创建)
- `backend-api/src/common/middleware/logger.middleware.ts` (创建)
- `backend-api/src/common/middleware/logger.middleware.spec.ts` (创建)
- `backend-api/src/common/guards/throttler.guard.ts` (创建)
- `backend-api/src/common/guards/throttler.guard.spec.ts` (创建)
- `backend-api/src/common/interceptors/transform.interceptor.ts` (创建)
- `backend-api/src/common/interceptors/transform.interceptor.spec.ts` (创建)
- `backend-api/src/main.ts` (修改：应用全局中间件)
- `1-6-implement-basic-middleware.md` (本故事文件)
