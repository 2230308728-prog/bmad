---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ["prd.md", "architecture.md"]
status: "ready-for-development"
---

# bmad - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**用户账户管理:**
- FR1: 家长可以使用微信授权登录系统
- FR2: 系统可以存储和管理家长用户的基本信息
- FR3: 管理员可以使用账号密码登录管理后台
- FR4: 系统可以区分家长用户和管理员用户角色

**产品发现:**
- FR5: 家长可以浏览研学产品列表，按分类展示
- FR6: 家长可以使用关键词搜索研学产品
- FR7: 家长可以查看研学产品的详细信息，包括图片、价格、日期
- FR8: 家长可以查看其他家长对研学产品的评价
- FR9: 家长可以按价格、日期、类别筛选研学产品

**预订和支付:**
- FR10: 家长可以选择研学产品的具体日期或场次
- FR11: 家长可以填写预订信息，包括孩子姓名、年龄、联系方式
- FR12: 家长可以查看订单确认信息和总价格
- FR13: 家长可以使用微信支付完成订单支付
- FR14: 系统可以验证支付结果并显示支付成功页面

**订单管理:**
- FR15: 家长可以查看自己的所有订单列表
- FR16: 家长可以查看订单的详细信息
- FR17: 家长可以跟踪订单的状态变化
- FR18: 家长可以查看产品的退改规则
- FR19: 家长可以申请订单退款
- FR20: 家长可以查询退款处理进度

**通知服务:**
- FR21: 系统可以在家长完成支付后发送订单确认通知
- FR22: 系统可以在订单状态发生变化时通知家长
- FR23: 系统可以在退款处理完成后通知家长

**管理后台 - 产品管理:**
- FR24: 管理员可以新增研学产品，包括标题、图片、价格、库存、描述
- FR25: 管理员可以编辑现有研学产品的信息
- FR26: 管理员可以上架研学产品使其对家长可见
- FR27: 管理员可以下架研学产品使其对家长不可见
- FR28: 管理员可以管理研学产品的库存数量

**管理后台 - 订单管理:**
- FR29: 管理员可以查看所有订单列表
- FR30: 管理员可以按订单状态或日期筛选订单
- FR31: 管理员可以查看订单的详细信息
- FR32: 管理员可以更新订单的状态（确认、完成）
- FR33: 管理员可以查看退款申请列表
- FR34: 管理员可以审核并批准退款申请
- FR35: 管理员可以查询退款处理记录

**管理后台 - 用户管理:**
- FR36: 管理员可以查看注册用户的基本信息
- FR37: 管理员可以查看用户的订单历史
- FR38: 管理员可以处理用户的问题和投诉

**管理后台 - 数据分析:**
- FR39: 管理员可以查看今日和本周的订单量统计
- FR40: 管理员可以查看注册用户总数统计
- FR41: 管理员可以查看热门产品排行

### NonFunctional Requirements

**Performance (性能):**
- NFR1: 小程序页面在2秒内完成加载
- NFR2: 用户从打开小程序到完成预订的流程在5分钟内完成
- NFR3: 支付请求在3秒内完成处理
- NFR4: 产品搜索在1秒内返回结果
- NFR5: 系统支持2000个用户同时使用，性能下降不超过10%
- NFR6: 系统在高峰期能处理每秒100个订单请求
- NFR7: 产品列表支持分页加载，每页最多显示20个产品
- NFR8: 产品详情页图片进行压缩优化，确保快速加载

**Security (安全):**
- NFR9: 所有用户数据在传输过程中使用HTTPS加密
- NFR10: 敏感用户数据（如手机号）在数据库中加密存储
- NFR11: 支付相关数据符合微信支付安全规范
- NFR12: 管理员后台使用账号密码登录，密码使用bcrypt加密存储
- NFR13: 管理员会话在30分钟无活动后自动过期
- NFR14: 家长用户通过微信授权登录，无需存储密码
- NFR15: 管理员只能访问其权限范围内的功能
- NFR16: 家长用户只能查看自己的订单信息，不能访问他人订单
- NFR17: 用户个人信息收集符合《个人信息保护法》要求
- NFR18: 用户敏感信息（手机号）需要明确授权后获取
- NFR19: 系统提供用户隐私政策说明，小程序首次打开时展示
- NFR20: 系统定期进行安全审计，至少每季度一次
- NFR21: 系统具备防SQL注入、XSS攻击等基础安全防护
- NFR22: 支付流程使用微信官方SDK，不直接处理支付信息

**Scalability (可扩展性):**
- NFR23: 系统设计支持从初始1万用户增长到10万用户，无需架构重构
- NFR24: 系统支持订单量从1000单/月增长到5000单/月
- NFR25: 系统支持通过增加服务器节点进行水平扩展
- NFR26: 数据库支持读写分离，以支持更高并发
- NFR27: 系统支持存储10万+产品记录
- NFR28: 系统支持存储100万+订单记录

**Reliability (可靠性):**
- NFR29: 系统可用性达到99.9%，即每月停机时间不超过43分钟
- NFR30: 关键功能（支付、订单创建）可用性达到99.95%
- NFR31: 订单数据创建后不丢失，即使在系统故障情况下
- NFR32: 支付数据与微信系统实时同步，确保一致性
- NFR33: 系统每日自动备份数据，备份数据保留30天
- NFR34: 系统在支付失败时提供明确的错误信息给用户
- NFR35: 系统在网络异常时提供重试机制
- NFR36: 系统在服务器错误时返回友好的错误页面

**Integration (集成):**
- NFR37: 系统与微信登录API集成，支持用户快速登录
- NFR38: 系统与微信支付JSAPI集成，支持小程序内支付
- NFR39: 系统与微信模板消息API集成，支持发送订单和出行通知
- NFR40: 微信API调用失败时，系统记录日志并触发告警
- NFR41: 系统支持CDN集成，用于加速图片和静态资源加载
- NFR42: 系统预留扩展接口，未来可接入短信服务、客服系统等
- NFR43: 小程序前端与后端API通过RESTful接口通信
- NFR44: API请求和响应使用JSON格式
- NFR45: API接口包含版本控制（/v1/），支持未来平滑升级

**Maintainability (可维护性):**
- NFR46: 代码遵循统一的编码规范和风格指南
- NFR47: 核心业务逻辑代码单元测试覆盖率达到80%以上
- NFR48: 关键支付流程代码经过代码审查
- NFR49: 系统提供API文档，描述所有接口的请求和响应格式
- NFR50: 系统集成日志监控，实时追踪错误和异常
- NFR51: 系统集成性能监控，跟踪响应时间和并发情况

### Additional Requirements

**从架构文档提取的技术需求:**

- **项目初始化** - 使用Next.js 15 + NestJS + Prisma启动模板
  - Next.js初始化命令：`npx create-next-app@latest admin-dashboard --typescript --tailwind --app --eslint`
  - NestJS初始化命令：`npx @nestjs/cli new backend-api --package-manager npm --strict`
  - Prisma初始化：`npx prisma migrate dev --name init`

- **基础设施设置**
  - 阿里云ECS托管（后端API）
  - 阿里云OSS对象存储（图片）
  - 阿里云Redis缓存
  - 阿里云RDS PostgreSQL数据库
  - CDN集成（静态资源加速）

- **外部服务集成**
  - 微信登录API
  - 微信支付JSAPI
  - 微信模板消息/订阅消息API

- **数据模型设计**
  - Prisma Schema-First方式
  - 数据库表命名：小写复数snake_case
  - 外键命名：{table}_id格式
  - 自动迁移：snake_case(数据库) → camelCase(TypeScript)

- **API设计**
  - RESTful API，版本控制 /v1/
  - 统一响应包装：{data, meta}
  - Swagger/OpenAPI文档
  - 错误格式：{statusCode, message, error, timestamp}

- **认证与授权**
  - 小程序端：微信授权登录换取JWT
  - 管理端：账号密码 + JWT会话管理
  - JWT + NestJS Auth Module
  - 角色权限：Guard装饰器

- **监控与日志**
  - NestJS Logger + 阿里云日志服务
  - 结构化日志（JSON格式）
  - 错误追踪、性能监控
  - 支付集成监控

### FR Coverage Map

```
FR1:   Epic 2 - 用户认证系统（微信授权登录）
FR2:   Epic 2 - 用户认证系统（存储用户信息）
FR3:   Epic 2 - 用户认证系统（管理员账号密码登录）
FR4:   Epic 2 - 用户认证系统（角色权限区分）

FR5:   Epic 3 - 产品发现与管理（产品列表浏览）
FR6:   Epic 3 - 产品发现与管理（关键词搜索）
FR7:   Epic 3 - 产品发现与管理（产品详情）
FR8:   Epic 3 - 产品发现与管理（产品评价）
FR9:   Epic 3 - 产品发现与管理（产品筛选）

FR10:  Epic 4 - 预订与支付（选择日期或场次）
FR11:  Epic 4 - 预订与支付（填写预订信息）
FR12:  Epic 4 - 预订与支付（订单确认）
FR13:  Epic 4 - 预订与支付（微信支付）
FR14:  Epic 4 - 预订与支付（支付结果验证）

FR15:  Epic 5 - 订单管理与通知（订单列表）
FR16:  Epic 5 - 订单管理与通知（订单详情）
FR17:  Epic 5 - 订单管理与通知（状态跟踪）
FR18:  Epic 5 - 订单管理与通知（退改规则）
FR19:  Epic 5 - 订单管理与通知（申请退款）
FR20:  Epic 5 - 订单管理与通知（退款进度）

FR21:  Epic 5 - 订单管理与通知（订单确认通知）
FR22:  Epic 5 - 订单管理与通知（状态变更通知）
FR23:  Epic 5 - 订单管理与通知（退款完成通知）

FR24:  Epic 3 - 产品发现与管理（新增产品）
FR25:  Epic 3 - 产品发现与管理（编辑产品）
FR26:  Epic 3 - 产品发现与管理（上架产品）
FR27:  Epic 3 - 产品发现与管理（下架产品）
FR28:  Epic 3 - 产品发现与管理（库存管理）

FR29:  Epic 5 - 订单管理与通知（管理员订单列表）
FR30:  Epic 5 - 订单管理与通知（订单筛选）
FR31:  Epic 5 - 订单管理与通知（订单详情）
FR32:  Epic 5 - 订单管理与通知（状态更新）
FR33:  Epic 5 - 订单管理与通知（退款列表）
FR34:  Epic 5 - 订单管理与通知（退款审核）
FR35:  Epic 5 - 订单管理与通知（退款记录）

FR36:  Epic 6 - 用户管理与分析（用户信息查看）
FR37:  Epic 6 - 用户管理与分析（订单历史）
FR38:  Epic 6 - 用户管理与分析（问题处理）

FR39:  Epic 6 - 用户管理与分析（订单量统计）
FR40:  Epic 6 - 用户管理与分析（用户统计）
FR41:  Epic 6 - 用户管理与分析（热门产品排行）
```

## Epic List

### Epic 1: 项目初始化与基础设施 🚀

**目标：** 建立完整的技术基础，支持所有后续功能开发

**用户价值：** 为整个系统提供稳定可靠的技术基础，确保开发效率和系统质量

**FRs覆盖：** 技术基础需求（架构文档）

**实施要点：**
- Next.js 15管理后台初始化（TypeScript + Tailwind + shadcn/ui）
- NestJS后端API初始化（Strict模式 + 模块化架构）
- Prisma + PostgreSQL数据库设置（Schema-First方式）
- Redis缓存配置（支持2000并发）
- 阿里云OSS集成（图片存储）
- 基础中间件（错误处理、日志、限流）
- CI/CD配置（GitHub Actions）
- Swagger/API文档设置

**依赖关系：** 无（基础Epic）

---

### Epic 2: 用户认证系统 🔐

**目标：** 家长和管理员都能安全登录系统

**用户价值：**
- 家长：使用微信授权快速登录系统
- 管理员：使用账号密码安全登录管理后台

**FRs覆盖：** FR1, FR2, FR3, FR4

**实施要点：**
- **家长端：** 微信授权登录（wx.getUserProfile + wx.login）
- **管理端：** 账号密码登录（bcrypt加密存储）
- JWT token管理（访问令牌 + 刷新令牌）
- 角色权限系统（家长 vs 管理员）
- 会话管理（30分钟自动过期）
- 用户信息存储（OpenID、昵称、头像）

**依赖关系：** 依赖Epic 1

---

### Epic 3: 产品发现与管理 📦

**目标：** 家长可以发现并选择合适的研学产品，管理员可以完整管理产品

**用户价值：**
- 家长：通过分类、搜索、筛选快速找到心仪的研学产品
- 管理员：轻松管理产品信息、库存、上架下架

**FRs覆盖：** FR5, FR6, FR7, FR8, FR9, FR24, FR25, FR26, FR27, FR28

**实施要点：**
- **家长端（小程序）：**
  - 产品列表（分类展示、分页加载）
  - 产品搜索（关键词）
  - 产品筛选（价格、日期、类别）
  - 产品详情（图片、价格、日期、评价）
- **管理端（后台）：**
  - 产品CRUD（创建、编辑、删除）
  - 产品上架/下架
  - 库存管理
  - 图片上传（OSS直传）

**依赖关系：** 依赖Epic 1、Epic 2

---

### Epic 4: 预订与支付 💳

**目标：** 家长可以选择日期、填写信息、完成支付，体验流畅的预订流程

**用户价值：** 家长可以在5分钟内完成从选择到支付的全流程

**FRs覆盖：** FR10, FR11, FR12, FR13, FR14

**实施要点：**
- 选择日期或场次（日期选择器）
- 填写预订信息表单（孩子姓名、年龄、联系方式）
- 订单确认页（产品信息、总价格）
- 微信支付集成（JSAPI调用）
- 支付结果验证（异步回调处理）
- 支付成功/失败页面

**依赖关系：** 依赖Epic 1、Epic 2、Epic 3

---

### Epic 5: 订单管理与通知 📋

**目标：** 家长可以管理订单和申请退款，管理员可以处理订单和审核退款，系统自动发送通知

**用户价值：**
- 家长：随时查看订单状态，便捷申请退款
- 管理员：批量处理订单，高效审核退款
- 自动通知：订单确认、状态变更、退款到账

**FRs覆盖：** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR29, FR30, FR31, FR32, FR33, FR34, FR35

**实施要点：**
- **家长端（小程序）：**
  - 我的订单列表（全部订单）
  - 订单详情（产品、时间、地点）
  - 状态跟踪（待确认、已确认、已完成）
  - 退改规则展示
  - 退款申请（一键申请）
  - 退款进度查询
- **管理端（后台）：**
  - 订单列表（全部订单）
  - 订单筛选（状态、日期）
  - 批量处理订单
  - 退款申请列表
  - 退款审核（批准/拒绝）
- **通知服务：**
  - 订单确认通知（支付成功）
  - 出行提醒通知（活动前24小时）
  - 退款通知（退款到账）

**依赖关系：** 依赖Epic 1、Epic 2、Epic 4

---

### Epic 6: 用户管理与分析 👥

**目标：** 管理员可以全面了解用户情况和平台运营数据

**用户价值：** 管理员数据驱动决策，优化产品和运营策略

**FRs覆盖：** FR36, FR37, FR38, FR39, FR40, FR41

**实施要点：**
- 用户信息查看（基本信息、注册时间）
- 用户订单历史（查询特定用户的订单）
- 用户问题处理（投诉记录）
- 数据看板：
  - 今日/本周订单量统计
  - 注册用户总数统计
  - 热门产品TOP10排行
  - 转化率分析

**依赖关系：** 依赖Epic 1、Epic 2

---

### Epic 依赖关系图

```
Epic 1 (项目初始化)
    ↓
Epic 2 (用户认证)
    ↓
Epic 3 (产品发现) ─────┐
    ↓                  │
Epic 4 (预订支付)       │
    ↓                  │
Epic 5 (订单通知) ───────┘
    ↓
Epic 6 (用户分析)
```

**关键原则：**
- ✅ Epic 1独立（无依赖）
- ✅ Epic 2依赖Epic 1
- ✅ Epic 3依赖Epic 1、2（可以并行开发）
- ✅ Epic 4依赖Epic 1、2、3（顺序交付）
- ✅ Epic 5依赖Epic 1、2、4（核心流程）
- ✅ Epic 6依赖Epic 1、2（可并行Epic 3-5）

---

## Epic 1: 项目初始化与基础设施 🚀

### Story 1.1: 初始化 Next.js 15 管理后台项目

As a 开发者,
I want 使用 Next.js 15 创建管理后台项目的基础框架,
So that 团队可以在现代化、高性能的前端框架上构建管理员界面。

**Acceptance Criteria:**

**Given** 开发环境已安装 Node.js 20+ LTS 和 npm
**When** 执行 `npx create-next-app@latest admin-dashboard --typescript --tailwind --app --eslint`
**Then** 成功创建 admin-dashboard 目录，包含 Next.js 15 标准项目结构
**And** TypeScript 配置启用 strict 模式（`"strict": true` in tsconfig.json）
**And** Tailwind CSS 4 已配置并正常工作
**And** ESLint 规则已启用，使用 Next.js 推荐配置
**And** 项目使用 App Router（app/ 目录结构）
**And** 执行 `npm run dev` 可以启动开发服务器在 localhost:3000
**And** 执行 `npm run build` 可以成功构建生产版本
**And** 创建 .gitignore 文件，包含 node_modules、.next、.env 等

---

### Story 1.2: 初始化 NestJS 后端 API 项目

As a 开发者,
I want 使用 NestJS Strict 模式创建后端 API 项目,
So that 团队可以在企业级、模块化的 Node.js 框架上构建可扩展的后端服务。

**Acceptance Criteria:**

**Given** 开发环境已安装 Node.js 20+ LTS 和 npm
**When** 执行 `npx @nestjs/cli new backend-api --package-manager npm --strict`
**Then** 成功创建 backend-api 目录，包含 NestJS 标准项目结构
**And** TypeScript 配置启用 strict 模式
**And** 项目使用模块化架构（src/ 目录包含 modules/）
**And** 默认的 AppModule 和 UsersController 已创建并可用
**And** 执行 `npm run start:dev` 可以启动开发服务器
**And** 访问 http://localhost:3000 返回 "Hello World" 响应
**And** 创建 .gitignore 文件，包含 node_modules、dist、.env 等
**And** 配置 tsconfig.json 支持装饰器（`experimentalDecorators: true`）

---

### Story 1.3: 配置 Prisma 和 PostgreSQL 数据库

As a 开发者,
I want 初始化 Prisma ORM 并连接到 PostgreSQL 数据库,
So that 团队可以使用类型安全的数据库访问方式管理数据持久化。

**Acceptance Criteria:**

**Given** NestJS 项目已创建（Story 1.2 完成）
**When** 在 backend-api 目录执行 `npm install @prisma/client` 和 `npm install -D prisma`
**And** 执行 `npx prisma init`
**Then** 创建 prisma/ 目录，包含 schema.prisma 文件
**And** schema.prisma 配置 PostgreSQL 数据库连接（使用环境变量 DATABASE_URL）
**And** 创建 .env 文件，包含 DATABASE_URL 模板
**And** 配置 Prisma Client 生成命令（`prisma generate`）
**And** 在 NestJS 中创建 PrismaService（prisma.service.ts）提供单例访问
**And** 在 AppModule 中导入 PrismaService
**When** 执行 `npx prisma migrate dev --name init`
**Then** 创建初始数据库迁移文件
**And** 数据库中生成 _prisma_migrations 表用于迁移追踪
**And** 执行 `npx prisma studio` 可以启动数据库管理界面
**And** 在 src/ 目录创建 prisma/ 目录用于存放 schema

---

### Story 1.4: 配置 Redis 缓存服务

As a 开发者,
I want 配置 Redis 客户端并实现基础缓存服务,
So that 应用支持高并发场景（2000并发用户）并提供快速数据访问。

**Acceptance Criteria:**

**Given** NestJS 项目已创建（Story 1.2 完成）
**When** 执行 `npm install @nestjs/cache-manager cache-manager cache-manager-ioredis`
**And** 执行 `npm install ioredis`
**Then** 创建 RedisModule（redis.module.ts）封装 Redis 配置
**And** 在 .env 文件中添加 REDIS_HOST、REDIS_PORT 配置项
**And** 创建 CacheService（cache.service.ts）提供 get/set/del 方法
**And** CacheService 支持设置过期时间（TTL）
**And** 在 AppModule 中导入 CacheModule 并配置为全局模块
**When** 应用启动时，Redis 连接成功建立
**And** Redis 连接失败时，应用记录错误日志但继续运行（降级策略）
**And** 实现 Redis 健康检查端点 GET /health/redis

---

### Story 1.5: 集成阿里云 OSS 对象存储

As a 开发者,
I want 配置阿里云 OSS SDK 并实现图片上传服务,
So that 应用可以安全、高效地存储和管理用户上传的图片资源。

**Acceptance Criteria:**

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

---

### Story 1.6: 实现基础中间件系统

As a 开发者,
I want 实现全局错误处理、请求日志和限流中间件,
So that 应用具备生产环境所需的基础防护和监控能力。

**Acceptance Criteria:**

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

---

### Story 1.7: 配置 Swagger API 文档

As a 开发者,
I want 集成 Swagger/OpenAPI 自动生成 API 文档,
So that 团队和第三方开发者可以清晰了解所有 API 接口的定义和用法。

**Acceptance Criteria:**

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

---

### Story 1.8: 配置 GitHub Actions CI/CD

As a 开发者,
I want 配置 GitHub Actions 自动化测试和部署流程,
So that 每次代码提交自动验证代码质量并支持持续部署。

**Acceptance Criteria:**

**Given** 项目代码已推送到 GitHub 仓库
**When** 在 .github/workflows/ 目录创建 ci.yml 文件
**Then** 配置以下工作流步骤：
  1. 检出代码（actions/checkout）
  2. 设置 Node.js 20 环境
  3. 安装依赖（npm ci）
  4. 运行 Lint 检查（npm run lint）
  5. 运行 TypeScript 编译（npm run build）
  6. 运行单元测试（npm test）
**And** 工作流在 push 和 pull_request 事件时触发
**When** 在 .github/workflows/ 目录创建 deploy-backend.yml 文件
**Then** 配置部署步骤：
  1. 在主分支合并时触发
  2. 构建 Docker 镜像
  3. 推送到阿里云容器镜像服务
  4. 更新 ECS 上的部署
**And** 部署需要手动批准（workflow_dispatch）
**When** 在 .github/workflows/ 目录创建 deploy-frontend.yml 文件
**Then** 配置 Next.js 管理后台的构建和部署流程
**And** 部署到阿里云 CDN + OSS 静态网站托管
**And** 所有敏感信息（SSH 密钥、API 密钥）使用 GitHub Secrets 存储

---

## Epic 2: 用户认证系统 🔐

### Story 2.1: 设计并创建用户数据模型

As a 开发者,
I want 在 Prisma schema 中定义用户数据模型,
So that 应用可以持久化存储家长和管理员的用户信息。

**Acceptance Criteria:**

**Given** Epic 1 已完成（Prisma 已配置）
**When** 在 prisma/schema.prisma 中定义 User 模型
**Then** User 模型包含以下字段：
  - id: Int @id @default(autoincrement())
  - openid: String? (家长微信 OpenID，唯一索引)
  - nickname: String? (用户昵称)
  - avatar_url: String? (头像URL)
  - phone: String? (手机号，加密存储)
  - role: Role (枚举：PARENT, ADMIN)
  - status: UserStatus (枚举：ACTIVE, INACTIVE, BANNED)
  - created_at: DateTime @default(now())
  - updated_at: DateTime @updatedAt
**And** 定义 Role 枚举：enum Role { PARENT, ADMIN }
**And** 定义 UserStatus 枚举：enum UserStatus { ACTIVE, INACTIVE, BANNED }
**And** openid 字段添加唯一索引（@@unique([openid])）
**And** 执行 `npx prisma migrate dev --name add_user_model` 创建迁移
**And** 迁移成功应用到数据库
**And** Prisma Client 重新生成类型定义

---

### Story 2.2: 实现 JWT 认证基础设施

As a 开发者,
I want 配置 JWT 模块并实现令牌生成和验证服务,
So that 应用可以使用标准的 JWT 机制进行用户认证。

**Acceptance Criteria:**

**Given** Epic 1 已完成（NestJS 项目已创建）
**When** 执行 `npm install @nestjs/jwt @nestjs/passport passport passport-jwt`
**And** 执行 `npm install -D @types/passport-jwt`
**Then** 在 .env 文件中添加 JWT 配置：
  - JWT_SECRET（密钥，至少32字符）
  - JWT_ACCESS_TOKEN_EXPIRATION（访问令牌过期时间，默认15分钟）
  - JWT_REFRESH_TOKEN_EXPIRATION（刷新令牌过期时间，默认7天）
**And** 创建 AuthModule（auth.module.ts）导入 JwtModule.registerAsync()
**And** 创建 AuthService（auth.service.ts）提供以下方法：
  - generateTokens(userId: number): 生成访问令牌和刷新令牌
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
**And** 所有令牌使用 RS256 算法签名
**And** 创建 JwtStrategy（jwt.strategy.ts）用于 Passport 验证

---

### Story 2.3: 实现管理员账号密码登录

As a 管理员,
I want 使用账号和密码登录管理后台,
So that 我可以安全地访问系统的管理功能。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2.1、Epic 2.2 已完成
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
**And** 生成访问令牌和刷新令牌
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

---

### Story 2.4: 实现家长微信授权登录

As a 家长,
I want 使用微信授权快速登录小程序,
So that 我无需记住密码即可方便地访问系统功能。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2.1、Epic 2.2 已完成
**When** 创建 ParentAuthController（parent-auth.controller.ts）
**Then** 实现以下端点：
  - POST /api/v1/parent/auth/wechat-login: 微信授权登录
**When** POST /api/v1/parent/auth/wechat-login 接收请求：
  - Body: { code: string, userInfo: { nickname: string, avatarUrl: string } }
**Then** 使用微信 code 调用微信 API换取 openid
**And** 微信 API 调用地址：https://api.weixin.qq.com/sns/jscode2session
**And** 从环境变量读取 WECHAT_APP_ID 和 WECHAT_APP_SECRET
**And** 根据 openid 查询数据库：
  - 如果用户存在：更新昵称和头像
  - 如果用户不存在：创建新用户（role: PARENT, status: ACTIVE）
**And** 生成访问令牌和刷新令牌
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

---

### Story 2.5: 实现角色权限 Guard

As a 开发者,
I want 创建基于角色的访问控制 Guard,
So that 不同角色的用户只能访问其权限范围内的功能。

**Acceptance Criteria:**

**Given** Epic 2.2 已完成（JWT 令牌验证已实现）
**When** 创建 RolesGuard（roles.guard.ts）
**Then** Guard 从 JWT 令牌中提取用户角色
**And** 使用 Reflector 获取装饰器定义的角色要求
**And** 比较用户角色和所需角色，匹配则允许访问
**And** 不匹配返回 403：{ "statusCode": 403, "message": "权限不足" }
**When** 创建 @Roles() 装饰器
**Then** 装饰器接受角色数组参数：@Roles(Role.ADMIN, Role.PARENT)
**And** 可用于 Controller 或 Handler 级别
**When** 创建 @CurrentUser() 装饰器
**Then** 从请求中提取当前用户信息
**And** 包含用户 ID 和角色
**When** 应用权限保护到端点：
**Then** POST /api/v1/admin/* 仅限 ADMIN 角色访问
**And** POST /api/v1/parent/orders 仅限 PARENT 角色访问
**And** GET /api/v1/products 允许所有角色访问
**And** 在 AdminAuthController 中应用 @UseGuards(AuthGuard('jwt'), RolesGuard)
**And** 在 ParentAuthController 中应用 @UseGuards(AuthGuard('jwt'))

---

### Story 2.6: 实现令牌刷新和会话管理

As a 用户,
I want 使用刷新令牌获取新的访问令牌,
So that 我无需频繁重新登录即可持续使用系统。

**Acceptance Criteria:**

**Given** Epic 2.2、Epic 2.3、Epic 2.4 已完成
**When** 在 AuthController 中添加端点
**Then** 实现 POST /api/v1/auth/refresh 刷新令牌端点
**And** 实现 POST /api/v1/auth/logout 登出端点
**When** POST /api/v1/auth/refresh 接收请求：
  - Body: { refreshToken: string }
**Then** 验证刷新令牌的有效性和类型
**And** 从令牌中提取用户ID
**And** 查询数据库验证用户状态为 ACTIVE
**And** 生成新的访问令牌和刷新令牌
**And** 返回 200：{ "data": { "accessToken": "new_token", "refreshToken": "new_refresh_token" } }
**And** 旧的刷新令牌被标记为已失效（存储在 Redis 黑名单中）
**When** POST /api/v1/auth/logout 接收请求：
  - Headers: Authorization: Bearer {accessToken}
**Then** 验证访问令牌
**And** 将访问令牌和关联的刷新令牌加入 Redis 黑名单
**And** 黑名单 TTL 设置为令牌的剩余有效期
**And** 返回 200：{ "data": { "message": "登出成功" } }
**When** 访问令牌验证时
**Then** 检查 Redis 黑名单是否存在该令牌
**And** 如果存在则返回 401：{ "statusCode": 401, "message": "令牌已失效" }
**And** 实现令牌验证拦截器在所有受保护的路由
**And** 访问令牌默认 15 分钟过期
**And** 刷新令牌默认 7 天过期
**And** 过期时间可通过环境变量配置

---

## Epic 3: 产品发现与管理 📦

### Story 3.1: 设计并创建产品数据模型

As a 开发者,
I want 在 Prisma schema 中定义产品数据模型,
So that 应用可以持久化存储研学产品的完整信息。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2 已完成
**When** 在 prisma/schema.prisma 中定义 Product 和 ProductCategory 模型
**Then** ProductCategory 模型包含：
  - id: Int @id @default(autoincrement())
  - name: String (分类名称，如"自然科学"、"历史文化")
  - description: String? (分类描述)
  - sort_order: Int @default(0) (排序权重)
  - created_at: DateTime @default(now())
**And** Product 模型包含：
  - id: Int @id @default(autoincrement())
  - title: String (产品标题)
  - description: String (详细描述，支持富文本)
  - category_id: Int (外键关联 ProductCategory)
  - price: Decimal(10, 2) (价格)
  - original_price: Decimal(10, 2)? (原价，用于展示优惠)
  - stock: Int @default(0) (库存数量)
  - min_age: Int @default(3) (最小年龄)
  - max_age: Int @default(18) (最大年龄)
  - duration: String (活动时长，如"3天2夜")
  - location: String (活动地点)
  - images: String[] (图片URL数组)
  - status: ProductStatus (枚举：DRAFT, PUBLISHED, UNPUBLISHED)
  - featured: Boolean @default(false) (是否推荐)
  - view_count: Int @default(0) (浏览次数)
  - booking_count: Int @default(0) (预订次数)
  - created_at: DateTime @default(now())
  - updated_at: DateTime @updatedAt
**And** 定义 ProductStatus 枚举：enum ProductStatus { DRAFT, PUBLISHED, UNPUBLISHED }
**And** Product 与 ProductCategory 关联：@relation(fields: [category_id], references: [id])
**And** 执行 `npx prisma migrate dev --name add_product_models` 创建迁移
**And** 迁移成功应用到数据库
**And** 为 title 字段添加全文搜索索引（支持 PostgreSQL）

---

### Story 3.2: 实现产品列表查询 API

As a 家长,
I want 浏览研学产品列表并按分类查看,
So that 我可以快速找到感兴趣的研学活动。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3.1 已完成
**When** 创建 ProductsController（products.controller.ts）
**Then** 实现 GET /api/v1/products 端点
**When** GET /api/v1/products 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认20，最大50)
  - categoryId: number? (可选，按分类筛选)
  - sortBy: 'price_asc' | 'price_desc' | 'created' | 'popular' (默认'created')
**Then** 查询 PUBLISHED 状态的产品
**And** 支持按 categoryId 筛选
**And** 根据 sortBy 参数排序：
  - price_asc: 价格从低到高
  - price_desc: 价格从高到低
  - created: 创建时间从新到旧
  - popular: 预订次数从多到少
**And** 返回分页数据：
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "上海科技馆探索之旅",
        "price": "299.00",
        "originalPrice": "399.00",
        "images": ["https://..."],
        "location": "上海",
        "duration": "1天",
        "stock": 50,
        "featured": true
      }
    ],
    "meta": {
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5
    }
  }
  ```
**And** 产品列表缓存到 Redis（TTL: 5分钟）
**And** 响应时间不超过 1 秒（NFR4）

---

### Story 3.3: 实现产品搜索和筛选 API

As a 家长,
I want 使用关键词搜索产品并按条件筛选,
So that 我可以精确找到符合需求的研学产品。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3.1、Epic 3.2 已完成
**When** 在 ProductsController 中实现 GET /api/v1/products/search 端点
**Then** 接收请求参数：
  - keyword: string (搜索关键词)
  - categoryId: number? (分类筛选)
  - minPrice: decimal? (最低价格)
  - maxPrice: decimal? (最高价格)
  - minAge: number? (最小年龄)
  - maxAge: number? (最大年龄)
  - location: string? (地点筛选)
  - page: number (默认1)
  - pageSize: number (默认20)
**When** keyword 参数提供
**Then** 使用 PostgreSQL 全文搜索匹配：
  - title 字段
  - description 字段
  - location 字段
**And** 搜索结果按相关性排序
**When** 价格范围参数提供
**Then** 筛选 price 在 minPrice 和 maxPrice 之间的产品
**When** 年龄范围参数提供
**Then** 筛选符合年龄要求的产品：
  - 产品的 min_age <= 查询的 max_age
  - 产品的 max_age >= 查询的 min_age
**When** location 参数提供
**Then** 使用 LIKE 匹配 location 字段
**And** 所有筛选条件可以组合使用
**And** 返回与 Story 3.2 相同的分页格式
**And** 搜索结果缓存到 Redis（使用参数哈希作为键，TTL: 2分钟）

---

### Story 3.4: 实现产品详情 API

As a 家长,
I want 查看研学产品的详细信息,
So that 我可以全面了解产品内容并做出预订决策。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3.1 已完成
**When** 在 ProductsController 中实现 GET /api/v1/products/:id 端点
**Then** 根据 id 查询产品详情
**And** 验证产品状态为 PUBLISHED
**And** 返回完整产品信息：
  ```json
  {
    "data": {
      "id": 1,
      "title": "上海科技馆探索之旅",
      "description": "<p>详细的产品介绍...</p>",
      "category": {
        "id": 1,
        "name": "自然科学"
      },
      "price": "299.00",
      "originalPrice": "399.00",
      "stock": 50,
      "minAge": 6,
      "maxAge": 12,
      "duration": "1天",
      "location": "上海浦东新区",
      "images": [
        "https://oss.example.com/products/1/image1.jpg",
        "https://oss.example.com/products/1/image2.jpg"
      ],
      "featured": true,
      "viewCount": 1234,
      "bookingCount": 89,
      "createdAt": "2024-01-09T12:00:00Z"
    }
  }
  ```
**When** 产品不存在
**Then** 返回 404：{ "statusCode": 404, "message": "产品不存在" }
**When** 产品状态不是 PUBLISHED
**Then** 返回 404（隐藏未发布的产品）
**When** 产品详情被查询
**Then** 产品的 view_count 字段自动 +1
**And** 产品详情缓存到 Redis（TTL: 10分钟）

---

### Story 3.5: 实现管理员产品 CRUD API

As a 管理员,
I want 创建、编辑和删除研学产品,
So that 我可以完整管理平台上的所有产品信息。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3.1 已完成
**When** 创建 AdminProductsController（admin-products.controller.ts）
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**When** 实现 POST /api/v1/admin/products 端点
**Then** 接收请求 Body：
  ```json
  {
    "title": "产品标题",
    "description": "产品描述",
    "categoryId": 1,
    "price": 299.00,
    "originalPrice": 399.00,
    "stock": 50,
    "minAge": 6,
    "maxAge": 12,
    "duration": "3天2夜",
    "location": "上海",
    "images": ["url1", "url2"],
    "featured": false,
    "status": "DRAFT"
  }
  ```
**And** 验证所有必填字段（title、description、categoryId、price、stock）
**And** 验证 categoryId 对应的分类存在
**And** 验证 price > 0
**And** 验证 stock >= 0
**And** 创建产品并返回 201 和产品详情
**When** 实现 PATCH /api/v1/admin/products/:id 端点
**Then** 接收部分字段进行更新
**And** 验证产品存在
**And** 更新 updated_at 字段
**And** 返回 200 和更新后的产品详情
**When** 实现 DELETE /api/v1/admin/products/:id 端点
**Then** 使用软删除（设置 status 为 DELETED，或添加 deleted_at 字段）
**And** 返回 204 无内容
**And** 已有订单的产品不能删除，返回 400：{ "statusCode": 400, "message": "该产品已有订单，无法删除" }

---

### Story 3.6: 实现产品上架/下架和库存管理

As a 管理员,
I want 控制产品的上架状态和库存数量,
So that 我可以灵活管理产品的销售状态和供应量。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3.1、Epic 3.5 已完成
**When** 在 AdminProductsController 中实现 PATCH /api/v1/admin/products/:id/status 端点
**Then** 接收请求 Body：{ "status": "PUBLISHED" | "UNPUBLISHED" | "DRAFT" }
**And** 验证产品存在
**And** 更新产品状态
**And** 清除相关的 Redis 缓存
**And** 返回 200 和更新后的产品
**When** 实现 PATCH /api/v1/admin/products/:id/stock 端点
**Then** 接收请求 Body：{ "stock": number, "reason": string? }
**And** 验证 stock >= 0
**And** 更新库存数量
**And** 记录库存变更历史到 ProductStockHistory 表：
  - id: Int @id @default(autoincrement())
  - product_id: Int
  - old_stock: Int
  - new_stock: Int
  - reason: String?
  - created_at: DateTime @default(now())
**And** 清除产品的 Redis 缓存
**And** 返回 200 和更新后的产品信息
**When** 库存数量 < 10
**Then** 产品信息中包含 lowStock: true 标志
**And** 记录日志警告库存不足
**When** 实现 GET /api/v1/admin/products/low-stock 端点
**Then** 返回所有库存 < 10 的产品列表
**And** 按库存数量升序排序

---

### Story 3.7: 实现产品图片上传功能

As a 管理员,
I want 上传产品图片到阿里云 OSS,
So that 产品图片可以安全存储并快速加载。

**Acceptance Criteria:**

**Given** Epic 1、Epic 3.5 已完成（OSS 已配置）
**When** 在 AdminProductsController 中实现 POST /api/v1/admin/products/images/upload 端点
**Then** 使用 @Roles(Role.ADMIN) 权限保护
**And** 接收 multipart/form-data 上传的图片文件
**And** 验证文件类型：仅允许 jpg、jpeg、png、webp
**And** 验证文件大小：最大 5MB
**And** 使用 OssService 生成 OSS 直传签名 URL
**And** 返回签名 URL 给前端
**And** 前端使用签名 URL 直接上传到 OSS（不经过后端）
**When** 图片上传成功后
**Then** 前端调用 PATCH /api/v1/admin/products/:id 端点
**And** 将 OSS 图片 URL 添加到产品的 images 数组
**And** 最多支持 10 张图片
**When** 实现 POST /api/v1/admin/products/images/compress 端点（可选）
**Then** 接收图片 URL
**And** 使用 sharp 库压缩图片：
  - 最大宽度：1920px
  - 质量：80%
  - 格式：自动转换为 webp
**And** 上传压缩后的图片到 OSS
**And** 返回压缩后的图片 URL
**And** 压缩操作使用后台任务队列（可选，使用 Bull Queue）
**And** 图片 URL 包含 CDN 加速域名

---

## Epic 4: 预订与支付 💳

### Story 4.1: 设计并创建订单数据模型

As a 开发者,
I want 在 Prisma schema 中定义订单数据模型,
So that 应用可以持久化存储用户的预订订单信息。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3 已完成
**When** 在 prisma/schema.prisma 中定义 Order 和 OrderItem 模型
**Then** Order 模型包含：
  - id: Int @id @default(autoincrement())
  - order_no: String @unique (订单编号，格式：ORD20240109123456)
  - user_id: Int (外键关联 User)
  - product_id: Int (外键关联 Product)
  - status: OrderStatus (枚举：PENDING, PAID, CANCELLED, COMPLETED, REFUNDED)
  - total_amount: Decimal(10, 2) (订单总金额)
  - paid_amount: Decimal(10, 2) @default(0) (已支付金额)
  - child_name: String (孩子姓名)
  - child_age: Int (孩子年龄)
  - contact_phone: String (联系电话)
  - contact_name: String (联系人姓名)
  - booking_date: DateTime (预订日期/场次)
  - participant_count: Int @default(1) (参与人数)
  - remark: String? (备注)
  - paid_at: DateTime? (支付时间)
  - cancelled_at: DateTime? (取消时间)
  - completed_at: DateTime? (完成时间)
  - created_at: DateTime @default(now())
  - updated_at: DateTime @updatedAt
**And** 定义 OrderStatus 枚举：enum OrderStatus { PENDING, PAID, CANCELLED, COMPLETED, REFUNDED }
**And** Order 与 User 关联：@relation(fields: [user_id], references: [id])
**And** Order 与 Product 关联：@relation(fields: [product_id], references: [id])
**And** 添加复合索引：(user_id, status) 用于查询用户订单
**And** 添加复合索引：(order_no) 用于快速查询订单
**And** 执行 `npx prisma migrate dev --name add_order_models` 创建迁移
**And** 迁移成功应用到数据库

---

### Story 4.2: 实现预订信息提交 API

As a 家长,
I want 提交预订信息创建订单,
So that 我可以预订心仪的研学产品。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3、Epic 4.1 已完成
**When** 创建 OrdersController（orders.controller.ts）
**Then** 实现 POST /api/v1/orders 端点
**And** 应用 @Roles(Role.PARENT) 权限保护
**When** POST /api/v1/orders 接收请求 Body：
  ```json
  {
    "productId": 1,
    "bookingDate": "2024-02-15",
    "childName": "张小明",
    "childAge": 8,
    "contactName": "张爸爸",
    "contactPhone": "13800138000",
    "participantCount": 1,
    "remark": "如有食物过敏请提前告知"
  }
  ```
**Then** 验证 productId 对应的产品存在且状态为 PUBLISHED
**And** 验证产品库存 >= participantCount
**And** 验证 childAge 在产品的 min_age 和 max_age 范围内
**And** 验证 booking_date 格式为有效的日期
**And** 验证 contact_phone 格式为有效的手机号（11位数字）
**And** 计算订单总金额：product.price × participantCount
**And** 生成唯一订单编号（格式：ORD + YYYYMMDD + 8位随机数）
**And** 创建订单，状态为 PENDING
**And** 使用 Redis 原子操作预扣库存：
  - DECRBY product:stock:{productId} participantCount
  - 如果扣减后库存 < 0，则回滚并返回库存不足
**And** 返回 201 状态码和订单信息：
  ```json
  {
    "data": {
      "id": 1,
      "orderNo": "ORD20240109123456789",
      "status": "PENDING",
      "totalAmount": "299.00",
      "product": {
        "id": 1,
        "title": "上海科技馆探索之旅",
        "images": ["https://..."]
      },
      "bookingDate": "2024-02-15",
      "createdAt": "2024-01-09T12:00:00Z"
    }
  }
  ```
**When** 产品库存不足
**Then** 返回 400：{ "statusCode": 400, "message": "库存不足，请选择其他日期或产品" }
**When** 订单创建失败
**Then** 返回 500：{ "statusCode": 500, "message": "订单创建失败，请重试" }
**And** 记录错误日志

---

### Story 4.3: 集成微信支付 JSAPI

As a 家长,
I want 使用微信支付完成订单支付,
So that 我可以方便快捷地完成预订付款。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4.1、Epic 4.2 已完成
**When** 执行 `npm install wechatpay-node-v3` 或类似微信支付 SDK
**And** 在 .env 文件中添加微信支付配置：
  - WECHAT_PAY_APPID (小程序 AppID)
  - WECHAT_PAY_MCHID (商户号)
  - WECHAT_PAY_SERIAL_NO (商户证书序列号)
  - WECHAT_PAY_PRIVATE_KEY_PATH (商户私钥路径)
  - WECHAT_PAY_APIV3_KEY (API v3 密钥)
  - WECHAT_PAY_NOTIFY_URL (支付回调地址)
**When** 在 OrdersController 中实现 POST /api/v1/orders/:id/payment 端点
**Then** 验证订单存在且属于当前用户
**And** 验证订单状态为 PENDING
**And** 调用微信支付统一下单接口：
  - 商品描述：产品标题
  - 订单金额：订单总金额（单位：分）
  - 商户订单号：订单编号
  - 通知 URL：支付结果回调地址
**And** 生成微信支付 JSAPI 调用所需参数：
  - timeStamp (时间戳)
  - nonceStr (随机字符串)
  - package (prepay_id=wx...)
  - signType (RSA)
  - paySign (签名)
**And** 返回 200 和支付参数：
  ```json
  {
    "data": {
      "timeStamp": "1704782400",
      "nonceStr": "abc123",
      "package": "prepay_id=wx123456789",
      "signType": "RSA",
      "paySign": "签名"
    }
  }
  ```
**When** 微信支付 API 调用失败
**Then** 返回 500：{ "statusCode": 500, "message": "支付初始化失败，请重试" }
**And** 记录详细错误日志
**And** 创建 WechatPayService（wechat-pay.service.ts）封装微信支付逻辑

---

### Story 4.4: 实现支付结果异步回调处理

As a 系统,
I want 接收并处理微信支付结果通知,
So that 订单状态可以及时更新并完成支付流程。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4.1、Epic 4.3 已完成
**When** 在 OrdersController 中实现 POST /api/v1/orders/payment/notify 端点
**Then** 此端点不需要认证（微信服务器调用）
**And** 验证微信支付回调签名
**And** 验证回调数据完整性
**When** 接收回调通知：
  - 商户订单号：order_no
  - 微信支付订单号：transaction_id
  - 支付状态：trade_state (SUCCESS, FAIL, 等)
**Then** 根据 order_no 查询订单
**And** 验证订单金额与回调金额一致
**When** trade_state 为 SUCCESS
**Then** 更新订单状态为 PAID
**And** 记录支付时间（paid_at）
**And** 记录已支付金额
**And** 确认库存扣减（Redis 预扣已生效）
**And** 更新产品的 booking_count +1
**And** 清除相关 Redis 缓存
**And** 向用户发送支付成功通知（订阅消息）
**And** 返回 200 和 XML 响应：{ code: "SUCCESS", message: "成功" }
**When** trade_state 为 FAIL 或其他失败状态
**Then** 更新订单状态为 CANCELLED
**And** 释放预扣的库存（Redis INCRBY）
**And** 返回 200 和 XML 响应：{ code: "SUCCESS", message: "成功" }
**When** 订单不存在或金额不匹配
**Then** 记录异常日志
**And** 返回 500（微信会重试通知）
**When** 重复收到同一笔支付成功的通知
**Then** 验证订单已经是 PAID 状态
**And** 直接返回成功（幂等性处理）
**And** 不重复处理业务逻辑

---

### Story 4.5: 实现支付结果查询和展示

As a 家长,
I want 查询订单支付结果并看到支付成功/失败页面,
So that 我可以确认支付状态并进行下一步操作。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4.1、Epic 4.3、Epic 4.4 已完成
**When** 在 OrdersController 中实现 GET /api/v1/orders/:id/payment-status 端点
**Then** 应用 @Roles(Role.PARENT) 权限保护
**And** 验证订单存在且属于当前用户
**When** 查询订单支付状态
**Then** 如果订单状态已经是 PAID，直接返回支付成功
**And** 如果订单状态是 PENDING，主动调用微信支付查询接口：
  - 使用微信支付查单 API
  - 传入商户订单号（order_no）
**When** 微信返回支付状态为 SUCCESS
**Then** 更新订单状态为 PAID（与回调逻辑一致）
**And** 返回支付成功：
  ```json
  {
    "data": {
      "orderId": 1,
      "orderNo": "ORD20240109123456789",
      "status": "PAID",
      "paidAt": "2024-01-09T12:30:00Z",
      "paidAmount": "299.00",
      "transactionId": "微信支付订单号"
    }
  }
  ```
**When** 微信返回支付状态为 USERPAYING（支付中）
**Then** 返回支付中状态：
  ```json
  {
    "data": {
      "status": "PENDING",
      "message": "支付处理中，请稍后查询"
    }
  }
  ```
**When** 微信返回支付状态为 PAYERROR 或 CLOSED
**Then** 更新订单状态为 CANCELLED
**And** 释放预扣的库存
**And** 返回支付失败：
  ```json
  {
    "data": {
      "status": "CANCELLED",
      "message": "支付失败或已关闭，请重新下单"
    }
  }
  ```
**And** 支付结果查询接口限制调用频率（同一订单每分钟最多查询 10 次）
**And** 使用 Redis 记录查询次数，超过限制返回 429

---

## Epic 5: 订单管理与通知 📋

### Story 5.1: 实现家长订单列表和详情查询

As a 家长,
I want 查看我的所有订单和订单详情,
So that 我可以随时了解预订情况和订单状态。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4 已完成
**When** 在 OrdersController 中实现 GET /api/v1/orders 端点
**Then** 应用 @Roles(Role.PARENT) 权限保护
**And** 从 JWT 令牌中提取当前用户 ID
**When** GET /api/v1/orders 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认10，最大20)
  - status: OrderStatus? (可选，按状态筛选)
**Then** 查询当前用户的所有订单
**And** 支持按 status 筛选
**And** 按 created_at 降序排序（最新订单在前）
**And** 返回分页数据：
  ```json
  {
    "data": [
      {
        "id": 1,
        "orderNo": "ORD20240109123456789",
        "status": "PAID",
        "totalAmount": "299.00",
        "product": {
          "id": 1,
          "title": "上海科技馆探索之旅",
          "images": ["https://..."]
        },
        "bookingDate": "2024-02-15",
        "createdAt": "2024-01-09T12:00:00Z"
      }
    ],
    "meta": {
      "total": 5,
      "page": 1,
      "pageSize": 10
    }
  }
  ```
**When** 实现 GET /api/v1/orders/:id 端点
**Then** 验证订单存在且属于当前用户
**And** 返回完整订单详情：
  ```json
  {
    "data": {
      "id": 1,
      "orderNo": "ORD20240109123456789",
      "status": "PAID",
      "totalAmount": "299.00",
      "paidAmount": "299.00",
      "paidAt": "2024-01-09T12:30:00Z",
      "product": {
        "id": 1,
        "title": "上海科技馆探索之旅",
        "description": "...",
        "images": ["https://..."],
        "location": "上海",
        "duration": "1天"
      },
      "childName": "张小明",
      "childAge": 8,
      "contactName": "张爸爸",
      "contactPhone": "138****8000",
      "bookingDate": "2024-02-15",
      "participantCount": 1,
      "remark": "如有食物过敏请提前告知",
      "refundRule": "活动开始前48小时可全额退款",
      "createdAt": "2024-01-09T12:00:00Z"
    }
  }
  ```
**And** 手机号脱敏显示（中间4位显示为****）
**When** 订单不存在或不属于当前用户
**Then** 返回 404：{ "statusCode": 404, "message": "订单不存在" }

---

### Story 5.2: 实现管理员订单管理 API

As a 管理员,
I want 查看所有订单并更新订单状态,
So that 我可以全面管理和处理平台上的所有订单。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4 已完成
**When** 创建 AdminOrdersController（admin-orders.controller.ts）
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**When** 实现 GET /api/v1/admin/orders 端点
**Then** 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认20，最大50)
  - status: OrderStatus? (可选)
  - orderNo: string? (订单编号搜索)
  - userId: number? (用户ID筛选)
  - startDate: string? (开始日期)
  - endDate: string? (结束日期)
  - productId: number? (产品ID筛选)
**And** 支持多条件组合筛选
**And** 按 created_at 降序排序
**And** 返回分页的订单列表，包含用户和产品基本信息
**When** 实现 GET /api/v1/admin/orders/:id 端点
**Then** 返回完整订单详情（不脱敏手机号）
**And** 包含订单的所有历史操作记录
**When** 实现 PATCH /api/v1/admin/orders/:id/status 端点
**Then** 接收请求 Body：{ "status": "COMPLETED" | "CANCELLED", "reason": string? }
**And** 验证订单存在
**And** 验证状态转换的合法性：
  - PENDING → CANCELLED（允许）
  - PAID → COMPLETED（允许）
  - PAID → REFUNDED（允许，需创建退款记录）
  - CANCELLED/COMPLETED/REFUNDED → 不允许变更
**And** 更新订单状态和相应时间戳
**And** 记录状态变更历史到 OrderStatusHistory 表
**And** 清除相关 Redis 缓存
**And** 返回 200 和更新后的订单
**When** 实现 GET /api/v1/admin/orders/stats 端点
**Then** 返回订单统计数据：
  ```json
  {
    "data": {
      "total": 1000,
      "pending": 50,
      "paid": 800,
      "completed": 100,
      "cancelled": 30,
      "refunded": 20,
      "todayCount": 25,
      "todayAmount": "7500.00"
    }
  }
  ```

---

### Story 5.3: 实现退款申请数据模型

As a 开发者,
I want 在 Prisma schema 中定义退款数据模型,
So that 应用可以完整记录和管理退款流程。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4 已完成
**When** 在 prisma/schema.prisma 中定义 Refund 模型
**Then** Refund 模型包含：
  - id: Int @id @default(autoincrement())
  - refund_no: String @unique (退款编号，格式：REF20240109123456)
  - order_id: Int (外键关联 Order)
  - user_id: Int (外键关联 User)
  - status: RefundStatus (枚举：PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED, FAILED)
  - refund_amount: Decimal(10, 2) (退款金额)
  - reason: String (退款原因)
  - description: String? (详细说明)
  - images: String[] (凭证图片)
  - admin_note: String? (管理员备注)
  - rejected_reason: String? (拒绝原因)
  - wechat_refund_id: String? (微信退款单号)
  - applied_at: DateTime @default(now()) (申请时间)
  - approved_at: DateTime? (审核通过时间)
  - rejected_at: DateTime? (审核拒绝时间)
  - completed_at: DateTime? (退款完成时间)
  - created_at: DateTime @default(now())
  - updated_at: DateTime @updatedAt
**And** 定义 RefundStatus 枚举：
  ```prisma
  enum RefundStatus {
    PENDING      // 待审核
    APPROVED     // 已批准
    REJECTED     // 已拒绝
    PROCESSING   // 处理中
    COMPLETED    // 已完成
    FAILED       // 失败
  }
  ```
**And** Refund 与 Order 关联：@relation(fields: [order_id], references: [id])
**And** Refund 与 User 关联：@relation(fields: [user_id], references: [id])
**And** 添加唯一约束：同一订单只能有一个待处理或进行中的退款
**And** 添加复合索引：(user_id, status) 用于查询用户退款
**And** 添加复合索引：(order_id) 用于关联查询
**And** 执行 `npx prisma migrate dev --name add_refund_model` 创建迁移

---

### Story 5.4: 实现家长退款申请功能

As a 家长,
I want 申请订单退款并查看退款进度,
So that 我可以在需要时取消预订并了解退款状态。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4、Epic 5.3 已完成
**When** 创建 RefundsController（refunds.controller.ts）
**Then** 应用 @Roles(Role.PARENT) 权限保护
**When** 实现 POST /api/v1/refunds 端点
**Then** 接收请求 Body：
  ```json
  {
    "orderId": 1,
    "reason": "行程冲突",
    "description": "孩子临时有考试，无法参加",
    "images": ["https://oss.example.com/refunds/1/image1.jpg"]
  }
  ```
**And** 验证订单存在且属于当前用户
**And** 验证订单状态为 PAID（已支付订单才能退款）
**And** 验证订单没有进行中的退款
**And** 验证退款时间限制（如：活动开始前48小时内不可退款）
**And** 生成退款编号（格式：REF + YYYYMMDD + 8位随机数）
**And** 创建退款记录，状态为 PENDING
**And** 退款金额默认为订单的 paid_amount
**And** 返回 201 和退款信息：
  ```json
  {
    "data": {
      "id": 1,
      "refundNo": "REF20240109123456789",
      "status": "PENDING",
      "refundAmount": "299.00",
      "appliedAt": "2024-01-09T12:00:00Z"
    }
  }
  ```
**When** 实现 GET /api/v1/refunds 端点
**Then** 返回当前用户的所有退款申请
**And** 按 applied_at 降序排序
**And** 返回分页数据
**When** 实现 GET /api/v1/refunds/:id 端点
**Then** 验证退款记录存在且属于当前用户
**And** 返回完整退款详情：
  ```json
  {
    "data": {
      "id": 1,
      "refundNo": "REF20240109123456789",
      "status": "APPROVED",
      "refundAmount": "299.00",
      "reason": "行程冲突",
      "description": "孩子临时有考试，无法参加",
      "images": ["https://..."],
      "order": {
        "orderNo": "ORD20240109123456789",
        "product": {
          "title": "上海科技馆探索之旅"
        }
      },
      "appliedAt": "2024-01-09T12:00:00Z",
      "approvedAt": "2024-01-09T14:00:00Z"
    }
  }
  ```
**When** 订单不符合退款条件
**Then** 返回 400 并说明原因：
  - "订单状态不允许退款"
  - "已超过退款期限"
  - "该订单已有进行中的退款申请"

---

### Story 5.5: 实现管理员退款审核功能

As a 管理员,
I want 审核退款申请并批准或拒绝,
So that 我可以控制退款流程并处理用户的退款请求。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 5.3、Epic 5.4 已完成
**When** 创建 AdminRefundsController（admin-refunds.controller.ts）
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**When** 实现 GET /api/v1/admin/refunds 端点
**Then** 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认20)
  - status: RefundStatus? (可选)
  - refundNo: string? (退款编号搜索)
  - startDate: string?
  - endDate: string?
**And** 返回所有退款申请列表，包含用户和订单信息
**And** 按 applied_at 降序排序
**And** 待审核的退款（PENDING）优先显示
**When** 实现 GET /api/v1/admin/refunds/:id 端点
**Then** 返回完整退款详情（包含所有用户信息）
**And** 包含订单完整信息和支付记录
**When** 实现 PATCH /api/v1/admin/refunds/:id/approve 端点
**Then** 接收请求 Body：{ "adminNote": string? }
**And** 验证退款记录存在
**And** 验证退款状态为 PENDING
**And** 更新退款状态为 APPROVED
**And** 记录审核时间和管理员备注
**And** 更新关联订单的状态为 REFUNDED
**And** 触发微信退款流程（调用 Story 5.6 的退款服务）
**And** 向用户发送退款审核通过通知
**And** 返回 200 和更新后的退款信息
**When** 实现 PATCH /api/v1/admin/refunds/:id/reject 端点
**Then** 接收请求 Body：{ "rejectedReason": string }
**And** 验证退款记录存在且状态为 PENDING
**And** 验证拒绝原因不为空
**And** 更新退款状态为 REJECTED
**And** 记录拒绝原因和时间
**And** 订单状态恢复为 PAID（可继续使用）
**And** 向用户发送退款拒绝通知
**And** 返回 200 和更新后的退款信息
**When** 实现 GET /api/v1/admin/refunds/stats 端点
**Then** 返回退款统计数据：
  ```json
  {
    "data": {
      "total": 50,
      "pending": 10,
      "approved": 30,
      "rejected": 5,
      "processing": 3,
      "completed": 2,
      "totalAmount": "15000.00",
      "pendingAmount": "3000.00"
    }
  }
  ```

---

### Story 5.6: 集成微信支付退款

As a 系统,
I want 处理微信支付退款请求,
So that 用户的款项可以原路退回到微信账户。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4.3、Epic 5.3 已完成
**When** 在 WechatPayService 中添加退款方法
**Then** 实现退款方法：refund(orderNo, refundNo, amount, reason)
**And** 调用微信支付退款接口：
  - 商户订单号（order_no）
  - 商户退款单号（refund_no）
  - 退款金额（单位：分）
  - 退款原因
**When** 退款请求成功提交
**Then** 更新退款状态为 PROCESSING
**And** 记录微信退款单号（wechat_refund_id）
**And** 返回成功
**When** 实现 POST /api/v1/refunds/payment/notify 端点
**Then** 接收微信退款回调通知
**And** 验证签名和数据完整性
**When** 退款状态为 SUCCESS
**Then** 根据 refund_no 查询退款记录
**And** 更新退款状态为 COMPLETED
**And** 记录完成时间
**And** 释放订单对应的库存（如果有）
**And** 向用户发送退款完成通知
**And** 返回成功响应给微信
**When** 退款状态为 ABNORMAL（异常）
**Then** 更新退款状态为 FAILED
**And** 记录失败原因
**And** 向用户发送退款失败通知
**And** 告知管理员手动处理
**When** 退款状态为 PROCESSING（处理中）
**Then** 不更新状态，等待后续回调
**And** 返回成功响应
**When** 退款请求失败（网络错误、参数错误等）
**Then** 更新退款状态为 FAILED
**And** 记录错误日志
**And** 告知管理员需要手动重试
**And** 实现手动重试端点：POST /api/v1/admin/refunds/:id/retry
**And** 退款金额必须 <= 订单原支付金额
**And** 退款必须在支付完成后365天内进行（微信限制）

---

### Story 5.7: 实现微信订阅消息通知

As a 用户,
I want 接收订单和退款相关的通知消息,
So that 我可以及时了解订单状态变化和重要信息。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4、Epic 5 已完成
**When** 创建 NotificationService（notification.service.ts）
**Then** 封装微信订阅消息发送功能
**When** 在 .env 文件中添加配置：
  - WECHAT_APP_ID (小程序 AppID)
  - WECHAT_APP_SECRET (小程序 AppSecret)
**And** 创建消息模板管理：
  - 订单确认模板（支付成功后发送）
  - 出行提醒模板（活动前24小时发送）
  - 退款审核结果模板（批准/拒绝时发送）
  - 退款完成模板（退款到账后发送）
**When** 实现 sendOrderConfirmNotification 方法
**Then** 在支付成功后（Story 4.4）自动调用
**And** 发送内容包含：
  - 订单编号
  - 产品名称
  - 预订日期
  - 参与人数
  - 联系电话
  - 订单金额
**And** 调用微信订阅消息 API：POST https://api.weixin.qq.com/cgi-bin/message/subscribe/send
**And** 发送失败时记录日志，不影响主流程
**When** 实现 sendTravelReminderNotification 方法
**Then** 使用定时任务（Cron）每天检查明天的出行订单
**And** 在活动前24小时发送提醒
**And** 发送内容包含：
  - 产品名称
  - 活动日期和时间
  - 活动地点
  - 集合地点
  - 联系方式
  - 温馨提示
**When** 实现 sendRefundResultNotification 方法
**Then** 退款批准时发送通知：
  - 退款编号
  - 退款金额
  - 预计到账时间
**And** 退款拒绝时发送通知：
  - 退款编号
  - 拒绝原因
  - 联系客服方式
**And** 退款完成时发送通知：
  - 退款编号
  - 退款金额
  - 到账时间
**When** 实现 GET /api/v1/notifications/templates 端点
**Then** 返回当前用户可订阅的消息模板列表
**And** 包含模板ID、名称、描述
**When** 实现 POST /api/v1/notifications/subscribe 端点
**Then** 用户订阅特定类型的消息通知
**And** 记录用户的订阅偏好到 UserNotificationPreference 表

---

## Epic 6: 用户管理与分析 👥

### Story 6.1: 实现管理员用户信息查询

As a 管理员,
I want 查看平台用户的基本信息和注册情况,
So that 我可以了解用户构成和平台用户增长趋势。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2 已完成
**When** 创建 AdminUsersController（admin-users.controller.ts）
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**When** 实现 GET /api/v1/admin/users 端点
**Then** 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认20，最大50)
  - role: Role? (按角色筛选：PARENT, ADMIN)
  - status: UserStatus? (按状态筛选：ACTIVE, INACTIVE, BANNED)
  - keyword: string? (搜索昵称或手机号)
  - startDate: string? (注册开始日期)
  - endDate: string? (注册结束日期)
**And** 支持多条件组合筛选
**And** 按 created_at 降序排序（最新注册在前）
**And** 返回分页数据：
  ```json
  {
    "data": [
      {
        "id": 1,
        "nickname": "张爸爸",
        "avatarUrl": "https://...",
        "role": "PARENT",
        "status": "ACTIVE",
        "phone": "138****8000",
        "orderCount": 5,
        "totalSpent": "1495.00",
        "lastOrderAt": "2024-01-08T10:00:00Z",
        "createdAt": "2023-12-01T12:00:00Z"
      }
    ],
    "meta": {
      "total": 150,
      "page": 1,
      "pageSize": 20
    }
  }
  ```
**And** 手机号脱敏显示
**And** 包含用户统计信息（订单数、总消费）
**When** 实现 GET /api/v1/admin/users/:id 端点
**Then** 验证用户存在
**And** 返回完整用户信息（不脱敏）：
  ```json
  {
    "data": {
      "id": 1,
      "openid": "wxopenid123",
      "nickname": "张爸爸",
      "avatarUrl": "https://...",
      "phone": "13800138000",
      "role": "PARENT",
      "status": "ACTIVE",
      "orderCount": 5,
      "totalSpent": "1495.00",
      "lastLoginAt": "2024-01-09T09:00:00Z",
      "createdAt": "2023-12-01T12:00:00Z",
      "updatedAt": "2024-01-09T09:00:00Z"
    }
  }
  ```
**And** 包含最近登录时间
**When** 实现 PATCH /api/v1/admin/users/:id/status 端点
**Then** 接收请求 Body：{ "status": "ACTIVE" | "INACTIVE" | "BANNED" }
**And** 验证用户存在
**And** 更新用户状态
**And** 被禁用的用户（BANNED）无法登录（在 Story 2.3、2.4 验证）
**And** 清除相关 Redis 缓存
**And** 返回 200 和更新后的用户信息
**When** 实现 GET /api/v1/admin/users/stats 端点
**Then** 返回用户统计数据：
  ```json
  {
    "data": {
      "total": 150,
      "parents": 145,
      "admins": 5,
      "active": 140,
      "inactive": 5,
      "banned": 5,
      "todayRegistered": 3,
      "weekRegistered": 18,
      "monthRegistered": 65
    }
  }
  ```

---

### Story 6.2: 实现用户订单历史查询

As a 管理员,
I want 查看特定用户的完整订单历史,
So that 我可以了解用户的消费习惯和预订行为。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4、Epic 6.1 已完成
**When** 在 AdminUsersController 中实现 GET /api/v1/admin/users/:id/orders 端点
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**And** 验证用户存在
**When** 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认20)
  - status: OrderStatus? (可选)
  - startDate: string?
  - endDate: string?
**Then** 查询指定用户的所有订单
**And** 支持按状态和时间范围筛选
**And** 按 created_at 降序排序
**And** 返回分页订单列表，包含产品基本信息
**When** 实现 GET /api/v1/admin/users/:id/order-summary 端点
**Then** 返回用户订单汇总统计：
  ```json
  {
    "data": {
      "totalOrders": 15,
      "paidOrders": 12,
      "completedOrders": 10,
      "cancelledOrders": 2,
      "refundedOrders": 1,
      "totalSpent": "4485.00",
      "avgOrderAmount": "299.00",
      "firstOrderDate": "2023-12-01",
      "lastOrderDate": "2024-01-08",
      "favoriteCategory": {
        "id": 1,
        "name": "自然科学",
        "orderCount": 8
      },
      "monthlyStats": [
        { "month": "2023-12", "orders": 5, "amount": "1495.00" },
        { "month": "2024-01", "orders": 10, "amount": "2990.00" }
      ]
    }
  }
  ```
**And** favoriteCategory 为预订次数最多的产品分类
**And** monthlyStats 包含最近6个月的订单趋势
**When** 实现 GET /api/v1/admin/users/:id/refunds 端点
**Then** 返回用户的所有退款申请记录
**And** 包含退款状态和金额统计
**And** 按申请时间降序排序

---

### Story 6.3: 实现用户问题处理功能

As a 管理员,
I want 记录和处理用户的问题和投诉,
So that 我可以跟踪用户反馈并提供优质的客户服务。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 6.1 已完成
**When** 在 prisma/schema.prisma 中定义 UserIssue 模型
**Then** UserIssue 模型包含：
  - id: Int @id @default(autoincrement())
  - user_id: Int (外键关联 User)
  - order_id: Int? (外键关联 Order，可选)
  - type: IssueType (枚举：COMPLAINT, QUESTION, SUGGESTION, REFUND_REQUEST)
  - title: String (问题标题)
  - description: String (详细描述)
  - status: IssueStatus (枚举：OPEN, IN_PROGRESS, RESOLVED, CLOSED)
  - priority: IssuePriority (枚举：LOW, MEDIUM, HIGH, URGENT)
  - assigned_to: Int? (分配给的管理员ID)
  - resolution: String? (解决方案)
  - resolved_at: DateTime? (解决时间)
  - created_at: DateTime @default(now())
  - updated_at: DateTime @updatedAt
**And** 定义 IssueType 枚举：COMPLAINT, QUESTION, SUGGESTION, REFUND_REQUEST
**And** 定义 IssueStatus 枚举：OPEN, IN_PROGRESS, RESOLVED, CLOSED
**And** 定义 IssuePriority 枚举：LOW, MEDIUM, HIGH, URGENT
**And** 执行 `npx prisma migrate dev --name add_user_issue_model` 创建迁移
**When** 创建 AdminIssuesController（admin-issues.controller.ts）
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**When** 实现 GET /api/v1/admin/issues 端点
**Then** 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认20)
  - status: IssueStatus?
  - type: IssueType?
  - priority: IssuePriority?
  - userId: number?
  - assignedTo: number? (筛选分配给某管理员的问题)
**And** 返回问题列表，包含用户和订单基本信息
**And** 按优先级排序（URGENT → HIGH → MEDIUM → LOW）
**And** 同优先级按 created_at 降序排序
**When** 实现 POST /api/v1/admin/issues 端点
**Then** 接收请求 Body：
  ```json
  {
    "userId": 1,
    "orderId": 5,
    "type": "COMPLAINT",
    "title": "活动时间变更问题",
    "description": "用户反映活动时间临时变更...",
    "priority": "HIGH"
  }
  ```
**And** 创建问题记录，状态为 OPEN
**And** 返回 201 和问题详情
**When** 实现 PATCH /api/v1/admin/issues/:id/status 端点
**Then** 接收请求 Body：
  ```json
  {
    "status": "IN_PROGRESS" | "RESOLVED" | "CLOSED",
    "assignedTo": 2,
    "resolution": "已联系用户协调，已达成一致"
  }
  ```
**And** 更新问题状态
**And** 记录分配的管理员
**And** 解决时记录解决方案和时间
**And** 返回 200 和更新后的问题
**When** 实现 GET /api/v1/admin/issues/stats 端点
**Then** 返回问题统计数据：
  ```json
  {
    "data": {
      "total": 50,
      "open": 10,
      "inProgress": 15,
      "resolved": 20,
      "closed": 5,
      "urgent": 2,
      "high": 8,
      "avgResolutionTime": "24小时",
      "todayCreated": 3
    }
  }
  ```

---

### Story 6.4: 实现数据看板 - 订单和用户统计

As a 管理员,
I want 在数据看板查看今日和本周的关键指标,
So that 我可以实时掌握平台运营状况。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 4、Epic 6.1 已完成
**When** 创建 DashboardController（dashboard.controller.ts）
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**When** 实现 GET /api/v1/admin/dashboard/overview 端点
**Then** 返回核心业务指标：
  ```json
  {
    "data": {
      "today": {
        "orders": 25,
        "ordersAmount": "7500.00",
        "newUsers": 3,
        "paidOrders": 20,
        "completedOrders": 15
      },
      "week": {
        "orders": 150,
        "ordersAmount": "45000.00",
        "newUsers": 18,
        "paidOrders": 120,
        "completedOrders": 100
      },
      "month": {
        "orders": 600,
        "ordersAmount": "180000.00",
        "newUsers": 65,
        "paidOrders": 480,
        "completedOrders": 400
      },
      "total": {
        "users": 150,
        "orders": 2000,
        "products": 50,
        "revenue": "600000.00"
      }
    }
  }
  ```
**And** 所有金额单位为元，保留2位小数
**When** 实现 GET /api/v1/admin/dashboard/orders-trend 端点
**Then** 接收请求参数：
  - period: 'today' | 'week' | 'month' (默认 'today')
  - granularity: 'hour' | 'day' (默认根据 period 自动选择)
**And** 返回订单趋势数据：
  ```json
  {
    "data": {
      "period": "today",
      "granularity": "hour",
      "data": [
        { "time": "09:00", "orders": 5, "amount": "1500.00" },
        { "time": "10:00", "orders": 8, "amount": "2400.00" },
        { "time": "11:00", "orders": 12, "amount": "3600.00" }
      ],
      "totalOrders": 25,
      "totalAmount": "7500.00"
    }
  }
  ```
**And** today 使用 hour 粒度（09:00 - 22:00）
**And** week 使用 day 粒度（周一到周日）
**And** month 使用 day 粒度
**When** 实现 GET /api/v1/admin/dashboard/users-trend 端点
**Then** 返回用户增长趋势（格式同 orders-trend）
**And** 统计新增注册用户数
**And** 返回活跃用户数（有订单的用户）
**When** 实现 GET /api/v1/admin/dashboard/revenue-breakdown 端点
**Then** 返回收入构成分析：
  ```json
  {
    "data": {
      "byCategory": [
        { "category": "自然科学", "orders": 80, "amount": "24000.00", "percentage": 53.33 },
        { "category": "历史文化", "orders": 50, "amount": "15000.00", "percentage": 33.33 },
        { "category": "艺术体验", "orders": 20, "amount": "6000.00", "percentage": 13.33 }
      ],
      "byPaymentMethod": [
        { "method": "WECHAT", "amount": "45000.00", "percentage": 100 }
      ]
    }
  }
  ```
**And** 百分比保留2位小数
**And** 数据缓存到 Redis（TTL: 5分钟）

---

### Story 6.5: 实现数据看板 - 热门产品和转化分析

As a 管理员,
I want 查看热门产品排行和转化率分析,
So that 我可以优化产品策略和营销方案。

**Acceptance Criteria:**

**Given** Epic 1、Epic 2、Epic 3、Epic 4、Epic 6.4 已完成
**When** 在 DashboardController 中实现 GET /api/v1/admin/dashboard/popular-products 端点
**Then** 接收请求参数：
  - period: 'week' | 'month' | 'all' (默认 'week')
  - limit: number (默认10，最大50)
**Then** 返回热门产品排行：
  ```json
  {
    "data": {
      "period": "week",
      "products": [
        {
          "id": 1,
          "title": "上海科技馆探索之旅",
          "image": "https://...",
          "category": "自然科学",
          "price": "299.00",
          "orders": 25,
          "amount": "7475.00",
          "views": 500,
          "conversionRate": 5.0,
          "avgRating": 4.8,
          "rank": 1
        }
      ],
      "summary": {
        "totalOrders": 150,
        "totalAmount": "45000.00",
        "avgConversionRate": 3.5
      }
    }
  }
  ```
**And** 按 orders 降序排序
**And** conversionRate = (orders / views) × 100
**And** avgRating 来自用户评价（如果实现了评价系统）
**When** 实现 GET /api/v1/admin/dashboard/conversion-funnel 端点
**Then** 返回转化漏斗分析：
  ```json
  {
    "data": {
      "period": "week",
      "funnel": [
        { "stage": "浏览产品", "users": 1000, "percentage": 100 },
        { "stage": "查看详情", "users": 600, "percentage": 60 },
        { "stage": "创建订单", "users": 180, "percentage": 30 },
        { "stage": "完成支付", "users": 150, "percentage": 25 }
      ],
      "overallConversion": 15,
      "dropoffs": [
        { "stage": "浏览产品→查看详情", "users": 400, "percentage": 40 },
        { "stage": "查看详情→创建订单", "users": 420, "percentage": 70 },
        { "stage": "创建订单→完成支付", "users": 30, "percentage": 16.67 }
      ]
    }
  }
  ```
**And** overallConversion = 完成支付用户数 / 浏览产品用户数 × 100
**And** dropoffs 显示每个环节流失的用户数和百分比
**When** 实现 GET /api/v1/admin/dashboard/user-retention 端点
**Then** 返回用户留存分析：
  ```json
  {
    "data": {
      "cohortAnalysis": [
        {
          "period": "2023-12-W1",
          "newUsers": 50,
          "retention": {
            "day1": 80,
            "day7": 40,
            "day30": 20
          }
        }
      ],
      "avgRetention": {
        "day1": 75,
        "day7": 35,
        "day30": 18
      }
    }
  }
  ```
**And** cohortAnalysis 按注册周期分组
**And** retention 返回留存率百分比
**When** 实现 GET /api/v1/admin/dashboard/product-performance/:id 端点
**Then** 返回单个产品的详细表现数据：
  ```json
  {
    "data": {
      "product": {
        "id": 1,
        "title": "上海科技馆探索之旅"
      },
      "stats": {
        "totalViews": 2000,
        "totalOrders": 100,
        "totalRevenue": "29900.00",
        "conversionRate": 5.0,
        "avgOrderValue": "299.00",
        "cancelRate": 10,
        "refundRate": 5
      },
      "trend": {
        "last7Days": [15, 20, 18, 25, 22, 30, 28],
        "last30Days": [100, 120, 110, 130, 125, 140, 135]
      },
      "demographics": {
        "avgAge": 8.5,
        "ageDistribution": [
          { "range": "3-6", "count": 20 },
          { "range": "7-10", "count": 50 },
          { "range": "11-14", "count": 25 },
          { "range": "15-18", "count": 5 }
        ]
      }
    }
  }
  ```
**And** trend 数据按日期排序
**And** demographics 分析参与儿童的年龄分布
**And** 所有统计数据缓存到 Redis（TTL: 10分钟）

