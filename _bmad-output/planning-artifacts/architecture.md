---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ["prd.md"]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-01-09'
project_name: 'bmad'
user_name: 'Zhang'
date: '2026-01-09'
productName: '研学商城小程序'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
41个功能需求，覆盖8大能力域：
- 用户账户管理（4个FR）：微信授权登录（家长端）+ 账号密码（管理端）
- 产品发现（5个FR）：浏览、搜索、筛选、详情查看
- 预订和支付（5个FR）：选场次、填信息、微信支付
- 订单管理（6个FR）：订单列表、详情、状态跟踪、退款
- 通知服务（3个FR）：订单确认、状态变更、退款通知
- 管理后台-产品管理（5个FR）：CRUD操作、上下架、库存
- 管理后台-订单管理（7个FR）：查询、筛选、状态更新、退款处理
- 管理后台-用户管理（3个FR）：查看用户信息、订单历史
- 管理后台-数据分析（3个FR）：订单量、用户数、热门产品排行

**Non-Functional Requirements:**
51个非功能需求，驱动架构设计：
- **性能（8个NFR）**：2秒页面加载、2000并发、每秒100订单、搜索1秒响应
- **安全（14个NFR）**：HTTPS传输加密、敏感数据存储加密、微信支付合规、隐私保护
- **可扩展性（6个NFR）**：1万→10万用户、1000→5000单/月、水平扩展支持
- **可靠性（8个NFR）**：99.9%可用性、订单数据零丢失、每日备份、支付同步
- **集成（9个NFR）**：微信登录/支付/通知API、CDN、RESTful API v1
- **可维护性（6个NFR）**：代码规范、80%单元测试、API文档、监控

**Scale & Complexity:**

- **主要领域**：移动应用（微信小程序）+ Web管理后台
- **复杂度级别**：中等 - 电商核心功能，但规模可控
- **预估架构组件数**：8-12个主要组件

### Technical Constraints & Dependencies

**平台约束：**
- **微信小程序生态**：必须遵守微信平台规范、小程序审核流程
- **微信支付集成**：需要申请微信支付商户号、使用官方SDK
- **微信通知**：使用微信模板消息/订阅消息

**合规要求：**
- **数据隐私**：符合《个人信息保护法》
- **支付合规**：符合微信支付安全规范
- **内容合规**：教育类产品，需要符合相关规定

### Cross-Cutting Concerns Identified

1. **身份认证与授权**：
   - 小程序端：微信授权登录
   - 管理端：账号密码 + 会话管理
   - 角色权限：家长 vs 管理员

2. **数据一致性**：
   - 订单数据与支付状态同步（微信）
   - 库存管理并发控制
   - 退款状态追踪

3. **通知服务**：
   - 微信模板消息集成
   - 订单确认、状态变更、退款通知
   - 异步处理机制

4. **图片存储与优化**：
   - CDN集成
   - 图片压缩优化
   - 产品图片管理

5. **API版本控制**：
   - RESTful API设计
   - v1版本管理
   - 平滑升级支持

6. **监控与日志**：
   - 错误追踪
   - 性能监控
   - 支付集成监控

## Starter Template Evaluation

### Primary Technology Domain

基于项目需求分析：
- **微信小程序前端**：原生微信小程序框架
- **管理后台（Web）**：Next.js 15 全栈应用
- **后端API服务**：NestJS + TypeScript
- **数据库**：PostgreSQL + Prisma ORM

### Starter Options Considered

**管理后台选项：**
- Next.js 15 Starter（Shadcn）- 生产级，包含UI组件库
- T3 Stack - 全栈方案，但可能过度设计
- Vite + React - 更快但缺少Next.js的优势

**后端API选项：**
- NestJS Starter - 企业级，类型安全
- Express + TypeScript - 更轻量但缺少结构
- Fastify - 高性能但生态较小

**选择理由：Next.js 15 + NestJS + Prisma组合：**
- 都是TypeScript原生支持，端到端类型安全
- 成熟稳定，社区活跃
- 企业级最佳实践
- 长期维护保证

### Selected Starter: Next.js 15 + NestJS + Prisma

**Rationale for Selection:**

这是一个**企业级、生产就绪**的主流技术栈组合：

1. **Next.js 15** - 最流行的React框架
   - App Router + React Server Components（2025年最新）
   - 内置SEO优化、图片优化、API路由
   - Vercel公司官方维护，长期支持保证

2. **NestJS** - Node.js企业级框架
   - TypeScript原生，类型安全
   - 模块化架构，易于扩展
   - 内置依赖注入、守卫、拦截器
   - 适合中大型项目

3. **Prisma + PostgreSQL** - 现代ORM栈
   - 类型安全的数据库访问
   - 自动迁移生成
   - 优秀的开发者体验
   - PostgreSQL适合电商订单管理

4. **Tailwind CSS + shadcn/ui** - UI组件库
   - 快速开发专业界面
   - 可定制性强
   - 无需重复造轮子

**Initialization Commands:**

**管理后台（Next.js 15）：**
```bash
npx create-next-app@latest admin-dashboard --typescript --tailwind --app --eslint
cd admin-dashboard
npx shadcn-ui@latest init
```

**后端API（NestJS + Prisma）：**
```bash
npx @nestjs/cli new backend-api --package-manager npm --strict
cd backend-api
npm install @prisma/client @prisma/server
npx prisma init
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
npm install --save-dev @types/node
```

**数据库初始化（Prisma）：**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Architecture Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript 5+（严格模式）
- Node.js 20+ LTS版本
- 端到端类型安全

**Styling Solution:**
- Tailwind CSS 4
- shadcn/ui组件库（基于Radix UI）
- CSS模块支持

**Build Tooling:**
- Next.js 15：Turbopack（开发）、优化打包（生产）
- NestJS：Webpack默认
- ESLint 9代码质量检查
- Prettier代码格式化

**Testing Framework:**
- Jest（单元测试）
- Supertest（API集成测试）
- Testing Library（组件测试）

**Code Organization:**
- Next.js：App Router结构、/app目录组织
- NestJS：模块化结构、/src模块划分
- Prisma：/prisma schema定义
- 共享类型定义（@/packages/types）

**Development Experience:**
- 热重载开发服务器
- TypeScript自动检查
- API文档生成
- 数据库迁移工具

**Note:** 项目初始化应作为第一个实施故事。

## 核心架构决策

### 决策优先级分析

**关键决策（阻塞实施）：**
- 数据架构：Prisma Schema-First
- 身份认证：NestJS Auth Module + JWT
- API设计：REST API
- 托管策略：阿里云

**重要决策（塑造架构）：**
- 文件存储：阿里云OSS
- 状态管理：React Hooks + Context API
- 缓存策略：Redis
- API文档：Swagger/OpenAPI
- 错误处理：NestJS异常过滤器
- 限流策略：NestJS Throttler + Redis

**推迟决策（MVP后）：**
- 消息队列（如需异步处理）
- 分布式追踪（如需微服务）

---

### 数据架构

**Prisma Schema-First**
- **版本：** Prisma 5.x
- **理由：** 类型安全、自动迁移、开发体验优秀
- **影响：** 所有数据库操作、业务模块
- **级联决策：**
  - PostgreSQL数据库
  - 迁移策略：`npx prisma migrate dev`
  - 数据验证：class-validator + Prisma schema

**Redis缓存策略**
- **版本：** Redis 7.x
- **理由：** 支持2000并发，成熟方案
- **影响：** 产品列表、用户会话、库存管理
- **数据结构设计：**
  ```
  产品列表: products:list (Sorted Set)
  产品详情: product:detail:{id} (Hash)
  用户会话: session:{userId} (String, TTL 7天)
  库存计数: product:stock:{id} (String)
  订单限流: rate:limit:{userId}:action (String, TTL 60秒)
  ```
- **缓存策略：**
  - 主动失效：产品更新时清除相关缓存
  - 被动失效：产品列表TTL 30分钟，详情TTL 1小时
- **集成方式：** Cache装饰器模式，先查Redis再查数据库

---

### 身份认证与安全

**NestJS Auth Module + JWT**
- **版本：** @nestjs/jwt + @nestjs/passport
- **理由：** 企业级方案，类型安全，易于扩展
- **影响：** 小程序登录、管理后台登录
- **实现策略：**
  - 小程序端：微信授权登录，换取JWT
  - 管理端：账号密码 + JWT会话管理
  - 角色权限：Guard装饰器（家长 vs 管理员）

**API安全策略**
- HTTPS传输加密
- 敏感数据存储加密
- JWT token有效期管理
- 限流保护（Throttler + Redis）

---

### API与通信模式

**REST API设计**
- **版本：** /v1/ 路径版本控制
- **理由：** 简单直观，符合NFR要求
- **影响：** 所有前后端通信
- **设计原则：**
  - RESTful资源命名
  - 统一响应格式
  - HTTP状态码规范

**Swagger/OpenAPI文档**
- **版本：** @nestjs/swagger
- **理由：** 自动生成，交互式测试
- **影响：** API文档、前后端协作
- **配置：** `SwaggerModule.setup()`

**错误处理标准**
- **方案：** NestJS内置异常过滤器
- **统一格式：**
  ```typescript
  {
    statusCode: number,
    message: string,
    error: string,
    timestamp: string
  }
  ```
- **自定义异常：** BusinessException、ValidationException

**限流策略**
- **方案：** NestJS Throttler + Redis存储
- **配置：**
  - 一般接口：60次/分钟
  - 登录接口：10次/分钟
  - 订单接口：20次/分钟

---

### 前端架构

**状态管理 - React Hooks + Context API**
- **理由：** MVP简单够用，React原生
- **影响：** 管理后台组件状态
- **迁移路径：** 复杂度增加时可迁移到Zustand

**组件架构 - shadcn/ui**
- **版本：** Radix UI + Tailwind CSS
- **理由：** 可定制、无运行时开销
- **影响：** UI组件库

---

### 基础设施与部署

**托管策略 - 阿里云**
- **服务组合：**
  - ECS服务器（后端API）
  - RDS PostgreSQL（数据库）
  - Redis云服务（缓存）
  - OSS对象存储（图片）
  - CDN（静态资源加速）
- **理由：** 与OSS一致，国内稳定，服务完整

**环境配置 - 多环境管理**
- **环境：** development / staging / production
- **方案：** @nestjs/config + .env文件
- **隔离：** 每个环境独立配置

**监控与日志 - NestJS Logger + 阿里云日志服务**
- **日志级别：** ERROR / WARN / LOG / DEBUG
- **结构化日志：** JSON格式
- **监控内容：**
  - 错误追踪
  - 性能监控
  - 支付集成监控

**CI/CD - GitHub Actions**
- **流程：**
  - 自动运行测试
  - 构建Docker镜像
  - 部署到阿里云ECS
- **理由：** 现代化标准，易于配置

---

### 决策影响分析

**实施顺序：**
1. 项目初始化（Next.js + NestJS + Prisma）
2. 数据库设计与迁移
3. 认证模块开发
4. 核心业务API（产品、订单）
5. Redis缓存集成
6. OSS文件存储
7. 前端页面开发
8. CI/CD配置

**跨组件依赖：**
- Prisma schema定义 → 所有数据库操作
- JWT认证 → 所有受保护API
- Redis缓存 → 高并发场景（库存、限流）
- OSS存储 → 产品图片上传
- Swagger文档 → 前后端协作

## 实施模式与一致性规则

### 模式类别定义

**已识别的关键冲突点：**
18个AI代理可能做出不同选择的决策点

---

### 命名模式

#### 数据库命名约定

**表命名：小写复数**
```
✅ 正确：users, products, orders, order_items
❌ 错误：Users, User, userTable
```

**列命名：snake_case**
```
✅ 正确：user_id, created_at, is_active
❌ 错误：userId, createdAt, isActive
```

**外键命名：表名_id**
```
✅ 正确：user_id, product_id, order_id
❌ 错误：fk_user, userId, user
```

**Prisma自动转换：** 数据库snake_case → TypeScript camelCase
```prisma
model User {
  user_id     Int      @id @default(autoincrement())  // 数据库
  createdAt   DateTime @default(now())                 // 数据库
  profile     Profile?                                 // 关系

  profileId   Int?       @map("user_id")               // TypeScript
}
```

#### API命名约定

**REST端点：复数资源**
```
✅ 正确：
GET    /users           - 获取用户列表
GET    /users/:id       - 获取单个用户
POST   /users           - 创建用户
PUT    /users/:id       - 更新用户
DELETE /users/:id       - 删除用户

❌ 错误：
GET /user, GET /User, GET /getUsers
```

**路由参数：简单参数**
```
✅ 正确：/users/:id, /products/:productId
❌ 错误：/users/{id}, /users/:userId
```

**查询参数：camelCase**
```
✅ 正确：?userId=123&status=active&createdAt=2024-01-01
❌ 错误：?user_id=123&status=active&created_at=2024-01-01
```

#### 代码命名约定

**React组件：帕斯卡命名**
```typescript
✅ 正确：
function UserCard() { ... }
const ProductList = () => { ... }
export function OrderForm() { ... }

❌ 错误：
function userCard() { ... }
const user_card = () => { ... }
```

**文件命名：帕斯卡命名（组件/服务）/ camelCase（工具）**
```
✅ 正确：
components/UserCard.tsx
services/UserService.ts
utils/formatDate.ts
hooks/useAuth.ts

❌ 错误：
components/user-card.tsx
services/user_service.ts
```

**函数/变量：camelCase**
```typescript
✅ 正确：
const userId = 123;
function getUserData() { }
const isActive = true;

❌ 错误：
const user_id = 123;
function get_user_data() { }
const is_active = true;
```

---

### 结构模式

#### 项目组织

**NestJS后端结构：**
```
backend-api/
├── src/
│   ├── features/
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   └── users.controller.spec.ts
│   │   ├── products/
│   │   └── orders/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   └── strategies/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── lib/
│   │   └── prisma.service.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
└── test/
```

**Next.js前端结构：**
```
admin-dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── products/
│   │   ├── orders/
│   │   └── users/
│   ├── api/
│   │   └── auth/
│   └── layout.tsx
├── components/
│   ├── ui/           # shadcn/ui组件
│   └── features/     # 功能组件
│       ├── products/
│       └── orders/
├── lib/
│   ├── api.ts        # API客户端
│   ├── auth.ts       # 认证工具
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   └── useProducts.ts
└── types/
    └── api.ts        # API类型定义
```

#### 测试文件组织

**同目录原则：**
```
✅ 正确：
src/features/users/users.service.ts
src/features/users/users.service.spec.ts

components/UserCard.tsx
components/UserCard.test.tsx

❌ 错误：
src/features/users/users.service.ts
tests/users/users.service.test.ts
```

---

### 格式模式

#### API响应格式

**统一响应包装：**
```typescript
// 成功响应
{
  "data": {
    "id": 123,
    "name": "产品名称",
    "price": 299
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0"
  }
}

// 列表响应（带分页）
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

// 错误响应
{
  "statusCode": 400,
  "message": "验证失败",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### JSON字段命名

**API返回：camelCase**
```json
✅ 正确：
{
  "userId": 123,
  "userName": "张三",
  "createdAt": "2024-01-01T00:00:00Z",
  "isActive": true
}

❌ 错误：
{
  "user_id": 123,
  "user_name": "张三",
  "created_at": "2024-01-01T00:00:00Z",
  "is_active": true
}
```

#### 日期格式

**ISO 8601字符串：**
```typescript
✅ 正确：
"2024-01-01T00:00:00Z"
"2024-01-01T08:00:00+08:00"

❌ 错误：
1704067200
"01/01/2024"
"2024-01-01"
```

---

### 流程模式

#### 加载状态处理

**局部加载状态：**
```typescript
// ✅ 正确：每个组件管理自己的loading
function ProductList() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetchProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;
  return <ProductList products={products} />;
}

// ❌ 错误：全局loading状态不适用于MVP
const globalLoading = useGlobalLoading();
```

#### 错误处理模式

**NestJS异常过滤器：**
```typescript
// src/common/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.name,
      timestamp: new Date().toISOString(),
    });
  }
}

// 使用
@UseFilters(new HttpExceptionFilter())
export class UsersController {}
```

**React Error Boundary：**
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.has_error) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

### 强制执行指南

**所有AI代理必须遵守：**

1. **命名一致性**
   - 数据库：snake_case，表名复数
   - API：端点复数，参数camelCase
   - 代码：组件PascalCase，函数/变量camelCase

2. **文件组织**
   - 测试文件与源文件同目录
   - 按功能分组组件和服务
   - 共享工具放在lib/或utils/

3. **API格式**
   - 统一响应包装：{ data, meta }
   - 错误格式：{ statusCode, message, error, timestamp }
   - JSON字段使用camelCase

4. **错误处理**
   - NestJS使用全局异常过滤器
   - React使用Error Boundary
   - 不在组件中直接console.error

5. **日期处理**
   - 始终使用ISO 8601字符串
   - 前端显示时转换为本地格式

**模式验证：**
- ESLint规则强制代码风格
- Prettier统一格式化
- 单元测试验证API响应格式
- 代码审查检查命名约定

**模式更新流程：**
1. 在架构文档中记录模式变更
2. 更新相关ESLint规则
3. 通知所有开发人员
4. 逐步重构现有代码

---

### 示例对比

#### API端点示例

**✅ 正确：**
```typescript
// users.controller.ts
@Controller('users')
export class UsersController {
  @Get()
  findAll(@Query('page') page: number) {
    return this.usersService.findAll(page);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

**❌ 错误：**
```typescript
@Controller('user')  // 单数
export class UsersController {
  @Get('getUser')  // 动词
  getUser() { ... }

  @Get('{userId}')  // 命名参数
  getUserById(@Param('userId') userId: string) { ... }
}
```

#### 数据库模型示例

**✅ 正确（Prisma）：**
```prisma
model User {
  user_id   Int      @id @default(autoincrement())
  user_name String   @unique
  email     String   @unique
  created_at DateTime @default(now())
  is_active Boolean  @default(true)
  orders    Order[]
}

model Order {
  order_id   Int      @id @default(autoincrement())
  user_id    Int
  total_amount Decimal
  created_at DateTime @default(now())
  user       User     @relation(fields: [user_id], references: [user_id])
}
```

**❌ 错误：**
```prisma
model Users {  // 复数表名错误
  UserId Int @id  // camelCase列名错误
  user_name String  // 不一致的命名
}
```

#### React组件示例

**✅ 正确：**
```typescript
// components/features/products/ProductCard.tsx
interface ProductCardProps {
  product: {
    productId: number;
    productName: string;
    price: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="product-card">
      <h3>{product.productName}</h3>
      <p>¥{product.price}</p>
    </div>
  );
}
```

**❌ 错误：**
```typescript
// components/product-card.tsx  // 文件命名错误
export function product_card({ product }) {  // 组件命名错误
  const product_id = product.id;  // 驼峰命名不一致

  return <div class="ProductCard">...</div>;  // class而非className
}
```

## 项目结构与边界

### 完整项目目录结构

```
bmad/
├── miniprogram/              # 微信小程序前端
├── backend-api/              # NestJS后端API
├── admin-dashboard/          # Next.js管理后台
├── docs/                     # 项目文档
├── _bmad-output/             # BMAD工作流输出
├── .github/                  # GitHub Actions CI/CD
├── .gitignore
└── README.md
```

#### 微信小程序结构 (miniprogram/)

```
miniprogram/
├── app.js                    # 小程序入口
├── app.json                  # 小程序配置
├── app.wxss                  # 全局样式
├── sitemap.json              # 搜索配置
├── project.config.json       # 项目配置
├── project.private.config.json
├── package.json
├── pages/                    # 页面
│   ├── index/                # 首页（产品列表）
│   ├── product-detail/       # 产品详情
│   ├── order-confirm/        # 订单确认
│   ├── order-list/           # 我的订单
│   ├── order-detail/         # 订单详情
│   └── profile/              # 个人中心
├── components/               # 组件
│   ├── product-card/
│   ├── order-card/
│   └── loading/
├── utils/                    # 工具函数
│   ├── request.js            # 网络请求封装
│   ├── auth.js               # 微信登录
│   ├── payment.js            # 微信支付
│   └── format.js             # 格式化工具
└── images/                   # 图片资源
```

#### NestJS后端API结构 (backend-api/)

```
backend-api/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
├── .env
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.module.ts              # 根模块
│   ├── config/                    # 配置
│   │   ├── configuration.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── oss.config.ts
│   │   └── wechat.config.ts
│   ├── features/                  # 功能模块
│   │   ├── users/                 # 用户管理
│   │   ├── products/              # 产品管理
│   │   ├── orders/                # 订单管理
│   │   ├── payments/              # 支付管理
│   │   ├── notifications/         # 通知服务
│   │   ├── analytics/             # 数据分析
│   │   └── images/                # 图片管理
│   ├── auth/                     # 认证模块
│   │   ├── strategies/
│   │   ├── guards/
│   │   └── decorators/
│   ├── common/                   # 通用模块
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── pipes/
│   ├── lib/                      # 核心库
│   │   ├── prisma/
│   │   ├── redis/
│   │   └── oss/
│   └── middleware/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docker-compose.yml
```

#### Next.js管理后台结构 (admin-dashboard/)

```
admin-dashboard/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── app/
│   ├── layout.tsx                # 根布局
│   ├── page.tsx
│   ├── (auth)/                   # 认证路由组
│   │   └── login/
│   ├── (dashboard)/              # 主应用路由组
│   │   ├── page.tsx              # Dashboard首页
│   │   ├── dashboard/
│   │   │   └── analytics/
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── [productId]/
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [orderId]/
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [userId]/
│   │   └── settings/
│   └── api/
├── components/
│   ├── ui/                       # shadcn/ui组件
│   ├── layout/
│   └── features/
│       ├── products/
│       ├── orders/
│       └── users/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useProducts.ts
│   └── useOrders.ts
├── types/
│   ├── api.ts
│   └── models.ts
└── public/
    └── images/
```

---

### 架构边界

#### API边界

```
小程序端 → backend-api → /api/v1/{resource}
管理后台 → backend-api → /api/v1/{resource}
外部 → Swagger文档 → /api/docs
```

**认证边界：**
```
小程序：微信授权 → JWT
管理后台：账号密码 → JWT
API保护：JwtAuthGuard + RolesGuard
```

**服务边界：**
```
用户服务 (users) - features/users/
产品服务 (products) - features/products/
订单服务 (orders) - features/orders/
支付服务 (payments) - features/payments/
通知服务 (notifications) - features/notifications/
分析服务 (analytics) - features/analytics/
```

**数据边界：**
```
Prisma → PostgreSQL (主数据库)
Redis → 缓存/会话存储
OSS → 图片文件存储
```

---

### 需求到结构映射

#### 功能模块映射

| 功能类别 | 后端模块 | 管理后台 | 小程序 |
|---------|---------|---------|--------|
| 用户账户管理 | features/users/ | app/users/ | pages/profile/ |
| 产品发现 | features/products/ | app/products/ | pages/index/, product-detail/ |
| 预订和支付 | features/orders/, payments/ | app/orders/ | pages/order-confirm/ |
| 订单管理 | features/orders/ | app/orders/ | pages/order-list/, order-detail/ |
| 通知服务 | features/notifications/ | - | - |
| 产品管理 | features/products/ | app/products/ | - |
| 订单管理 | features/orders/ | app/orders/ | - |
| 用户管理 | features/users/ | app/users/ | - |
| 数据分析 | features/analytics/ | app/dashboard/analytics/ | - |

#### 横切关注点映射

| 关注点 | 后端位置 | 前端位置 |
|-------|---------|---------|
| 认证 | auth/ | lib/auth.ts |
| 日志 | common/interceptors/logging.interceptor.ts | - |
| 错误处理 | common/filters/http-exception.filter.ts | components/ErrorBoundary.tsx |
| 限流 | middleware/throttle.middleware.ts | - |
| API响应 | common/interceptors/transform.interceptor.ts | lib/api.ts |
| 缓存 | lib/redis/ | - |

---

### 集成点

#### 内部通信流程

```
小程序/管理后台
    ↓ HTTP/HTTPS
backend-api (NestJS)
    ↓
Service层
    ↓
├─→ Prisma → PostgreSQL
├─→ Redis (缓存)
└─→ OSS (图片)
```

#### 外部服务集成

**微信生态：**
- 微信登录：`auth/strategies/wechat.strategy.ts`
- 微信支付：`features/payments/payments.service.ts`
- 微信通知：`features/notifications/notifications.service.ts`

**阿里云服务：**
- OSS存储：`lib/oss/oss.service.ts`
- 日志服务：`common/interceptors/logging.interceptor.ts`

---

### 文件组织模式

#### 配置文件组织

**环境配置：**
- `.env` - 开发环境变量
- `.env.example` - 环境变量模板
- `src/config/configuration.ts` - 配置Schema定义

**服务配置：**
- `src/config/database.config.ts` - 数据库配置
- `src/config/redis.config.ts` - Redis配置
- `src/config/oss.config.ts` - OSS配置
- `src/config/wechat.config.ts` - 微信配置

#### 源代码组织

**按功能分组（Feature-based）：**
```
src/features/{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── dto/
└── {feature}.controller.spec.ts
```

**共享代码：**
```
src/common/     # 跨功能共享
src/lib/        # 核心服务
src/auth/       # 认证相关
```

#### 测试组织

**同目录原则：**
```
src/features/users/users.service.ts
src/features/users/users.service.spec.ts

components/ProductCard.tsx
components/ProductCard.test.tsx
```

**测试类型：**
```
test/
├── unit/          # 单元测试
├── integration/   # 集成测试
└── e2e/          # 端到端测试
```

---

### 开发工作流集成

#### 开发服务器结构

**后端开发：**
```bash
cd backend-api
npm run start:dev  # 热重载 + watch mode
```

**前端开发：**
```bash
cd admin-dashboard
npm run dev        # Next.js dev server (端口3000)
```

#### 构建过程结构

**后端构建：**
```bash
npm run build      # Webpack打包到dist/
```

**前端构建：**
```bash
npm run build      # Next.js优化构建到.next/
```

#### 部署结构

**Docker化部署：**
- `docker-compose.yml` - 本地开发环境
- 生产环境使用阿里云ECS + RDS + Redis

**CI/CD流程：**
1. 代码推送 → GitHub Actions触发
2. 运行测试 → 单元测试 + 集成测试
3. 构建镜像 → Docker镜像
4. 部署 → 阿里云ECS

## 架构验证结果

### 连贯性验证 ✅

**决策兼容性：**
- ✅ TypeScript 5+ (Next.js 15, NestJS, Prisma) - 全栈类型安全
- ✅ Node.js 20+ LTS - 所有技术栈兼容
- ✅ PostgreSQL + Prisma - 数据库与ORM匹配
- ✅ Redis + NestJS Throttler - 缓存与限流一致
- ✅ 阿里云OSS + CDN - 存储与加速协同
- ✅ JWT认证 + 微信授权 - 双认证模式兼容

**模式一致性：**
- ✅ 数据库snake_case → Prisma自动转换camelCase
- ✅ API复数资源 (/users) ↔ 数据库复数表 (users)
- ✅ 响应包装 {data, meta} 统一前后端
- ✅ 错误格式 {statusCode, message, error, timestamp} 一致
- ✅ 测试文件同目录 - 全栈统一

**结构对齐：**
- ✅ Feature-based组织 → 支持模块化开发
- ✅ 按功能分组 (features/) → 符合NestJS模块化
- ✅ Next.js App Router → 支持路由组和布局
- ✅ 清晰的服务边界 → 用户/产品/订单/支付/通知/分析

---

### 需求覆盖验证 ✅

**功能需求覆盖（41个FR）：**

| FR类别 | 架构支持 | 验证 |
|-------|---------|-----|
| 用户账户管理(4) | features/users/, auth/ | ✅ |
| 产品发现(5) | features/products/ | ✅ |
| 预订和支付(5) | features/orders/, payments/ | ✅ |
| 订单管理(6) | features/orders/ | ✅ |
| 通知服务(3) | features/notifications/ | ✅ |
| 管理后台-产品(5) | admin-dashboard/app/products/ | ✅ |
| 管理后台-订单(7) | admin-dashboard/app/orders/ | ✅ |
| 管理后台-用户(3) | admin-dashboard/app/users/ | ✅ |
| 管理后台-分析(3) | features/analytics/ | ✅ |

**非功能需求覆盖（51个NFR）：**

| NFR类别 | 架构支持 | 验证 |
|-------|---------|-----|
| 性能(8) | Redis缓存, CDN, 限流 | ✅ |
| 安全(14) | JWT, HTTPS, 加密, 限流 | ✅ |
| 可扩展性(6) | 模块化架构, 阿里云水平扩展 | ✅ |
| 可靠性(8) | 异常处理, 日志, 备份 | ✅ |
| 集成(9) | 微信SDK, OSS, REST API | ✅ |
| 可维护性(6) | TypeScript, 测试, Swagger文档 | ✅ |

---

### 实施就绪性验证 ✅

**决策完整性：**
- ✅ 13个核心架构决策已记录版本
- ✅ 技术栈版本明确（Next.js 15, NestJS, Prisma 5.x, Redis 7.x）
- ✅ 集成模式定义（认证、缓存、存储、通知）
- ✅ 性能考虑已解决（2000并发通过Redis）

**结构完整性：**
- ✅ 三个子项目结构完整（miniprogram/, backend-api/, admin-dashboard/）
- ✅ 所有目录和文件已定义
- ✅ 集成点明确（微信登录/支付/通知、阿里云OSS/日志）
- ✅ 组件边界清晰（6个功能服务模块）

**模式完整性：**
- ✅ 18个命名模式决策已记录
- ✅ 通信模式完整（REST API格式、错误处理、限流）
- ✅ 流程模式定义（加载状态、错误边界）
- ✅ 示例对比提供（API端点、数据库模型、React组件）

---

### 差距分析结果

**关键差距：无** ✅

**重要差距：无** ✅

**可选增强（MVP后）：**
- 消息队列（如需异步通知处理）
- 分布式追踪（如需微服务架构）
- 高级缓存策略（如需更精细的缓存控制）

---

### 架构完整性清单

**✅ 需求分析**
- [x] 项目上下文已彻底分析
- [x] 规模和复杂度已评估
- [x] 技术约束已识别
- [x] 横切关注点已映射

**✅ 架构决策**
- [x] 关键决策已记录版本
- [x] 技术栈完全指定
- [x] 集成模式已定义
- [x] 性能考虑已解决

**✅ 实施模式**
- [x] 命名约定已建立
- [x] 结构模式已定义
- [x] 通信模式已指定
- [x] 流程模式已记录

**✅ 项目结构**
- [x] 完整目录结构已定义
- [x] 组件边界已建立
- [x] 集成点已映射
- [x] 需求到结构映射完成

---

### 架构就绪性评估

**整体状态：** 🚀 **准备实施**

**置信度：** **高** - 基于验证结果

**架构优势：**
1. 企业级技术栈（成熟稳定）
2. 全栈TypeScript（类型安全）
3. 模块化架构（易于扩展）
4. 清晰的模式（避免冲突）
5. 完整的文档（易于实施）

**未来可改进领域：**
- 消息队列（异步处理）
- 高级监控（APM集成）
- 性能优化（CDN策略）

---

### 实施交接

**AI代理指南：**

- 严格按照文档记录执行所有架构决策
- 在所有组件中一致使用实施模式
- 尊重项目结构和边界
- 参考本文档解决所有架构问题

**首个实施优先级：项目初始化**

```bash
# 1. 初始化管理后台（Next.js 15）
npx create-next-app@latest admin-dashboard --typescript --tailwind --app --eslint
cd admin-dashboard
npx shadcn-ui@latest init

# 2. 初始化后端API（NestJS + Prisma）
npx @nestjs/cli new backend-api --package-manager npm --strict
cd backend-api
npm install @prisma/client @prisma/server
npx prisma init
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer

# 3. 初始化数据库
npx prisma migrate dev --name init
npx prisma generate
```

**下一步建议：**

1. **创建Epic和用户故事** - 使用PM工作流
   - 菜单项：[ES] Create Epics and User Stories from PRD

2. **开始实施** - 使用Dev工作流
   - 项目初始化故事
   - 认证模块实施
   - 核心业务API开发

3. **技术规范** - 如需详细技术设计
   - 使用Tech Spec工作流定义API端点和数据模型

