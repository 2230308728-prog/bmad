---
project_name: 'bmad'
user_name: 'Zhang'
date: '2026-01-09'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'api_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'anti_patterns']
existing_patterns_found: 18
status: 'complete'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**管理后台 (Next.js 15):**
- Next.js 15 (App Router, React Server Components)
- React 19
- TypeScript 5+ (strict mode)
- Tailwind CSS 4
- shadcn/ui (Radix UI primitives)

**后端API (NestJS):**
- NestJS (TypeScript strict mode)
- Prisma 5.x
- PostgreSQL
- Redis 7.x
- Node.js 20+ LTS
- @nestjs/jwt, @nestjs/passport, @nestjs/swagger
- class-validator, class-transformer

**小程序:**
- 微信原生框架 (WXML, WXSS, JavaScript/TypeScript)

---

## Critical Implementation Rules

### Language-Specific Rules

**TypeScript 严格模式配置:**
- 所有项目启用 `strict: true`
- 禁止使用 `any` 类型（除非有明确注释说明原因）
- 始终显式标注函数返回类型
- 使用 `unknown` 而非 `any` 处理动态数据

**导入/导出约定:**
- 使用绝对路径导入：`@/components/...` 或 `@/lib/...`
- 导入顺序：外部库 → 内部模块 → 类型导入 → 相对路径
- 避免深层相对路径（如 `../../../`）

**错误处理模式:**
- NestJS：使用内置异常类（`HttpException`, `BadRequestException`）
- React：使用Error Boundaries捕获组件错误
- 始终在API层捕获并记录错误，不在UI层直接console.error

---

### Framework-Specific Rules

**Next.js 15 (App Router):**
- 优先使用Server Components，仅在需要交互性时使用 `'use client'`
- 路由组使用 `(group-name)` 命名（不参与URL路径）
- 布局文件 `layout.tsx` 必须导出默认函数
- API路由使用 `app/api/` 目录，返回 `Response` 对象

**NestJS:**
- 使用模块化结构，每个功能模块独立（`*.module.ts`）
- Controller仅处理HTTP请求/响应，业务逻辑在Service层
- 使用DTO（Data Transfer Object）进行输入验证（class-validator）
- 所有公共端点必须添加Swagger装饰器（`@ApiTags()`, `@ApiOperation()`）

**Prisma:**
- Schema定义使用snake_case（数据库）→ Prisma自动转换为camelCase（TypeScript）
- 表名使用小写复数（`users`, `products`, `orders`）
- 外键命名：`{table}_id`（如 `user_id`, `product_id`）
- 迁移文件必须描述性命名：`npx prisma migrate dev --name add_user_preferences`

---

### API & Data Rules

**REST API 约定:**
- 端点使用复数资源：`GET /users`, `POST /products`
- 路由参数简单命名：`/users/:id`（非 `:userId`）
- 查询参数使用camelCase：`?userId=123&createdAt=2024-01-01`
- 统一响应包装：
  ```typescript
  // 成功
  { data: {...}, meta: { timestamp, version } }
  // 列表
  { data: [...], meta: { total, page, pageSize } }
  // 错误
  { statusCode, message, error, timestamp }
  ```

**数据库到API映射:**
- Prisma snake_case字段自动转换为camelCase JSON
- 日期字段始终使用ISO 8601字符串：`"2024-01-01T00:00:00Z"`
- 布尔值使用 `true/false`，非 `1/0`
- 分页参数：`page`, `pageSize`（默认20）

---

### Testing Rules

**测试文件组织:**
- 与源文件同目录：`UserService.ts` + `UserService.spec.ts`
- 测试文件命名：`*.spec.ts`（单元测试）、`*.e2e-spec.ts`（端到端）

**测试结构要求:**
- 单元测试：隔离测试单个函数/方法
- 集成测试：测试模块间交互
- E2E测试：测试完整用户流程

**Mock使用约定:**
- 优先使用NestJS的测试模块（`Test.createTestingModule()`）
- 外部服务（如微信API）必须mock
- 数据库操作使用Prisma的测试数据库或内存SQLite

---

### Code Quality & Style Rules

**命名约定（严格遵循）:**
| 类型 | 规则 | 示例 |
|-----|------|-----|
| React组件 | PascalCase | `UserCard.tsx`, `ProductList.tsx` |
| NestJS类 | PascalCase | `UsersService`, `ProductsController` |
| 函数/变量 | camelCase | `getUserData`, `userId` |
| 数据库表 | 小写复数snake_case | `users`, `order_items` |
| 数据库列 | snake_case | `user_id`, `created_at` |
| 接口/类型 | PascalCase, I前缀可选 | `User`, `IUserData` |

**文件组织:**
- 按功能分组：`features/users/`, `features/products/`
- 共享工具放在 `lib/` 或 `utils/`
- 类型定义放在 `types/` 或与组件同目录

**ESLint/Prettier:**
- 代码必须通过ESLint检查才能提交
- 使用Prettier统一格式化
- 禁止 `console.log` 在生产代码中（使用Logger）

---

### Development Workflow Rules

**Git工作流:**
- 主分支：`main`
- 功能分支：`feature/功能名称`
- 修复分支：`fix/问题描述`
- 提交信息：约定式提交（Conventional Commits）

**环境配置:**
- `.env` 文件不提交，提供 `.env.example`
- 环境变量通过 `@nestjs/config` 管理
- 敏感信息（API密钥）使用环境变量

**部署前检查:**
- 所有测试必须通过
- TypeScript编译无错误
- Prisma迁移已应用
- Swagger文档已更新

---

### Critical Don't-Miss Rules

**反模式避免:**

❌ **错误示例:**
```typescript
// API端点使用单数
@Controller('user')  // ❌
@Get('getUser')      // ❌ 动词命名

// 数据库列使用camelCase
model User {
  userId Int @id     // ❌ 数据库应为snake_case
}

// React组件使用kebab-case
function user_card() { ... }  // ❌
```

✅ **正确示例:**
```typescript
// API端点使用复数资源
@Controller('users')   // ✅
@Get()                 // ✅ RESTful

// 数据库列使用snake_case
model User {
  user_id Int @id      // ✅
}

// React组件使用PascalCase
function UserCard() { ... }  // ✅
```

**必须处理的边界情况:**
1. **高并发库存扣减**：使用Redis原子操作防止超卖
2. **微信支付回调**：验证签名，处理重复通知
3. **文件上传**：验证类型和大小，使用OSS直传
4. **JWT过期**：实现token刷新机制

**安全规则:**
- 敏感数据（密码、密钥）必须加密存储
- API端点必须限流（Throttler + Redis）
- 用户输入必须验证（class-validator）
- CORS配置仅允许可信来源

**性能陷阱避免:**
- N+1查询问题：使用Prisma的 `include` 或 `select` 预加载关联
- 大列表分页：始终使用分页，限制单页最大数量
- 内存泄漏：组件卸载时清理订阅和定时器
- 缓存击穿：对热点数据使用Redis缓存

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

**Last Updated:** 2026-01-09
