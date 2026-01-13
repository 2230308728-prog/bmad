# Story 2.1: 设计并创建用户数据模型

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 在 Prisma schema 中定义用户数据模型,
So that 应用可以持久化存储家长和管理员的用户信息。

## Acceptance Criteria

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

## Tasks / Subtasks

- [ ] **Task 1: 验证 Prisma 环境** (AC: Given)
  - [ ] 确认 backend-api/prisma/ 目录存在
  - [ ] 确认 schema.prisma 文件存在
  - [ ] 验证 DATABASE_URL 环境变量已配置
  - [ ] 验证 PostgreSQL 数据库可访问

- [ ] **Task 2: 定义枚举类型** (AC: And - 枚举定义)
  - [ ] 在 schema.prisma 中定义 Role 枚举
  - [ ] 在 schema.prisma 中定义 UserStatus 枚举
  - [ ] 验证枚举值符合业务需求（PARENT/ADMIN, ACTIVE/INACTIVE/BANNED）

- [ ] **Task 3: 定义 User 模型** (AC: Then - User 模型)
  - [ ] 创建 User 模型，包含所有必需字段
  - [ ] 设置 id 为主键，自增类型
  - [ ] 设置 openid 为可选字段（String?）
  - [ ] 设置 nickname、avatar_url、phone 为可选字段
  - [ ] 设置 role 和 status 为枚举类型
  - [ ] 设置 created_at 默认值为当前时间
  - [ ] 设置 updated_at 自动更新时间戳

- [ ] **Task 4: 配置唯一索引** (AC: And - openid 唯一索引)
  - [ ] 为 openid 字段添加唯一约束
  - [ ] 使用 @@unique([openid]) 语法
  - [ ] 验证索引配置正确

- [ ] **Task 5: 创建数据库迁移** (AC: And - 执行迁移)
  - [ ] 在 backend-api 目录执行 `npx prisma migrate dev --name add_user_model`
  - [ ] 验证迁移文件生成成功
  - [ ] 验证数据库表创建成功
  - [ ] 验证枚举类型在数据库中正确创建

- [ ] **Task 6: 生成 Prisma Client** (AC: And - 重新生成类型)
  - [ ] 执行 `npx prisma generate`
  - [ ] 验证 @prisma/client 类型定义更新
  - [ ] 验证 TypeScript 类型检查通过

- [ ] **Task 7: 验证数据模型** (综合验证)
  - [ ] 使用 Prisma Studio 查看数据表结构
  - [ ] 验证所有字段类型正确
  - [ ] 验证枚举值可正常选择
  - [ ] 验证 openid 唯一约束生效
  - [ ] 测试创建用户记录（可选）

## Dev Notes

### 架构模式和约束

**关键架构决策（来自 architecture.md）：**
- **数据库**: Prisma 5.x + PostgreSQL 15
- **ORM 模式**: Schema-First 方式
- **类型安全**: Prisma 自动生成 TypeScript 类型
- **命名约定**: 数据库 snake_case → TypeScript camelCase 自动转换

**数据模型规则（必须遵循）：**
1. **表命名**: 小写复数snake_case
   - ✅ 正确：`users`, `products`, `orders`
   - ❌ 错误：`Users`, `user`, `UserTable`

2. **列命名**: snake_case
   - ✅ 正确：`user_id`, `created_at`, `avatar_url`
   - ❌ 错误：`userId`, `createdAt`, `avatarUrl`

3. **外键命名**: `{table}_id` 格式
   - ✅ 正确：`user_id`, `product_id`, `order_id`
   - ❌ 错误：`fk_user`, `userId`

4. **Prisma 自动转换**: 数据库 snake_case → TypeScript camelCase
   ```prisma
   model User {
     user_id     Int      @id @default(autoincrement())  // 数据库: user_id
     createdAt   DateTime @default(now())                 // 数据库: created_at
     avatarUrl   String?                                   // TypeScript: avatarUrl
   }
   ```

5. **枚举定义**: PascalCase 单数形式
   ```prisma
   enum Role {
     PARENT
     ADMIN
   }
   ```

### 源代码结构要求

**backend-api/prisma/ 目录结构：**

```
backend-api/
├── prisma/
│   ├── schema.prisma               # 数据库 Schema（本故事主要修改）
│   ├── migrations/                 # 迁移文件目录
│   │   └── 20240113XXXXXX_add_user_model/
│   │       └── migration.sql       # 自动生成的迁移 SQL
│   └── seed.ts                     # 种子数据（可选，后续使用）
├── src/
│   └── lib/
│       └── prisma.service.ts       # Prisma 服务（Epic 1 已创建）
└── .env                            # 环境变量（DATABASE_URL）
```

### 文件修改清单

**本故事需修改的文件：**

| 文件 | 说明 | 修改类型 |
|------|------|---------|
| `backend-api/prisma/schema.prisma` | 数据库 Schema 定义 | 修改（添加 User 模型和枚举） |
| `backend-api/prisma/migrations/xxx_add_user_model/migration.sql` | 数据库迁移 SQL | 自动生成 |
| `backend-api/node_modules/.prisma/client/` | Prisma Client 类型 | 自动重新生成 |
| `2-1-design-user-data-model.md` | 本故事文件 | 修改（任务完成状态） |

### Prisma Schema 设计要求

**User 模型完整定义：**

```prisma
// backend-api/prisma/schema.prisma

// 用户角色枚举
enum Role {
  PARENT  // 家长用户
  ADMIN   // 管理员
}

// 用户状态枚举
enum UserStatus {
  ACTIVE    // 激活状态
  INACTIVE  // 未激活
  BANNED    // 已禁用
}

// 用户模型
model User {
  id        Int        @id @default(autoincrement())
  openid    String?    @unique  // 微信 OpenID，唯一索引
  nickname  String?             // 用户昵称
  avatarUrl String?    @map("avatar_url")  // 头像 URL
  phone     String?             // 手机号（加密存储）
  role      Role     @default(PARENT)       // 用户角色
  status    UserStatus @default(ACTIVE)     // 用户状态
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("users")  // 表名映射为小写复数
}
```

**关键设计说明：**
1. **openid 唯一索引**: 使用 `@unique` 约束，确保微信 OpenID 不重复
2. **默认值**: role 默认 PARENT，status 默认 ACTIVE
3. **列名映射**: 使用 `@map` 将 camelCase 字段名映射到 snake_case 列名
4. **表名映射**: 使用 `@@map("users")` 将 User 模型映射到 users 表

### 数据库迁移验证

**迁移前验证：**
1. 确认 PostgreSQL 数据库运行中
2. 确认 DATABASE_URL 环境变量正确
3. 确认有数据库创建权限

**迁移执行步骤：**
```bash
# 1. 进入 backend-api 目录
cd backend-api

# 2. 格式化 schema（可选，保持一致性）
npx prisma format

# 3. 创建迁移
npx prisma migrate dev --name add_user_model

# 4. 生成 Prisma Client
npx prisma generate

# 5. 验证迁移
npx prisma studio  # 可选：打开数据库管理界面
```

**迁移成功标志：**
- ✅ migrations/ 目录下生成新的迁移文件
- ✅ 数据库中创建 users 表
- ✅ 数据库中创建 Role 和 UserStatus 枚举类型
- ✅ Prisma Client 类型定义包含 User 模型
- ✅ TypeScript 编译无错误

### 测试要求

**手动验证测试：**
1. Prisma Studio 查看 users 表结构
2. 验证所有字段类型正确
3. 验证 role 枚举可选择 PARENT 或 ADMIN
4. 验证 status 枚举可选择 ACTIVE、INACTIVE 或 BANNED
5. 测试创建两条 openid 相同的记录（应失败，验证唯一约束）

**可选测试（Prisma Client）：**
```typescript
// 示例：测试创建用户
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUserCreation() {
  const user = await prisma.user.create({
    data: {
      openid: 'test_openid_123',
      nickname: '测试用户',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'PARENT',
      status: 'ACTIVE',
    },
  });
  console.log('创建用户成功:', user);
}
```

### 技术依赖和版本

**必需版本：**
- Prisma: 5.x
- PostgreSQL: 15+
- Node.js: 20+ LTS
- TypeScript: 5+

**Prisma CLI 命令：**
- `npx prisma init` - 初始化 Prisma（Epic 1 已完成）
- `npx prisma migrate dev` - 创建开发环境迁移
- `npx prisma migrate prod` - 创建生产环境迁移
- `npx prisma generate` - 生成 Prisma Client
- `npx prisma studio` - 打开数据库管理界面
- `npx prisma format` - 格式化 schema 文件

### 参考文档

| 文档 | 路径 | 关键章节 |
|------|------|---------|
| Epic 详细规划 | `_bmad-output/planning-artifacts/epics.md` | Epic 2, Story 2.1 |
| 技术架构 | `_bmad-output/planning-artifacts/architecture.md` | 数据架构, 命名模式 |
| 项目上下文 | `_bmad-output/project-context.md` | API & Data Rules |
| Prisma 文档 | https://www.prisma.io/docs | Schema Reference, Migrations |

### 后续依赖

**此故事完成后，以下故事可开始：**
- Story 2.2: 实现 JWT 认证基础设施（需要 User 模型）
- Story 2.3: 实现管理员账号密码登录（需要 User 模型）
- Story 2.4: 实现家长微信授权登录（需要 User 模型）

**本故事为以下功能提供基础：**
- 所有用户认证功能（Epic 2）
- 用户权限管理（Epic 2）
- 订单关联用户（Epic 4）
- 用户数据管理（Epic 6）

### 前序 Story 经验 (Epic 1)

**从 Story 1.1 和 1.2 学到的经验：**
1. **端口冲突处理**: Story 1.1 中端口 3000 被占用，后端 API 应优先使用 3000
2. **配置文件完整性**: 需要创建 .prettierrc 以保持代码风格一致
3. **目录结构提前准备**: 创建必要的目录结构避免后续遗漏
4. **文档更新**: README.md 应该更新为项目特定内容，而非默认模板

**Story 1.1 技术决策参考：**
- 使用最新稳定版本（Next.js 用 16.1.1，NestJS 应用相同原则）
- TypeScript strict mode 强制启用
- ESLint + Prettier 配置完整

### 安全考虑

**敏感数据保护：**
- **phone 字段**: 当前 story 仅定义字段，加密存储在后续认证 story 实现
  - Story 2.3 会实现管理员登录时的密码加密（bcrypt）
  - 后续可能需要对 phone 字段进行 PostgreSQL 加密或应用层加密

**唯一约束防止重复：**
- openid 的 @unique 约束确保同一微信账号不会创建多个用户
- 这是微信授权登录的关键数据完整性保证

### 性能考虑

**数据库索引策略：**
- 当前仅 openid 有唯一索引（自动创建索引）
- 后续故事可能需要添加：
  - (role, status) 复合索引：查询活跃管理员或家长
  - (created_at) 索引：按注册时间排序查询
  - 全文搜索索引：按 nickname 搜索用户（如果需要）

**数据库查询优化：**
- 当前 story 仅定义模型，不涉及查询
- 后续 story 实现用户查询时，注意 N+1 查询问题

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Debug Log References

### Implementation Plan

**任务执行计划：**
1. Task 1: 验证 Prisma 环境和数据库连接
2. Task 2: 定义 Role 和 UserStatus 枚举类型
3. Task 3: 定义 User 模型及所有字段
4. Task 4: 配置 openid 唯一索引
5. Task 5: 执行 Prisma 迁移创建数据表
6. Task 6: 重新生成 Prisma Client 类型
7. Task 7: 验证数据模型完整性

**技术决策预判：**
- Prisma 版本: 使用 5.x 最新稳定版
- 表命名: 严格遵循 snake_case 复数（users）
- 列命名: 严格遵循 snake_case（user_id, created_at, avatar_url）
- 枚举命名: PascalCase 单数（Role, UserStatus）
- 默认值: role 默认 PARENT，status 默认 ACTIVE
- 唯一约束: openid 使用 @unique 而非 @@unique（单字段）

### Completion Notes List

- Story 创建时间: 2026-01-13
- Sprint 状态文件位置: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Epic 2 技术规范不存在，直接参考 epics.md 和 architecture.md
- 前序 Epic 1 故事 (1.1, 1.2) 已完成，经验已总结
- 所有必需文档已分析完成
- 架构文档命名约定已明确：数据库 snake_case，API camelCase
- Prisma 自动转换规则已确认：snake_case(数据库) → camelCase(TypeScript)

### File List

**待创建/修改文件：**
- `backend-api/prisma/schema.prisma` (修改：添加 User 模型和枚举)
- `backend-api/prisma/migrations/xxx_add_user_model/migration.sql` (自动生成)
- `backend-api/node_modules/.prisma/client/` (自动重新生成)
- `2-1-design-user-data-model.md` (本故事文件)
