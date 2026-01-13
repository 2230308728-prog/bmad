# bmad 数据库设计文档

**项目:** bmad 研学产品预订平台
**版本:** 1.0
**日期:** 2026-01-10
**数据库:** PostgreSQL 15+
**ORM:** Prisma 5.x

---

## 目录

- [概述](#概述)
- [数据库架构](#数据库架构)
- [数据模型概览](#数据模型概览)
- [实体关系图](#实体关系图)
- [表结构详解](#表结构详解)
- [索引设计](#索引设计)
- [数据迁移策略](#数据迁移策略)
- [性能优化](#性能优化)
- [数据安全](#数据安全)
- [备份策略](#备份策略)

---

## 概述

### 数据库选型

**PostgreSQL 15+**

选择理由：
- ✅ 成熟稳定，企业级可靠性
- ✅ 完整的 ACID 支持，适合订单管理
- ✅ 强大的 JSON 支持（Product.images, Refund.images）
- ✅ 优秀的全文搜索能力
- ✅ 水平扩展能力（读写分离）
- ✅ 与 Prisma ORM 完美集成

### 命名约定

遵循架构文档中的命名规范：

| 类型 | 约定 | 示例 |
|------|------|------|
| 表名 | 小写复数 | `users`, `products`, `orders` |
| 列名 | snake_case | `user_id`, `created_at`, `order_no` |
| 外键 | `{表名}_id` | `user_id`, `product_id` |
| TypeScript | camelCase | `userId`, `createdAt`, `orderNo` |

### 设计原则

1. **类型安全**: 使用 Prisma Schema-First，编译时类型检查
2. **审计追踪**: 所有关键表都有 `created_at` 和 `updated_at`
3. **软删除**: 通过状态字段实现，不物理删除数据
4. **索引优化**: 为常用查询路径建立索引
5. **数据完整性**: 通过外键约束保证引用完整性

---

## 数据库架构

### 技术栈

```
┌─────────────────────────────────────┐
│         应用层 (NestJS)              │
│  Prisma Client (Type-safe ORM)      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      PostgreSQL 15+                 │
│  ┌───────────────────────────────┐ │
│  │  主数据库 (R/W)               │ │
│  │  - users                     │ │
│  │  - products                  │ │
│  │  - orders                    │ │
│  │  - refunds                   │ │
│  │  - user_issues               │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Redis 7+ (缓存层)               │
│  - 产品列表缓存                     │
│  - 用户会话                         │
│  - 库存计数                         │
│  - 限流控制                         │
└─────────────────────────────────────┘
```

### 数据库配置

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/bmad?schema=public"
```

**生产环境配置**:
- 连接池: 20-50 连接
- 超时时间: 30s
- SSL 模式: require
- 时区: Asia/Shanghai

---

## 数据模型概览

### 核心实体

```
users              ←───────┐
↓                          │
orders  ←────────→ products
↓                           │
refunds                product_categories
↓
user_issues
```

### 实体统计

| 实体类型 | 数量 | 说明 |
|---------|------|------|
| 核心表 | 6 | users, products, orders, refunds, product_categories, user_issues |
| 枚举类型 | 5 | Role, UserStatus, ProductStatus, OrderStatus, RefundStatus, IssueType, IssueStatus, IssuePriority |
| 关联关系 | 8 | 1:N 和 N:N 关系 |

---

## 实体关系图

### ER 图

```
┌──────────────────────┐
│   product_categories │
│   ─────────────────  │
│   id (PK)            │
│   name               │
│   description        │
│   sort_order         │
│   created_at         │
└──────────┬───────────┘
           │ 1
           │ has many
           │ N
           ↓
┌──────────────────────┐       1                    ┌──────────────────────┐
│       products       │──────────────────────────→│        users          │
│   ─────────────────  │                        │   ─────────────────  │
│   id (PK)            │ N                         │   id (PK)            │
│   title              │ has                      │   openid (UNIQUE)    │
│   description        │ many                     │   nickname           │
│   category_id (FK)   │ orders                   │   avatar_url         │
│   price              │                          │   phone              │
│   stock              │                          │   role               │
│   min_age            │                          │   status             │
│   max_age            │                          │   created_at         │
│   duration           │                          │   updated_at         │
│   location           │                          └──────────┬───────────┘
│   images             │                                     │
│   status             │                          1           │ 1
│   featured           │                          │ places    │ has
│   view_count         │                          │           │ many
│   booking_count      │                          N           │ N
│   created_at         │                                     │
│   updated_at         │                          ↓             ↓
└──────────────────────┘                  ┌──────────────────────┐
                                       │        orders          │
                                       │   ─────────────────  │
                                       │   id (PK)            │
                                       │   order_no (UNIQUE)  │
                                       │   user_id (FK)       │
                                       │   product_id (FK)    │
                                       │   status             │
                                       │   total_amount       │
                                       │   paid_amount        │
                                       │   child_name         │
                                       │   child_age          │
                                       │   contact_phone      │
                                       │   contact_name       │
                                       │   booking_date       │
                                       │   participant_count │
                                       │   remark             │
                                       │   paid_at            │
                                       │   cancelled_at       │
                                       │   completed_at       │
                                       │   created_at         │
                                       │   updated_at         │
                                       └──────────┬───────────┘
                                                  │ 1
                                                  │ has
                                                  │ many
                                                  ↓ N
                                       ┌──────────────────────┐
                                       │       refunds         │
                                       │   ─────────────────  │
                                       │   id (PK)            │
                                       │   refund_no (UNIQUE) │
                                       │   order_id (FK)      │
                                       │   user_id (FK)       │
                                       │   status             │
                                       │   refund_amount      │
                                       │   reason             │
                                       │   description        │
                                       │   images             │
                                       │   admin_note         │
                                       │   rejected_reason    │
                                       │   wechat_refund_id   │
                                       │   applied_at         │
                                       │   approved_at        │
                                       │   rejected_at        │
                                       │   completed_at       │
                                       │   created_at         │
                                       │   updated_at         │
                                       └──────────────────────┘

┌──────────────────────┐
│     user_issues      │
│   ─────────────────  │
│   id (PK)            │
│   user_id (FK)       │◄───────┐
│   order_id (FK)      │        │
│   type               │   N    │ 1
│   title              │ belongs │ user
│   description        │   to    │ has
│   status             │        │ many
│   priority           │        │
│   assigned_to        │        │
│   resolution         │        │
│   resolved_at        │        │
│   created_at         │        │
│   updated_at         │        │
└──────────────────────┘        │
                                 │
                                 │ (see users table above)
```

### 关系类型说明

| 关系 | 类型 | 说明 |
|------|------|------|
| users ↔ orders | 1:N | 一个用户可以有多个订单 |
| products ↔ orders | 1:N | 一个产品可以被多个订单预订 |
| product_categories ↔ products | 1:N | 一个分类包含多个产品 |
| users ↔ refunds | 1:N | 一个用户可以有多个退款申请 |
| orders ↔ refunds | 1:N | 一个订单可以有多个退款记录（虽然业务上限制一个） |
| users ↔ user_issues | 1:N | 一个用户可以提交多个问题 |

---

## 表结构详解

### 1. users (用户表)

**用途**: 存储家长用户和管理员用户信息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK | 自增主键 |
| openid | String? | UNIQUE | 微信 OpenID，家长用户唯一标识 |
| nickname | String? | - | 用户昵称 |
| avatar_url | String? | - | 头像 URL |
| phone | String? | - | 手机号（加密存储） |
| role | Role | DEFAULT PARENT | 角色：PARENT/ADMIN |
| status | UserStatus | DEFAULT ACTIVE | 状态：ACTIVE/INACTIVE/BANNED |
| created_at | DateTime | DEFAULT now() | 创建时间 |
| updated_at | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE INDEX (openid)

**业务规则**:
- `openid` 对应家长微信登录，管理员用户该字段为 NULL
- `role = BANNED` 的用户无法登录系统
- 手机号需要符合格式验证（11位数字）

**数据示例**:
```sql
INSERT INTO users (openid, nickname, avatar_url, phone, role, status) VALUES
('wx_o123456', '张爸爸', 'https://oss.example.com/avatar1.jpg', '13800138000', 'PARENT', 'ACTIVE'),
(NULL, 'admin', 'https://oss.example.com/admin.jpg', '13900139000', 'ADMIN', 'ACTIVE');
```

---

### 2. product_categories (产品分类表)

**用途**: 存储研学产品分类信息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK | 自增主键 |
| name | String | NOT NULL | 分类名称 |
| description | String? | - | 分类描述 |
| sort_order | Int | DEFAULT 0 | 排序权重 |
| created_at | DateTime | DEFAULT now() | 创建时间 |

**索引**:
- PRIMARY KEY (id)

**预置数据**:
```sql
INSERT INTO product_categories (name, description, sort_order) VALUES
('自然科学', '探索自然奥秘的科学探索活动', 1),
('历史文化', '人文历史类研学活动', 2),
('艺术体验', '艺术创作和美学体验', 3),
('户外运动', '户外拓展和体育活动', 4);
```

---

### 3. products (产品表)

**用途**: 存储研学产品的完整信息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK | 自增主键 |
| title | String | NOT NULL | 产品标题 |
| description | String (TEXT) | NOT NULL | 详细描述（富文本） |
| category_id | Int | FK | 关联分类 |
| price | Decimal(10,2) | NOT NULL | 当前价格 |
| original_price | Decimal(10,2)? | - | 原价（用于展示优惠） |
| stock | Int | DEFAULT 0 | 库存数量 |
| min_age | Int | DEFAULT 3 | 最小年龄 |
| max_age | Int | DEFAULT 18 | 最大年龄 |
| duration | String | NOT NULL | 活动时长（如"3天2夜"） |
| location | String | NOT NULL | 活动地点 |
| images | String[] | - | 图片 URL 数组 |
| status | ProductStatus | DEFAULT DRAFT | 状态：DRAFT/PUBLISHED/UNPUBLISHED |
| featured | Boolean | DEFAULT false | 是否推荐 |
| view_count | Int | DEFAULT 0 | 浏览次数 |
| booking_count | Int | DEFAULT 0 | 预订次数 |
| created_at | DateTime | DEFAULT now() | 创建时间 |
| updated_at | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- INDEX (category_id) - 分类查询
- INDEX (status) - 状态筛选
- INDEX (featured) - 推荐产品查询

**业务规则**:
- `stock < 10` 时需要告警库存不足
- `status = PUBLISHED` 的产品才能在前端显示
- `view_count` 每次详情页访问 +1
- `booking_count` 订单支付成功后 +1

---

### 4. orders (订单表)

**用途**: 存储用户预订订单信息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK | 自增主键 |
| order_no | String | UNIQUE | 订单编号（格式：ORD+YYYYMMDD+8位随机数） |
| user_id | Int | FK | 关联用户 |
| product_id | Int | FK | 关联产品 |
| status | OrderStatus | DEFAULT PENDING | 订单状态 |
| total_amount | Decimal(10,2) | NOT NULL | 订单总金额 |
| paid_amount | Decimal(10,2) | DEFAULT 0 | 已支付金额 |
| child_name | String | NOT NULL | 参与儿童姓名 |
| child_age | Int | NOT NULL | 参与儿童年龄 |
| contact_phone | String | NOT NULL | 联系电话 |
| contact_name | String | NOT NULL | 联系人姓名 |
| booking_date | DateTime | NOT NULL | 预订日期/场次 |
| participant_count | Int | DEFAULT 1 | 参与人数 |
| remark | String? (TEXT) | - | 备注信息 |
| paid_at | DateTime? | - | 支付时间 |
| cancelled_at | DateTime? | - | 取消时间 |
| completed_at | DateTime? | - | 完成时间 |
| created_at | DateTime | DEFAULT now() | 创建时间 |
| updated_at | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE INDEX (order_no) - 订单编号唯一
- INDEX (user_id) - 用户订单查询
- INDEX (product_id) - 产品订单查询
- INDEX (status) - 订单状态筛选

**订单编号生成规则**:
```
ORD + YYYYMMDD + 8位随机数
示例: ORD20240110123456789
```

**状态转换规则**:
```
PENDING → PAID → COMPLETED
PENDING → CANCELLED
PAID → REFUNDED
```

---

### 5. refunds (退款表)

**用途**: 存储退款申请和处理记录

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK | 自增主键 |
| refund_no | String | UNIQUE | 退款编号（格式：REF+YYYYMMDD+8位随机数） |
| order_id | Int | FK | 关联订单 |
| user_id | Int | FK | 关联用户 |
| status | RefundStatus | DEFAULT PENDING | 退款状态 |
| refund_amount | Decimal(10,2) | NOT NULL | 退款金额 |
| reason | String (TEXT) | NOT NULL | 退款原因 |
| description | String? (TEXT) | - | 详细说明 |
| images | String[] | - | 凭证图片 |
| admin_note | String? (TEXT) | - | 管理员备注 |
| rejected_reason | String? (TEXT) | - | 拒绝原因 |
| wechat_refund_id | String? | - | 微信退款单号 |
| applied_at | DateTime | DEFAULT now() | 申请时间 |
| approved_at | DateTime? | - | 审核通过时间 |
| rejected_at | DateTime? | - | 审核拒绝时间 |
| completed_at | DateTime? | - | 退款完成时间 |
| created_at | DateTime | DEFAULT now() | 创建时间 |
| updated_at | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE INDEX (refund_no)
- INDEX (user_id) - 用户退款查询
- INDEX (order_id) - 订单退款查询
- INDEX (status) - 退款状态筛选

**业务规则**:
- 同一订单只能有一个待处理或进行中的退款
- 退款金额不能超过订单的 `paid_amount`
- 退款必须在支付完成后 365 天内进行（微信限制）

---

### 6. user_issues (用户问题表)

**用途**: 存储用户反馈和问题记录

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK | 自增主键 |
| user_id | Int | FK | 关联用户 |
| order_id | Int? | FK | 关联订单（可选） |
| type | IssueType | NOT NULL | 问题类型 |
| title | String | NOT NULL | 问题标题 |
| description | String (TEXT) | NOT NULL | 详细描述 |
| status | IssueStatus | DEFAULT OPEN | 处理状态 |
| priority | IssuePriority | DEFAULT MEDIUM | 优先级 |
| assigned_to | Int? | - | 分配给的管理员 ID |
| resolution | String? (TEXT) | - | 解决方案 |
| resolved_at | DateTime? | - | 解决时间 |
| created_at | DateTime | DEFAULT now() | 创建时间 |
| updated_at | DateTime | AUTO UPDATE | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- INDEX (user_id) - 用户问题查询
- INDEX (status) - 状态筛选
- INDEX (priority) - 优先级排序

**优先级处理**:
```
URGENT > HIGH > MEDIUM > LOW
```

---

## 索引设计

### 索引策略

| 表名 | 索引 | 类型 | 用途 | 查询示例 |
|------|------|------|------|----------|
| users | openid | UNIQUE | 微信登录 | `WHERE openid = ?` |
| users | id | PRIMARY | 主键 | `WHERE id = ?` |
| products | category_id | INDEX | 分类筛选 | `WHERE category_id = ?` |
| products | status | INDEX | 状态筛选 | `WHERE status = 'PUBLISHED'` |
| products | featured | INDEX | 推荐产品 | `WHERE featured = true` |
| orders | order_no | UNIQUE | 订单查询 | `WHERE order_no = ?` |
| orders | user_id | INDEX | 用户订单 | `WHERE user_id = ?` |
| orders | product_id | INDEX | 产品订单 | `WHERE product_id = ?` |
| orders | status | INDEX | 状态筛选 | `WHERE status = 'PAID'` |
| refunds | refund_no | UNIQUE | 退款查询 | `WHERE refund_no = ?` |
| refunds | user_id | INDEX | 用户退款 | `WHERE user_id = ?` |
| refunds | order_id | INDEX | 订单退款 | `WHERE order_id = ?` |
| refunds | status | INDEX | 状态筛选 | `WHERE status = 'PENDING'` |
| user_issues | user_id | INDEX | 用户问题 | `WHERE user_id = ?` |
| user_issues | status | INDEX | 状态筛选 | `WHERE status = 'OPEN'` |
| user_issues | priority | INDEX | 优先级排序 | `ORDER BY priority` |

### 复合索引建议

**高优先级** (MVP 后添加):

```sql
-- 订单复合索引：用户 + 状态
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 订单复合索引：创建时间 + 状态
CREATE INDEX idx_orders_created_status ON orders(created_at DESC, status);

-- 产品复合索引：状态 + 排序
CREATE INDEX idx_products_status_featured ON products(status, featured DESC, booking_count DESC);
```

**全文搜索** (Post-MVP):

```sql
-- 产品标题和描述的全文搜索
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('chinese', title || ' ' || description));
```

---

## 数据迁移策略

### Prisma Migrate 工作流

```bash
# 1. 创建迁移
npx prisma migrate dev --name init

# 2. 生成 Prisma Client
npx prisma generate

# 3. 重置数据库（开发环境）
npx prisma migrate reset

# 4. 部署迁移（生产环境）
npx prisma migrate deploy
```

### 迁移历史

```sql
-- 查看 Prisma 迁移表
SELECT * FROM _prisma_migrations ORDER BY finished_at;
```

### 迁移命名规范

```
{action}_{model}_{description}

示例:
- init                          初始化
- add_user_issues              添加用户问题表
- add_refund_status_index      添加退款状态索引
```

### 数据库版本管理

**开发环境**:
```bash
# 开发时自动创建和迁移
npx prisma migrate dev
```

**生产环境**:
```bash
# 预审迁移
npx prisma migrate resolve --applied "add_refund_status"

# 部署迁移
npx prisma migrate deploy
```

### 回滚策略

```bash
# 手动回滚（Prisma 不支持自动回滚）
npx prisma migrate resolve --rolled-back "migration_name"

# 然后创建回滚迁移
npx prisma migrate dev --name rollback_add_refund_status
```

---

## 性能优化

### 查询优化

**1. 使用 SELECT 指定字段**
```typescript
// ❌ 查询所有字段
const users = await prisma.user.findMany()

// ✅ 只查询需要的字段
const users = await prisma.user.findMany({
  select: { id: true, nickname: true, avatarUrl: true }
})
```

**2. 分页查询**
```typescript
// ✅ 使用 cursor-based 分页（大数据量）
const products = await prisma.product.findMany({
  take: 20,
  skip: 1, // 跳过 cursor
  cursor: { id: lastId },
  orderBy: { createdAt: 'desc' }
})
```

**3. 关联查询优化**
```typescript
// ❌ N+1 查询
const orders = await prisma.order.findMany()
for (const order of orders) {
  const user = await prisma.user.findUnique({ where: { id: order.userId } })
}

// ✅ 使用 include 或 join
const orders = await prisma.order.findMany({
  include: { user: true, product: true }
})
```

### 连接池配置

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // 连接池配置
  pool_timeout = 30
  connection_limit = 20
}
```

### 缓存策略

| 数据类型 | 缓存位置 | TTL | 失效策略 |
|---------|----------|-----|----------|
| 产品列表 | Redis | 5分钟 | 产品更新时清除 |
| 产品详情 | Redis | 10分钟 | 产品更新时清除 |
| 用户会话 | Redis | 7天 | 用户登出时清除 |
| 库存计数 | Redis | 持久 | 订单支付时扣减 |

---

## 数据安全

### 敏感数据加密

**手机号加密存储**:
```typescript
import * as crypto from 'crypto';

function encryptPhone(phone: string): string {
  const key = process.env.ENCRYPTION_KEY;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptPhone(encryptedPhone: string): string {
  const key = process.env.ENCRYPTION_KEY;
  const parts = encryptedPhone.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### SQL 注入防护

Prisma 自动参数化查询，无需担心 SQL 注入：

```typescript
// ✅ 安全：Prisma 自动转义
const user = await prisma.user.findFirst({
  where: { phone: userInputPhone }
})

// ❌ 危险：永远不要使用原始 SQL
const result = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE phone = '${userInputPhone}'`)
```

### 数据访问控制

```typescript
// Prisma Middleware 实现 Row-Level Security
prisma.$use(async (params, next) => {
  // 检查用户权限
  if (params.model === 'User' && params.action === 'findUnique') {
    const currentUser = getCurrentUser();
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Access denied');
    }
  }
  return next(params);
});
```

---

## 备份策略

### 备份计划

| 备份类型 | 频率 | 保留期 | 存储位置 |
|---------|------|--------|----------|
| 全量备份 | 每天凌晨 2 点 | 30 天 | 阿里云 OSS |
| 增量备份 | 每小时 | 7 天 | 阿里云 OSS |
| 实时归档 | 持续 | 永久 | 阿里云 OSS |

### 备份命令

```bash
# 全量备份
pg_dump -U postgres -h localhost -d bmad -F c -b -v -f "/backup/bmad_$(date +%Y%m%d).backup"

# 恢复备份
pg_restore -U postgres -h localhost -d bmad -v "/backup/bmad_20240110.backup"
```

### 自动化备份脚本

```bash
#!/bin/bash
# backup.sh

DB_NAME="bmad"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.backup"

# 创建备份
pg_dump -U postgres -h localhost -d $DB_NAME -F c -b -v -f $BACKUP_FILE

# 上传到阿里云 OSS
ossutil cp $BACKUP_FILE oss://my-bucket/backups/

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete
```

---

## 附录

### Prisma Schema 快速参考

完整的 Prisma Schema 文件位于：
```
backend-api/prisma/schema.prisma
```

### 数据库初始化

```bash
# 1. 安装依赖
cd backend-api
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 创建数据库迁移
npx prisma migrate dev --name init

# 4. 生成 Prisma Client
npx prisma generate

# 5. （可选）填充种子数据
npx prisma db seed
```

### 常用 Prisma 命令

```bash
# 查看数据库（Prisma Studio）
npx prisma studio

# 重置数据库
npx prisma migrate reset

# 格式化 Schema
npx prisma format

# 验证 Schema
npx prisma validate
```

---

**文档维护者:** Zhang
**最后更新:** 2026-01-10
**版本:** 1.0
