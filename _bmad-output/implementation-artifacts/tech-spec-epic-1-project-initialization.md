---
title: 'Epic 1 - 项目初始化与基础设施'
slug: 'epic-1-project-initialization'
created: '2026-01-10'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Next.js 15 + React 19 + TypeScript 5'
  - 'NestJS + Prisma 5 + PostgreSQL 15'
  - 'Redis 7'
  - 'Docker Compose'
  - '阿里云 OSS'
  - '微信小程序原生框架'
  - 'GitHub Actions'
  - 'Jest + Supertest'
files_to_modify:
  - 'package.json (root)'
  - 'docker-compose.yml'
  - '.github/workflows/ci.yml'
  - '.env.example'
  - '.gitignore'
  - 'backend-api/src/main.ts'
  - 'backend-api/src/app.module.ts'
  - 'backend-api/prisma/schema.prisma'
  - 'backend-api/src/common/constants/error-codes.ts' (NEW)
  - 'backend-api/src/config/validation.ts' (NEW)
  - 'backend-api/src/common/interceptors/cache.interceptor.ts' (ENHANCED)
  - 'admin-dashboard/app/layout.tsx'
  - 'admin-dashboard/app/page.tsx'
  - 'mini-program/app.json'
code_patterns:
  - 'TypeScript strict mode (no any, explicit types)'
  - '模块化架构 (NestJS modules, Next.js app router)'
  - 'RESTful API (复数资源, HTTP动词, 统一响应)'
  - 'Prisma snake_case → camelCase 转换'
  - '环境变量管理 (@nestjs/config + Joi 验证)'
  - '错误处理过滤器 (HttpException + ErrorCode 枚举)'
  - '日志中间件 (Winston + Morgan)'
  - '请求限流 (Throttler + Redis)'
  - 'JWT 认证 (访问令牌 + 刷新令牌)'
  - '缓存策略 (Redis + TTL 随机化防止雪崩)'
  - '优雅关闭 (shutdownHooks + 异常捕获)'
test_patterns:
  - 'Jest 单元测试 (*.spec.ts)'
  - 'NestJS 测试模块 (Test.createTestingModule)'
  - 'Supertest API 测试'
  - 'Prisma 测试数据库'
  - '外部服务 mock (微信API)'
  - 'E2E 测试 (*.e2e-spec.ts)'
---

# Tech-Spec: Epic 1 - 项目初始化与基础设施

**Created:** 2026-01-10
**Author:** Zhang
**Epic ID:** Epic 1
**Status:** In Progress

## Overview

### Problem Statement

需要建立完整的技术基础设施，支持双平台（微信小程序 + Next.js 后台）和 NestJS API 的开发，包括数据库、缓存、对象存储、认证框架和 CI/CD 流程。当前没有项目代码库，需要从零开始搭建整个技术基础。

### Solution

使用单一仓库架构，通过 Docker Compose 管理开发环境，Next.js 15 + shadcn/ui 构建管理后台，NestJS + Prisma + PostgreSQL + Redis 构建后端 API，阿里云 OSS 处理图片存储，GitHub Actions 实现 CI/CD。

### Scope

**In Scope:**

1. **项目结构初始化**
   - 单一仓库架构（monorepo）
   - 三个子项目：mini-program、admin-dashboard、backend-api
   - 共享类型定义和工具函数

2. **开发环境配置**
   - Docker Compose 配置（PostgreSQL + Redis）
   - 本地开发环境一键启动
   - 环境变量管理

3. **Next.js 15 管理后台**
   - 项目初始化（TypeScript + Tailwind + shadcn/ui）
   - 基础布局和路由结构
   - API 客户端封装
   - 状态管理准备（React Context）

4. **NestJS API 后端**
   - 项目初始化（Strict Mode + 模块化架构）
   - 全局模块配置（Config、Logger、Exception Filter）
   - Prisma 集成
   - Redis 缓存模块
   - 健康检查端点

5. **数据库设计**
   - Prisma Schema 初始化
   - 用户表结构（Users、Admins）
   - 基础索引和约束
   - 数据库迁移配置

6. **认证框架**
   - JWT 模块（访问令牌 + 刷新令牌）
   - 角色守卫（Role Guard）
   - 认证中间件
   - 不包含具体登录逻辑（Epic 2）

7. **图片存储**
   - 阿里云 OSS 集成
   - 签名上传接口
   - 图片上传服务

8. **基础中间件**
   - 日志中间件（Morgan + Winston）
   - 错误处理过滤器
   - 请求限流中间件（Throttler + Redis）
   - 响应拦截器

9. **API 文档**
   - Swagger 配置
   - API 分组
   - 全局配置

10. **CI/CD 流程**
    - GitHub Actions 工作流
    - 代码质量检查（ESLint + Prettier）
    - 自动化测试（单元测试 + E2E 测试）
    - Docker 镜像构建

11. **微信小程序基础**
    - 项目初始化
    - app.json 配置
    - Request 封装
    - 环境配置

**Out of Scope:**

- ❌ 具体业务逻辑（产品 CRUD、订单管理等）
- ❌ 完整的登录功能（Epic 2）
- ❌ 微信支付集成（Epic 4）
- ❌ 通知服务（Epic 5）
- ❌ 数据分析和报表（Epic 6）
- ❌ 高级功能（推荐系统、优惠券等）

## Context for Development

### Codebase Patterns

**项目当前状态：** ✅ 确认为 Clean Slate（全新项目）

**从 project-context.md 提取的关键模式：**

**1. TypeScript 严格模式配置：**
- 所有项目启用 `strict: true`
- 禁止使用 `any` 类型（除非有明确注释说明原因）
- 始终显式标注函数返回类型
- 使用 `unknown` 而非 `any` 处理动态数据

**2. 导入/导出约定：**
- 使用绝对路径导入：`@/components/...` 或 `@/lib/...`
- 导入顺序：外部库 → 内部模块 → 类型导入 → 相对路径
- 避免深层相对路径（如 `../../../`）

**3. 错误处理模式：**
- NestJS：使用内置异常类（`HttpException`, `BadRequestException`）
- React：使用Error Boundaries捕获组件错误
- 始终在API层捕获并记录错误，不在UI层直接console.error

**4. Next.js 15 (App Router)：**
- 优先使用Server Components，仅在需要交互性时使用 `'use client'`
- 路由组使用 `(group-name)` 命名（不参与URL路径）
- 布局文件 `layout.tsx` 必须导出默认函数
- API路由使用 `app/api/` 目录，返回 `Response` 对象

**5. NestJS：**
- 使用模块化结构，每个功能模块独立（`*.module.ts`）
- Controller仅处理HTTP请求/响应，业务逻辑在Service层
- 使用DTO（Data Transfer Object）进行输入验证（class-validator）
- 所有公共端点必须添加Swagger装饰器（`@ApiTags()`, `@ApiOperation()`）

**6. Prisma：**
- Schema定义使用snake_case（数据库）→ Prisma自动转换为camelCase（TypeScript）
- 表名使用小写复数（`users`, `products`, `orders`）
- 外键命名：`{table}_id`（如 `user_id`, `product_id`）
- 迁移文件必须描述性命名：`npx prisma migrate dev --name add_user_preferences`

**7. REST API 约定：**
- 端点使用复数资源：`GET /users`, `POST /products`
- 路由参数简单命名：`/users/:id`（非 `:userId`）
- 查询参数使用camelCase：`?userId=123&createdAt=2024-01-01`
- 统一响应包装：`{ data: {...}, meta: { timestamp, version } }`

**8. 命名约定：**
| 类型 | 规则 | 示例 |
|-----|------|-----|
| React组件 | PascalCase | `UserCard.tsx`, `ProductList.tsx` |
| NestJS类 | PascalCase | `UsersService`, `ProductsController` |
| 函数/变量 | camelCase | `getUserData`, `userId` |
| 数据库表 | 小写复数snake_case | `users`, `order_items` |
| 数据库列 | snake_case | `user_id`, `created_at` |
| 接口/类型 | PascalCase, I前缀可选 | `User`, `IUserData` |

**9. 测试规则：**
- 与源文件同目录：`UserService.ts` + `UserService.spec.ts`
- 测试文件命名：`*.spec.ts`（单元测试）、`*.e2e-spec.ts`（端到端）
- 优先使用NestJS的测试模块（`Test.createTestingModule()`）
- 外部服务（如微信API）必须mock
- 数据库操作使用Prisma的测试数据库或内存SQLite

**10. 安全规则：**
- 敏感数据（密码、密钥）必须加密存储
- API端点必须限流（Throttler + Redis）
- 用户输入必须验证（class-validator）
- CORS配置仅允许可信来源

### Files to Reference

| 文件 | 用途 | 位置 |
| ---- | ---- | ---- |
| **project-context.md** | 项目编码规范和规则 | `_bmad-output/project-context.md` |
| **architecture.md** | 技术架构设计 | `planning-artifacts/architecture.md` |
| **epics.md** | Epic 详细规划 | `planning-artifacts/epics.md` |
| **prd.md** | 产品需求文档 | `planning-artifacts/prd.md` |
| **ux-design-specification.md** | UX 设计规范 | `planning-artifacts/ux-design-specification.md` |
| **wireframes.md** | 线框图设计 | `planning-artifacts/wireframes.md` |

### Technical Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| **项目结构** | 单一仓库（monorepo） | 小团队便于管理，代码共享方便，统一版本控制 |
| **开发环境** | Docker Compose | 环境一致性，简化配置，一键启动所有依赖服务 |
| **认证框架** | JWT + 刷新令牌 | 无状态，支持水平扩展，符合最佳实践 |
| **图片存储** | OSS 直传 | 减少后端压力，上传更快，降低带宽成本 |
| **状态管理** | React Context | MVP 阶段简单场景，无需 Redux |
| **日志方案** | Winston | 企业级日志库，支持多传输，结构化日志 |
| **缓存策略** | Redis | 高性能，支持分布式，丰富数据结构 |
| **ORM** | Prisma | 类型安全，开发体验好，自动迁移 |
| **API 文档** | Swagger | 自动生成，交互式测试，标准化 |
| **测试框架** | Jest + Supertest | NestJS 原生支持，完整测试覆盖 |
| **CI/CD** | GitHub Actions | 与代码仓库集成，免费额度，配置简单 |

### Files to Create (Complete List)

**根目录文件：**
```
bmad/
├── package.json                    # 根 package，管理 workspace 脚本
├── docker-compose.yml              # Docker Compose 配置
├── .env.example                    # 环境变量示例
├── .gitignore                      # Git 忽略规则
├── README.md                       # 项目说明文档
├── .github/
│   └── workflows/
│       ├── ci.yml                  # CI/CD 主流程
│       └── test.yml                # 测试工作流
└── docs/
    └── api.md                      # API 使用文档
```

**backend-api/ 文件：**
```
backend-api/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── .eslintrc.js
├── .prettierrc
├── jest.config.js
├── test/
│   └── jest-e2e.conf.js
├── prisma/
│   └── schema.prisma               # 数据库 Schema
├── src/
│   ├── main.ts                     # 应用入口
│   ├── app.module.ts               # 根模块
│   ├── config/                     # 配置模块
│   │   ├── config.module.ts
│   │   ├── development.ts
│   │   ├── production.ts
│   │   └── validation.ts
│   ├── common/                     # 通用模块
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   └── roles.decorator.ts
│   │   ├── middlewares/
│   │   │   └── throttler.middleware.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   ├── auth/                      # 认证模块（框架）
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── jwt-auth.controller.ts
│   ├── users/                     # 用户模块
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   ├── upload/                    # 上传模块
│   │   ├── upload.module.ts
│   │   ├── upload.controller.ts
│   │   └── upload.service.ts
│   ├── health/                    # 健康检查
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   └── database/                  # 数据库模块
│       ├── database.module.ts
│       └── migrations.ts
└── test/
    └── app.e2e-spec.ts            # E2E 测试
```

**admin-dashboard/ 文件：**
```
admin-dashboard/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── components.json                # shadcn/ui 配置
├── .eslintrc.json
├── .prettierrc
├── app/
│   ├── layout.tsx                 # 根布局
│   ├── page.tsx                   # 首页
│   ├── api/                       # API 路由
│   │   └── health/
│   │       └── route.ts
│   ├── (auth)/                    # 认证路由组
│   │   └── login/
│   │       └── page.tsx
│   └── (dashboard)/               # 主应用路由组
│       ├── layout.tsx             # 侧边栏布局
│       └── page.tsx               # 仪表盘
├── components/
│   ├── ui/                        # shadcn/ui 组件
│   ├── layout/                    # 布局组件
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── common/                    # 通用组件
│       ├── Button.tsx
│       └── Card.tsx
├── lib/
│   ├── api-client.ts              # API 客户端封装
│   ├── auth.ts                    # 认证工具
│   └── utils.ts                  # 工具函数
└── types/
    └── index.ts                   # 类型定义
```

**mini-program/ 文件：**
```
mini-program/
├── app.json                       # 小程序配置
├── app.ts                         # 小程序逻辑
├── app.wxss                       # 全局样式
├── project.config.json            # 项目配置
├── project.private.config.json    # 私有配置
├── sitemap.json                   # 索引配置
├── pages/
│   ├── index/                     # 首页
│   │   ├── index.wxml
│   │   ├── index.ts
│   │   ├── index.wxss
│   │   └── index.json
│   ├── product-list/              # 产品列表
│   └── product-detail/            # 产品详情
├── components/                    # 组件
│   └── product-card/
│       ├── product-card.wxml
│       ├── product-card.ts
│       ├── product-card.wxss
│       └── product-card.json
├── utils/
│   └── request.js                 # 请求封装
├── config/
│   ├── dev.js                     # 开发环境配置
│   └── prod.js                    # 生产环境配置
└── types/
    └── index.d.ts                 # 类型定义
```

### Database Schema (Prisma)

**初始化表结构：**
```prisma
// 用户表
model User {
  id            String    @id @default(uuid())
  openid        String    @unique
  unionid       String?
  nickname      String?
  avatar_url    String?
  phone_number  String?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  // 关联
  orders        Order[]
  children      Child[]
}

// 管理员表
model Admin {
  id            String    @id @default(uuid())
  username      String    @unique
  password_hash String
  name          String?
  role          String    @default("admin")
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  // 关联
  operations    OperationLog[]
}

// 儿童信息表
model Child {
  id            String    @id @default(uuid())
  user_id       String
  name          String
  age           Int
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  // 关联
  user          User      @relation(fields: [user_id], references: [id])
  order_items   OrderItem[]
}

// 产品表（基础结构，详细在 Epic 3）
model Product {
  id            String    @id @default(uuid())
  title         String
  category      String
  min_age       Int
  max_age       Int
  price         Int       // 单位：分
  stock         Int
  status        String    @default("draft") // draft, published, archived
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
}

// 订单表（基础结构，详细在 Epic 4）
model Order {
  id            String    @id @default(uuid())
  order_no      String    @unique
  user_id       String
  total_amount  Int       // 单位：分
  status        String    @default("pending") // pending, paid, confirmed, completed, cancelled, refunded
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  // 关联
  user          User      @relation(fields: [user_id], references: [id])
  items         OrderItem[]
}

// 订单项表
model OrderItem {
  id            String    @id @default(uuid())
  order_id      String
  product_id    String
  child_id      String
  price         Int       // 单位：分
  created_at    DateTime  @default(now())

  // 关联
  order         Order     @relation(fields: [order_id], references: [id])
  child         Child     @relation(fields: [child_id], references: [id])
}

// 操作日志表
model OperationLog {
  id            String    @id @default(uuid())
  admin_id      String
  action        String
  target_type   String
  target_id     String
  details       Json?
  created_at    DateTime  @default(now())

  // 关联
  admin         Admin     @relation(fields: [admin_id], references: [id])
}
```

### Environment Variables

**.env.example 内容：**
```bash
# PostgreSQL
DATABASE_URL="postgresql://bmad:password@localhost:5432/bmad?schema=public"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# 阿里云 OSS
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="bmad-uploads"
OSS_ENDPOINT="https://oss-cn-hangzhou.aliyuncs.com"

# 微信小程序
WECHAT_APP_ID="your-wechat-app-id"
WECHAT_APP_SECRET="your-wechat-app-secret"

# API
API_PORT="3000"
API_PREFIX="api/v1"
CORS_ORIGIN="http://localhost:3001"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
```

### Docker Compose Services

**docker-compose.yml 包含的服务：**
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bmad
      POSTGRES_USER: bmad
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend-api:
    build: ./backend-api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://bmad:password@postgres:5432/bmad?schema=public
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend-api:/app
      - /app/node_modules
    command: npm run start:dev

volumes:
  postgres_data:
  redis_data:
```
   - 禁止使用 `any` 类型
   - 显式类型注解

2. **代码风格**
   - ESLint + Prettier 统一格式化
   - 导入顺序：外部库 → 内部模块 → 类型导入 → 相对路径
   - 使用绝对路径导入（`@/` 别名）

3. **错误处理**
   - NestJS：使用内置异常类
   - React：Error Boundaries
   - 统一错误响应格式

4. **API 设计**
   - RESTful 约定
   - 统一响应包装
   - 版本控制（/v1/）

5. **数据库约定**
   - 表名：小写复数（users, products）
   - 列名：snake_case（user_id, created_at）
   - Prisma 自动转换为 camelCase

### Files to Reference

| 文件 | 用途 |
| ---- | ---- |
| `_bmad-output/project-context.md` | 项目编码规范和规则 |
| `_bmad-output/planning-artifacts/architecture.md` | 技术架构设计 |
| `_bmad-output/planning-artifacts/epics.md` | Epic 详细规划 |
| `_bmad-output/planning-artifacts/prd.md` | 产品需求文档 |

### Technical Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 项目结构 | 单一仓库 | 小团队便于管理，代码共享方便 |
| 开发环境 | Docker Compose | 环境一致性，简化配置 |
| 认证框架 | JWT + 刷新令牌 | 无状态，支持水平扩展 |
| 图片存储 | OSS 直传 | 减少后端压力，上传更快 |
| 状态管理 | React Context | 简单场景，无需 Redux |
| 日志方案 | Winston | 企业级日志库，支持多传输 |
| 缓存策略 | Redis | 高性能，支持分布式 |
| ORM | Prisma | 类型安全，开发体验好 |

---

## Implementation Plan

### Phase 1: 根目录配置与 Docker 环境 (1天)

**目标：** 搭建项目基础结构和开发环境

- [ ] **任务 1.1：创建根目录 package.json**
  - 文件：`package.json`
  - 动作：配置 monorepo workspace，管理公共脚本
  - 内容：
    ```json
    {
      "name": "bmad",
      "version": "1.0.0",
      "private": true,
      "workspaces": [
        "backend-api",
        "admin-dashboard"
      ],
      "scripts": {
        "dev": "docker-compose up -d",
        "dev:stop": "docker-compose down",
        "dev:logs": "docker-compose logs -f backend-api",
        "db:migrate": "cd backend-api && npx prisma migrate dev",
        "db:studio": "cd backend-api && npx prisma studio",
        "test": "npm run test --workspaces",
        "lint": "npm run lint --workspaces",
        "format": "npm run format --workspaces"
      }
    }
    ```

- [ ] **任务 1.2：创建 Docker Compose 配置**
  - 文件：`docker-compose.yml`
  - 动作：配置 PostgreSQL 15、Redis 7、backend-api 服务
  - 内容：
    ```yaml
    version: '3.8'
    services:
      postgres:
        image: postgres:15-alpine
        container_name: bmad-postgres
        environment:
          POSTGRES_DB: ${POSTGRES_DB:-bmad}
          POSTGRES_USER: ${POSTGRES_USER:-bmad}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # ⚠️ 必需，在 .env 中设置
        ports:
          - "5432:5432"
        volumes:
          - postgres_data:/var/lib/postgresql/data
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-bmad}"]
          interval: 10s
          timeout: 5s
          retries: 5

      redis:
        image: redis:7-alpine
        container_name: bmad-redis
        command: redis-server --requirepass ${REDIS_PASSWORD}  # ⚠️ 必需，在 .env 中设置
        ports:
          - "6379:6379"
        volumes:
          - redis_data:/data
        healthcheck:
          test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
          interval: 10s
          timeout: 5s
          retries: 5

      backend-api:
        build:
          context: ./backend-api
          dockerfile: Dockerfile
        container_name: bmad-backend-api
        ports:
          - "3000:3000"
        environment:
          - NODE_ENV=${NODE_ENV:-development}
          - DATABASE_URL=postgresql://${POSTGRES_USER:-bmad}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-bmad}?schema=public
          - REDIS_HOST=redis
          - REDIS_PORT=6379
          - REDIS_PASSWORD=${REDIS_PASSWORD}
          - JWT_SECRET=${JWT_SECRET}  # ⚠️ 必需，在 .env 中设置
        depends_on:
          postgres:
            condition: service_healthy
          redis:
            condition: service_healthy
        volumes:
          - ./backend-api:/app
          - /app/node_modules
        command: npm run start:dev

    volumes:
      postgres_data:
      redis_data:
    ```
  - **安全说明：**
    - 所有敏感值使用环境变量 `${VARIABLE}` 语法
    - 默认值仅用于开发环境标识符，绝不用于密码
    - `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET` 必须在 `.env` 中设置

- [ ] **任务 1.3：创建环境变量示例文件**
  - 文件：`.env.example`
  - 动作：定义所有环境变量及其说明
  - 包含：数据库、Redis、JWT、OSS、微信、API 配置（见上文 Context for Development）

- [ ] **任务 1.4：创建 .gitignore**
  - 文件：`.gitignore`
  - 动作：配置忽略规则
  - 内容：node_modules, .env, dist, .next, build, coverage, .DS_Store, *.log

- [ ] **任务 1.5：创建项目 README**
  - 文件：`README.md`
  - 动作：编写项目说明文档
  - 包含：项目简介、技术栈、快速开始、目录结构、开发指南

---

### Phase 2: NestJS 后端 API 初始化 (2天)

**目标：** 搭建完整的后端框架和基础模块
**任务数量：** 23 个任务（包含错误处理、缓存优化、环境验证等）

- [ ] **任务 2.1：初始化 NestJS 项目**
  - 文件：`backend-api/`
  - 动作：运行 `npx @nestjs/cli new backend-api --package-manager npm --strict`
  - 配置：
    - TypeScript strict mode
    - ESLint + Prettier
    - Jest 测试框架

- [ ] **任务 2.2：配置 TypeScript**
  - 文件：`backend-api/tsconfig.json`, `tsconfig.build.json`
  - 动作：启用严格模式，配置路径别名
  - 内容：
    ```json
    {
      "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "esModuleInterop": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "baseUrl": ".",
        "paths": {
          "@/*": ["src/*"]
        }
      }
    }
    ```

- [ ] **任务 2.3：安装核心依赖**
  - 动作：安装所需包
  - 包列表：
    ```bash
    npm install @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/swagger
    npm install @nestjs/throttler @nestjs/microservices
    npm install @prisma/client class-validator class-transformer
    npm install passport passport-jwt bcrypt
    npm install redis ioredis @nestjs/terminus
    npm install winston nest-winston
    npm install ali-oss
    npm install --save-dev @nestjs/cli
    npm install --save-dev @nestjs/testing
    npm install --save-dev prisma
    npm install --save-dev @types/morgan @types/bcrypt @types/passport-jwt
    npm install --save-dev @types/ali-oss
    ```

- [ ] **任务 2.4：创建 Prisma Schema**
  - 文件：`backend-api/prisma/schema.prisma`
  - 动作：定义初始数据库模型（Users, Admins, Children, Products, Orders, OrderItems, OperationLog）
  - 内容：使用 snake_case 字段名，配置关系和索引（见上文 Database Schema）

- [ ] **任务 2.5：配置全局模块**
  - 文件：
    - `src/config/config.module.ts`
    - `src/config/development.ts`
    - `src/config/production.ts`
    - `src/config/validation.ts`
  - 动作：创建配置管理模块，使用 @nestjs/config
  - 内容：
    - 环境变量验证（使用 Joi）
    - 开发/生产环境配置分离
    - 类型安全的配置访问

- [ ] **任务 2.6：创建全局异常过滤器**
  - 文件：`src/common/filters/http-exception.filter.ts`
  - 动作：统一异常处理格式
  - 内容：
    ```typescript
    import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
    import { Request, Response } from 'express';

    @Catch(HttpException)
    export class HttpExceptionFilter implements ExceptionFilter {
      catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        const errorResponse = {
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          message: typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message,
          error: (exceptionResponse as any).error,
        };

        response.status(status).json(errorResponse);
      }
    }
    ```

- [ ] **任务 2.7：创建日志拦截器**
  - 文件：`src/common/interceptors/logging.interceptor.ts`
  - 动作：使用 Winston 记录请求/响应
  - 内容：
    - 记录请求方法、URL、响应时间
    - 记录错误和异常
    - 格式化日志输出

- [ ] **任务 2.8：创建响应转换拦截器**
  - 文件：`src/common/interceptors/transform.interceptor.ts`
  - 动作：统一响应数据格式
  - 内容：
    ```typescript
    import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
    import { Observable } from 'rxjs';
    import { map } from 'rxjs/operators';

    @Injectable()
    export class TransformInterceptor<T> implements NestInterceptor<T, any> {
      intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
          map(data => ({
            data: data.data ?? data,
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0',
              ...(data.meta || {}),
            },
          })),
        );
      }
    }
    ```

- [ ] **任务 2.9：创建 Redis 缓存拦截器**
  - 文件：`src/common/interceptors/cache.interceptor.ts`
  - 动作：使用 Redis 缓存 GET 请求响应
  - 内容：
    - 缓存键生成（基于 URL 和参数）
    - TTL 配置（默认 5 分钟）
    - 缓存失效机制

- [ ] **任务 2.10：创建 JWT 认证守卫**
  - 文件：`src/common/guards/jwt-auth.guard.ts`
  - 动作：实现 JWT 验证守卫
  - 内容：
    ```typescript
    import { Injectable, ExecutionContext } from '@nestjs/common';
    import { AuthGuard } from '@nestjs/passport';
    import { Reflector } from '@nestjs/core';

    @Injectable()
    export class JwtAuthGuard extends AuthGuard('jwt') {
      constructor(private reflector: Reflector) {
        super();
      }

      canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
          context.getHandler(),
          context.getClass(),
        ]);
        if (isPublic) return true;
        return super.canActivate(context);
      }
    }
    ```

- [ ] **任务 2.11：创建角色守卫**
  - 文件：`src/common/guards/roles.guard.ts`, `src/common/decorators/roles.decorator.ts`
  - 动作：实现基于角色的访问控制
  - 内容：
    - Roles 装饰器：`@Roles('admin', 'super-admin')`
    - RolesGuard：验证用户角色

- [ ] **任务 2.12：创建请求限流中间件**
  - 文件：`src/common/middlewares/throttler.middleware.ts`
  - 动作：使用 Redis 实现限流
  - 内容：
    - 默认限制：100 请求/分钟
    - 基于 IP + 路由的限流键
    - 超限返回 429 错误

- [ ] **任务 2.13：创建认证模块（框架）**
  - 文件：
    - `src/auth/auth.module.ts`
    - `src/auth/auth.service.ts`
    - `src/auth/strategies/jwt.strategy.ts`
    - `src/auth/decorators/current-user.decorator.ts`
  - 动作：搭建认证框架（不含具体登录逻辑）
  - 内容：
    - JWT 配置和策略
    - Token 生成和验证
    - CurrentUser 装饰器

- [ ] **任务 2.14：创建用户模块（基础）**
  - 文件：
    - `src/users/users.module.ts`
    - `src/users/users.controller.ts`
    - `src/users/users.service.ts`
    - `src/users/dto/create-user.dto.ts`
    - `src/users/dto/update-user.dto.ts`
  - 动作：创建用户 CRUD 框架
  - 内容：
    - RESTful 端点（GET /users, POST /users, GET /users/:id, PATCH /users/:id）
    - DTO 验证（class-validator）
    - Swagger 装饰器

- [ ] **任务 2.15：创建上传模块（OSS 集成）**
  - 文件：
    - `src/upload/upload.module.ts`
    - `src/upload/upload.controller.ts`
    - `src/upload/upload.service.ts`
  - 动作：集成阿里云 OSS
  - 内容：
    - 生成上传签名 API
    - OSS 配置和客户端
    - 文件类型和大小验证

- [ ] **任务 2.16：创建健康检查模块**
  - 文件：
    - `src/health/health.module.ts`
    - `src/health/health.controller.ts`
  - 动作：添加健康检查端点
  - 内容：
    - GET /health 端点
    - 检查数据库、Redis 连接状态
    - 使用 @nestjs/terminus

- [ ] **任务 2.17：配置 Swagger**
  - 文件：在 `src/main.ts` 中配置
  - 动作：设置 API 文档
  - 内容：
    ```typescript
    SwaggerModule.setup('api', app, {
      docTitle: 'bmad API',
      docDescription: 'bmad 研学产品预订平台 API 文档',
      version: '1.0',
      tag: 'api',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    ```

- [ ] **任务 2.18：创建应用入口和根模块**
  - 文件：`src/main.ts`, `src/app.module.ts`
  - 动作：配置 NestJS 应用
  - 内容：
    - 全局配置（validation pipe、filters、interceptors）
    - 模块导入
    - CORS 配置
    - Swagger 配置

- [ ] **任务 2.19：配置数据库迁移和 Seed 策略**
  - 文件：
    - `backend-api/prisma/migrations/.gitkeep`
    - `backend-api/prisma/seed.ts`
    - `backend-api/package.json` (添加 seed 脚本)
  - 动作：建立完整的数据库迁移、回滚和种子数据策略
  - 内容：
    ```typescript
    // seed.ts - 开发环境种子数据
    import { PrismaClient } from '@prisma/client';
    import * as bcrypt from 'bcrypt';

    const prisma = new PrismaClient();

    async function main() {
      // 创建测试管理员
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.admin.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
          username: 'admin',
          passwordHash: hashedPassword,
          name: '系统管理员',
          role: 'super-admin',
        },
      });

      console.log('🌱 Seed data created successfully');
    }

    main()
      .catch((e) => {
        console.error(e);
        process.exit(1);
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
    ```
  - **迁移策略：**
    - 初始迁移：`npx prisma migrate dev --name init`
    - 开发环境：`npx prisma migrate dev`（自动生成迁移）
    - 生产环境：`npx prisma migrate deploy`（仅应用已有迁移）
  - **回滚策略：**
    - 手动回滚：`npx prisma migrate resolve --rolled-back [migration-name]`
    - 紧急回滚：保留最近 3 个迁移的 SQL 回滚脚本
  - **Seed 数据：**
    - 开发环境：自动运行 seed（在 package.json 中配置）
    - 生产环境：绝不运行 seed
    - 添加脚本：`"seed": "ts-node prisma/seed.ts"`

- [ ] **任务 2.20：编写单元测试**
  - 文件：各模块对应的 `.spec.ts` 文件
  - 动作：为核心模块编写单元测试
  - 内容：
    - UsersService 测试
    - AuthService 测试
    - UploadService 测试
    - 目标覆盖率 > 80%

- [ ] **任务 2.21：创建错误码系统**
  - 文件：`src/common/constants/error-codes.ts`
  - 动作：定义统一的错误码常量
  - 内容：
    ```typescript
    export enum ErrorCode {
      // 通用错误 1000-1999
      UNKNOWN_ERROR = 1000,
      VALIDATION_ERROR = 1001,
      UNAUTHORIZED = 1002,
      FORBIDDEN = 1003,
      NOT_FOUND = 1004,

      // 用户错误 2000-2999
      USER_NOT_FOUND = 2000,
      USER_ALREADY_EXISTS = 2001,
      INVALID_CREDENTIALS = 2002,

      // 产品错误 3000-3999
      PRODUCT_NOT_FOUND = 3000,
      PRODUCT_OUT_OF_STOCK = 3001,

      // 订单错误 4000-4999
      ORDER_NOT_FOUND = 4000,
      ORDER_ALREADY_PAID = 4001,

      // 上传错误 5000-5999
      INVALID_FILE_TYPE = 5000,
      FILE_TOO_LARGE = 5001,
      UPLOAD_FAILED = 5002,
    }

    export const ERROR_MESSAGES: Record<ErrorCode, string> = {
      [ErrorCode.UNKNOWN_ERROR]: '未知错误',
      [ErrorCode.VALIDATION_ERROR]: '请求参数验证失败',
      [ErrorCode.UNAUTHORIZED]: '未授权访问',
      [ErrorCode.FORBIDDEN]: '无权访问',
      [ErrorCode.NOT_FOUND]: '资源不存在',
      [ErrorCode.USER_NOT_FOUND]: '用户不存在',
      [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
      [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
      [ErrorCode.PRODUCT_NOT_FOUND]: '产品不存在',
      [ErrorCode.PRODUCT_OUT_OF_STOCK]: '产品库存不足',
      [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
      [ErrorCode.ORDER_ALREADY_PAID]: '订单已支付',
      [ErrorCode.INVALID_FILE_TYPE]: '不支持的文件类型',
      [ErrorCode.FILE_TOO_LARGE]: '文件大小超出限制',
      [ErrorCode.UPLOAD_FAILED]: '文件上传失败',
    };
    ```

- [ ] **任务 2.22：增强环境变量验证**
  - 文件：`src/config/validation.ts`
  - 动作：使用 Joi 验证所有必需的环境变量
  - 内容：
    ```typescript
    import * as Joi from 'joi';

    export const validationSchema = Joi.object({
      NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),

      // 数据库
      DATABASE_URL: Joi.string().required().when('NODE_ENV', {
        is: 'test',
        then: Joi.string().default('file:./dev.db'),
      }),

      // Redis
      REDIS_HOST: Joi.string().required(),
      REDIS_PORT: Joi.number().default(6379),
      REDIS_PASSWORD: Joi.string().allow('').optional(),

      // JWT
      JWT_SECRET: Joi.string()
        .min(32)
        .when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.default('dev-secret-key-change-in-production'),
        }),
      JWT_EXPIRES_IN: Joi.string().default('1h'),
      JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

      // 阿里云 OSS
      OSS_REGION: Joi.string().required(),
      OSS_ACCESS_KEY_ID: Joi.string().required(),
      OSS_ACCESS_KEY_SECRET: Joi.string().required(),
      OSS_BUCKET: Joi.string().required(),

      // 微信
      WECHAT_APP_ID: Joi.string().required(),
      WECHAT_APP_SECRET: Joi.string().required(),

      // API
      API_PORT: Joi.number().default(3000),
      API_PREFIX: Joi.string().default('api/v1'),
      CORS_ORIGIN: Joi.string().default('*'),
    });

    // 在 ConfigModule 中使用
    export const configModuleOptions = {
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true, // 第一个错误即停止
      },
    };
    ```

- [ ] **任务 2.22：配置优雅关闭**
  - 文件：`src/main.ts`
  - 动作：启用 NestJS 关闭钩子，处理 SIGTERM/SIGINT
  - 内容：
    ```typescript
    import { Logger } from '@nestjs/common';

    async function bootstrap() {
      const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      });

      // ... 其他配置 ...

      // 启用关闭钩子
      app.enableShutdownHooks();

      await app.listen(process.env.API_PORT || 3000);
      Logger.log(`🚀 Application is running on: http://localhost:${process.env.API_PORT}`);
    }

    // 处理未捕获的异常
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      Logger.error(
        `Unhandled Rejection at: ${promise}, reason: ${reason}`,
        'UnhandledRejection',
      );
    });

    process.on('uncaughtException', (error: Error) => {
      Logger.error(`Uncaught Exception: ${error.message}`, error.stack, 'UncaughtException');
      process.exit(1);
    });

    bootstrap();
    ```

- [ ] **任务 2.23：优化 Redis 缓存策略（防止缓存雪崩）**
  - 文件：`src/common/interceptors/cache.interceptor.ts`
  - 动作：添加 TTL 随机化，避免大量缓存同时过期
  - 内容：
    ```typescript
    import { Injectable, ExecutionContext, CallHandler } from '@nestjs/common';
    import { Reflector } from '@nestjs/core';
    import { Observable } from 'rxjs';
    import { Cache } from 'cache-manager';
    import { CACHE_MANAGER } from '@nestjs/cache-manager';

    // 添加随机 TTL 偏移的辅助函数
    function getRandomizedTTL(baseTTL: number): number {
      const offset = Math.floor(baseTTL * 0.1); // ±10% 偏移
      const randomOffset = Math.floor(Math.random() * (offset * 2)) - offset;
      return baseTTL + randomOffset;
    }

    @Injectable()
    export class HttpCacheInterceptor implements NestInterceptor {
      constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private reflector: Reflector,
      ) {}

      async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
        const request = context.switchToHttp().getRequest();
        const cacheKey = this.reflector.get('cacheKey', context.getHandler())
          || this.generateCacheKey(request);

        // 尝试从缓存获取
        const cachedResponse = await this.cacheManager.get(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }

        // 执行请求
        const response = await next.handle();

        // 使用随机化 TTL 存储缓存
        const cacheTTL = this.reflector.get('cacheTTL', context.getHandler()) || 300; // 默认 5 分钟
        const randomizedTTL = getRandomizedTTL(cacheTTL);

        await this.cacheManager.set(cacheKey, response, randomizedTTL);

        return response;
      }

      private generateCacheKey(request: any): string {
        return `${request.method}:${request.url}:${JSON.stringify(request.query)}`;
      }
    }
    ```

---

### Phase 3: Next.js 管理后台初始化 (1.5天)

**目标：** 搭建管理后台基础框架

- [ ] **任务 3.1：初始化 Next.js 项目**
  - 文件：`admin-dashboard/`
  - 动作：运行 `npx create-next-app@latest admin-dashboard --typescript --tailwind --app --eslint`
  - 配置：
    - TypeScript strict mode
    - App Router
    - Tailwind CSS
    - ESLint

- [ ] **任务 3.2：安装 shadcn/ui**
  - 动作：初始化 shadcn/ui 组件库
  - 命令：
    ```bash
    npx shadcn-ui@latest init
    npx shadcn-ui@latest add button card input label select dropdown-menu avatar badge dialog toast
    ```

- [ ] **任务 3.3：配置 Tailwind CSS**
  - 文件：`admin-dashboard/tailwind.config.ts`
  - 动作：配置主题和设计令牌
  - 内容：
    - 颜色系统（主色 #1890ff）
    - 字体系统
    - 间距系统
    - 圆角、阴影

- [ ] **任务 3.4：创建 API 客户端封装**
  - 文件：`admin-dashboard/lib/api-client.ts`
  - 动作：封装 HTTP 请求
  - 内容：
    ```typescript
    import axios, { AxiosError } from 'axios';

    const apiClient = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器（添加 token）
    apiClient.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 响应拦截器（处理错误）
    apiClient.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        // 统一错误处理
        return Promise.reject(error);
      }
    );

    export default apiClient;
    ```

- [ ] **任务 3.5：创建认证工具**
  - 文件：`admin-dashboard/lib/auth.ts`
  - 动作：封装认证相关方法
  - 内容：
    - 登录/登出方法
    - Token 存储
    - 权限检查

- [ ] **任务 3.6：创建类型定义**
  - 文件：`admin-dashboard/types/index.ts`
  - 动作：定义共享类型
  - 内容：
    - User 类型
    - Product 类型
    - Order 类型
    - API 响应类型

- [ ] **任务 3.7：创建根布局**
  - 文件：`admin-dashboard/app/layout.tsx`
  - 动作：配置全局布局
  - 内容：
    - 导入 Providers（Theme、Query）
    - 配置字体
    - 设置元数据

- [ ] **任务 3.8：创建侧边栏布局组件**
  - 文件：`admin-dashboard/app/(dashboard)/layout.tsx`
  - 动作：创建带侧边栏的管理后台布局
  - 内容：
    - 侧边栏导航
    - 顶部栏
    - 主内容区

- [ ] **任务 3.9：创建仪表盘页面**
  - 文件：`admin-dashboard/app/(dashboard)/page.tsx`
  - 动作：创建仪表盘首页
  - 内容：
    - 数据卡片
    - 简单的统计图表
    - 待办事项列表

- [ ] **任务 3.10：创建登录页面**
  - 文件：`admin-dashboard/app/(auth)/login/page.tsx`
  - 动作：创建管理员登录页
  - 内容：
    - 登录表单
    - 表单验证
    - 错误处理

---

### Phase 4: 微信小程序初始化 (1天)

**目标：** 搭建小程序基础框架

- [ ] **任务 4.1：创建小程序项目配置**
  - 文件：
    - `mini-program/app.json`
    - `mini-program/project.config.json`
    - `mini-program/sitemap.json`
  - 动作：配置小程序基本设置
  - 内容：
    - AppID、页面路径
    - 窗口表现
    - 网络超时

- [ ] **任务 4.2：创建小程序入口文件**
  - 文件：
    - `mini-program/app.ts`
    - `mini-program/app.wxss`
  - 动作：配置小程序生命周期和全局样式
  - 内容：
    - onLaunch、onShow
    - 全局样式（重置样式、变量）

- [ ] **任务 4.3：创建请求封装**
  - 文件：`mini-program/utils/request.ts`
  - 动作：封装 wx.request
  - 内容：
    ```typescript
    const baseURL = 'https://api.example.com/api/v1';

    interface RequestOptions {
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      header?: any;
    }

    export function request<T>(options: RequestOptions): Promise<T> {
      return new Promise((resolve, reject) => {
        wx.request({
          url: baseURL + options.url,
          method: options.method || 'GET',
          data: options.data,
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wx.getStorageSync('access_token')}`,
            ...options.header,
          },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(res.data as T);
            } else {
              reject(res.data);
            }
          },
          fail: reject,
        });
      });
    }
    ```

- [ ] **任务 4.4：创建环境配置**
  - 文件：
    - `mini-program/config/dev.js`
    - `mini-program/config/prod.js`
  - 动作：配置开发和生产环境
  - 内容：
    - API base URL
    - 其他环境变量

- [ ] **任务 4.5：创建首页**
  - 文件：
    - `mini-program/pages/index/index.wxml`
    - `mini-program/pages/index/index.ts`
    - `mini-program/pages/index/index.wxss`
    - `mini-program/pages/index/index.json`
  - 动作：创建小程序首页
  - 内容：
    - 产品列表布局
    - 基础样式

- [ ] **任务 4.6：创建全局组件**
  - 文件：`mini-program/components/product-card/*`
  - 动作：创建产品卡片组件
  - 内容：
    - 组件模板
    - 组件逻辑
    - 组件样式

---

### Phase 5: CI/CD 配置 (0.5天)

**目标：** 配置自动化测试和部署

- [ ] **任务 5.1：创建 CI 工作流**
  - 文件：`.github/workflows/ci.yml`
  - 动作：配置持续集成
  - 内容：
    ```yaml
    name: CI

    on:
      push:
        branches: [main, develop]
      pull_request:
        branches: [main, develop]

    jobs:
      lint-and-test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - uses: actions/setup-node@v3
            with:
              node-version: '20'
          - name: Install dependencies
            run: npm ci
          - name: Run linter
            run: npm run lint
          - name: Run tests
            run: npm run test
          - name: Build
            run: npm run build
    ```

- [ ] **任务 5.2：创建测试工作流**
  - 文件：`.github/workflows/test.yml`
  - 动作：配置测试工作流
  - 内容：
    - 单元测试
    - E2E 测试
    - 测试覆盖率报告

---

### Acceptance Criteria

#### 环境和配置 AC

- [ ] **AC 1：** Given 开发者已安装 Docker 和 Docker Compose，当 执行 `npm run dev`，then 所有服务（PostgreSQL、Redis、Backend API）成功启动并可访问
- [ ] **AC 2：** Given 项目根目录，当 存在 `.env` 文件，then 环境变量正确加载且不被提交到 Git
- [ ] **AC 3：** Given `.env.example` 文件，当 开发者复制它创建 `.env`，then 包含所有必需的环境变量且有清晰的说明注释

#### 后端 API AC

- [ ] **AC 4：** Given 后端服务已启动，当 访问 `http://localhost:3000/health`，then 返回健康状态（包含数据库和 Redis 连接状态）
- [ ] **AC 5：** Given 后端服务已启动，when 访问 `http://localhost:3000/api/v1/docs`，then Swagger 文档页面正确显示
- [ ] **AC 6：** Given Prisma 已配置，when 执行 `npm run db:migrate`，then 数据库表正确创建且使用 snake_case 命名
- [ ] **AC 7：** Given JWT 认证守卫已配置，when 访问受保护的端点但不提供 token，then 返回 401 Unauthorized
- [ ] **AC 8：** Given 角色守卫已配置，when 普通用户访问管理员端点，then 返回 403 Forbidden
- [ ] **AC 9：** Given 请求限流已配置，when 短时间内发送超过 100 个请求，then 返回 429 Too Many Requests
- [ ] **AC 10：** Given 全局异常过滤器已配置，when 发生未处理的异常，then 返回标准错误格式 `{statusCode, message, error, timestamp}`
- [ ] **AC 11：** Given 上传模块已配置，when POST `/upload/signature`（已认证），then 返回 OSS 上传签名
- [ ] **AC 12：** Given 后端服务运行，when 所有单元测试通过，then 代码覆盖率 ≥ 80%
- [ ] **AC 12.1：** Given 错误码系统已配置，when API 返回错误，then 响应包含 `errorCode` 字段且值在 ErrorCode 枚举中
- [ ] **AC 12.2：** Given 环境变量验证已配置，when 缺少必需的环境变量，then 应用启动失败并显示清晰的错误消息
- [ ] **AC 12.3：** Given 优雅关闭已配置，when 发送 SIGTERM 信号，then 应用在关闭前完成正在处理的请求并清理连接
- [ ] **AC 12.4：** Given Redis 缓存已启用，when 多个相同请求同时到达，then 缓存 TTL 使用随机化偏移（±10%）

#### 管理后台 AC

- [ ] **AC 13：** Given 管理后台已启动，when 访问 `http://localhost:3001`，then 页面正确显示且无控制台错误
- [ ] **AC 14：** Given 管理后台已启动，when 访问 `/login`，then 显示登录表单且样式符合设计规范
- [ ] **AC 15：** Given API 客户端已配置，when 发起 API 请求，then 请求包含正确的 Authorization header
- [ ] **AC 16：** Given API 客户端已配置，when API 返回 401，then 自动清除本地 token 并跳转登录页
- [ ] **AC 17：** Given 管理后台已启动，when 使用 shadcn/ui 组件，then 组件正确渲染且样式一致
- [ ] **AC 18：** Given 管理后台已启动，when TypeScript 编译，then 无类型错误

#### 微信小程序 AC

- [ ] **AC 19：** Given 小程序项目已配置，when 使用微信开发者工具打开，then 项目正确加载且无错误
- [ ] **AC 20：** Given 小程序已配置，when 访问首页，then 显示产品列表页面
- [ ] **AC 21：** Given request 工具已配置，when 发起 API 请求，then 请求包含正确的 baseURL 和 Authorization header
- [ ] **AC 22：** Given 小程序已配置，when 网络请求失败，then 显示友好的错误提示

#### CI/CD AC

- [ ] **AC 23：** Given 代码推送到 GitHub，when CI 工作流运行，then 执行 lint、test、build 且全部通过
- [ ] **AC 24：** Given PR 创建，when CI 检查失败，then PR 显示失败状态且阻止合并

#### 集成测试 AC

- [ ] **AC 25：** Given 所有服务已启动，when 执行端到端测试，then 用户流程（登录 → 查看 Dashboard）测试通过
- [ ] **AC 26：** Given 数据库有测试数据，when 通过 API 查询用户，then 返回正确数据且字段名使用 camelCase

#### 安全 AC

- [ ] **AC 27：** Given 敏感环境变量，when 存储在 `.env` 文件，then 不被提交到 Git 仓库
- [ ] **AC 28：** Given API 响应，when 包含错误信息，then 不暴露敏感的系统信息（如堆栈跟踪）
- [ ] **AC 29：** Given CORS 配置，when 非白名单域名请求 API，then 请求被拒绝

## Additional Context

### Dependencies

**外部依赖：**
- 阿里云 OSS 账号和访问密钥
- PostgreSQL 15
- Redis 7
- Node.js 20+ LTS
- Docker & Docker Compose

**内部依赖：**
- 无（基础 Epic）

### Testing Strategy

**单元测试：**
- NestJS 服务层测试（Jest）
- 工具函数测试
- 核心业务逻辑覆盖率 > 80%

**集成测试：**
- API 端点测试（supertest）
- 数据库操作测试（测试数据库）
- Redis 缓存测试

**E2E 测试：**
- 关键用户流程测试
- 待后续 Epic 完善

### Notes

**开发注意事项：**
- 确保所有服务支持热重载
- API 响应时间 < 200ms（P95）
- 数据库连接池配置合理
- Redis 连接复用
- 错误日志包含完整上下文
- 遵循 project-context.md 中的所有编码规范

**安全注意事项：**
- 敏感信息使用环境变量
- API 限流防止滥用
- CORS 配置仅允许可信来源
- SQL 注入防护（Prisma 参数化查询）
- XSS 防护（React 自动转义）
- 密码使用 bcrypt 加密（cost factor = 10）
- JWT secret 使用强随机字符串（≥ 32 字节）

**已知限制：**
- 本 Epic 不包含完整的登录功能（Epic 2）
- 不包含微信支付集成（Epic 4）
- 不包含通知服务（Epic 5）
- 单元测试覆盖率目标 80%，部分工具函数可能无测试
- Docker 环境仅用于开发，生产环境需单独配置

**未来考虑（超出范围）：**
- Docker 镜像优化和部署策略
- 生产环境数据库备份策略
- 监控和告警系统（Prometheus + Grafana）
- 日志聚合系统（ELK Stack）
- API 版本管理策略
- 微服务拆分（如需要）
- 缓存预热策略
- CDN 配置优化
- 前端性能监控
- 错误追踪（Sentry）

**风险评估：**
1. **Docker 环境复杂性** - 学习曲线，需文档支持
2. **Prisma 迁移管理** - 需要制定迁移策略
3. **JWT token 刷新** - 需要仔细实现避免安全漏洞
4. **Redis 单点故障** - 开发环境可接受，生产需考虑高可用
5. **OSS 直传安全性** - 需要严格验证签名和文件类型

**建议的实施顺序：**
1. Phase 1（根目录配置）- 1天
2. Phase 2（后端 API）- 2天
3. Phase 3（管理后台）- 1.5天
4. Phase 4（小程序）- 1天
5. Phase 5（CI/CD）- 0.5天

**总计预估：6 天**

**技能要求：**
- 后端开发：熟悉 NestJS、TypeScript、Prisma、Redis
- 前端开发：熟悉 Next.js 15、React、Tailwind CSS、shadcn/ui
- 小程序开发：熟悉微信小程序框架
- DevOps：熟悉 Docker、GitHub Actions

**参考文档：**
- [NestJS 官方文档](https://docs.nestjs.com/)
- [Prisma 官方文档](https://www.prisma.io/docs/)
- [Next.js 15 官方文档](https://nextjs.org/docs)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [阿里云 OSS 文档](https://help.aliyun.com/product/oss/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

---

**技术规范状态：** ✅ Enhanced & Ready for Development
**生成时间：** 2026-01-10
**最后更新：** 2026-01-10 (Advanced Elicitation)
**预计工作量：** 6 天
**总任务数：** 46 个任务（42 个基础 + 4 个高级优化）
**验收标准：** 33 个 AC（29 个基础 + 4 个增强）
**优先级：** P0（最高优先级，其他 Epic 的基础）

**高级增强内容：**
- ✅ 统一错误码系统（ErrorCode 枚举 + 错误消息映射）
- ✅ 环境变量启动验证（Joi schema + abortEarly）
- ✅ 优雅关闭配置（shutdownHooks + 未捕获异常处理）
- ✅ Redis 缓存 TTL 随机化（防止缓存雪崩）
