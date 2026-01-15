# Story 6.1: 实现管理员用户信息查询

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **管理员**,
I want **查看平台用户的基本信息和注册情况**,
so that **我可以了解用户构成和平台用户增长趋势**.

## Acceptance Criteria

1. **Given** Epic 1、Epic 2 已完成
2. **When** 创建 AdminUsersController（admin-users.controller.ts）
3. **Then** 应用 @Roles(Role.ADMIN) 权限保护
4. **When** 实现 GET /api/v1/admin/users 端点
5. **Then** 接收请求参数：
   - page: number (默认1)
   - pageSize: number (默认20，最大50)
   - role: Role? (按角色筛选：PARENT, ADMIN)
   - status: UserStatus? (按状态筛选：ACTIVE, INACTIVE, BANNED)
   - keyword: string? (搜索昵称或手机号)
   - startDate: string? (注册开始日期)
   - endDate: string? (注册结束日期)
6. **And** 支持多条件组合筛选
7. **And** 按 created_at 降序排序（最新注册在前）
8. **And** 返回分页数据
9. **And** 手机号脱敏显示（中间4位显示为****）
10. **And** 包含用户统计信息（订单数、总消费）
11. **When** 实现 GET /api/v1/admin/users/:id 端点
12. **Then** 验证用户存在
13. **Then** 返回完整用户信息（不脱敏）
14. **And** 包含最近登录时间
15. **When** 实现 PATCH /api/v1/admin/users/:id/status 端点
16. **Then** 接收请求 Body：{ "status": "ACTIVE" | "INACTIVE" | "BANNED" }
17. **And** 验证用户存在
18. **And** 更新用户状态
19. **And** 被禁用的用户（BANNED）无法登录（在 Story 2.3、2.4 验证）
20. **And** 清除相关 Redis 缓存
21. **And** 返回 200 和更新后的用户信息
22. **When** 实现 GET /api/v1/admin/users/stats 端点
23. **Then** 返回用户统计数据：
   - total: 总用户数
   - parents: 家长用户数
   - admins: 管理员用户数
   - active: 活跃用户数
   - inactive: 未激活用户数
   - banned: 已禁用用户数
   - todayRegistered: 今日注册用户数
   - weekRegistered: 本周注册用户数
   - monthRegistered: 本月注册用户数

## Tasks / Subtasks

- [x] Task 1: 创建 AdminUsersController 和基础路由 (AC: #2-#3)
  - [x] 1.1 创建 `backend-api/src/features/users/admin-users.controller.ts`
    - 应用 @Controller('admin/users') 路由前缀
    - 应用 @Roles(Role.ADMIN) 权限保护
    - 应用 @UseGuards(JwtAuthGuard, RolesGuard)
  - [x] 1.2 创建 `backend-api/src/features/users/admin-users.service.ts`
    - 注入 PrismaService 用于数据库操作
    - 注入 CacheService 用于缓存管理
  - [x] 1.3 创建 `backend-api/src/features/users/users.module.ts`（如不存在）
    - 导入 AdminUsersController
    - 导出 AdminUsersService
  - [x] 1.4 在 AppModule 中导入 UsersModule

- [x] Task 2: 实现用户列表查询 API (AC: #4-#11)
  - [x] 2.1 创建 DTO `backend-api/src/features/users/dto/admin/query-users.dto.ts`
    - page: number @IsOptional() @IsInt() @Min(1)
    - pageSize: number @IsOptional() @IsInt() @Min(1) @Max(50)
    - role: Role @IsOptional() @IsEnum(Role)
    - status: UserStatus @IsOptional() @IsEnum(UserStatus)
    - keyword: string @IsOptional() @IsString()
    - startDate: string @IsOptional() @IsDateString()
    - endDate: string @IsOptional() @IsDateString()
  - [x] 2.2 创建 DTO `backend-api/src/features/users/dto/admin/user-list-response.dto.ts`
    - id: number
    - nickname: string
    - avatarUrl: string?
    - role: Role
    - status: UserStatus
    - phone: string (脱敏)
    - orderCount: number
    - totalSpent: string (Decimal)
    - lastOrderAt: Date?
    - createdAt: Date
  - [x] 2.3 实现 GET /api/v1/admin/users 端点
    - 查询条件：支持 role, status, keyword, startDate, endDate 筛选
    - keyword 搜索昵称或手机号（使用 Prisma 的 OR 条件）
    - 按 created_at 降序排序
    - 使用 Prisma 的分页：skip + take
  - [x] 2.4 实现手机号脱敏
    - 保留前3位和后4位：138****8000
    - 创建工具方法 maskPhone(phone: string): string
  - [x] 2.5 统计用户订单数和总消费
    - 使用 Prisma 的 _count 聚合订单数
    - 使用 Prisma 的 _sum 聚合订单金额
  - [x] 2.6 添加 Swagger 文档装饰器
    - @ApiTags('admin-users')
    - @ApiOperation({ summary: '查询用户列表' })
    - @ApiResponse({ type: UserListResponseDto, isArray: true })

- [x] Task 3: 实现用户详情查询 API (AC: #11-#15)
  - [x] 3.1 创建 DTO `backend-api/src/features/users/dto/admin/user-detail-response.dto.ts`
    - id: number
    - openid: string
    - nickname: string
    - avatarUrl: string?
    - phone: string (不脱敏)
    - email: string? (管理员专用)
    - role: Role
    - status: UserStatus
    - orderCount: number
    - totalSpent: string (Decimal)
    - lastLoginAt: Date?
    - createdAt: Date
    - updatedAt: Date
  - [x] 3.2 实现 GET /api/v1/admin/users/:id 端点
    - 验证用户存在
    - 返回完整用户信息（不脱敏手机号）
  - [x] 3.3 添加 lastLoginAt 字段支持
    - 在 User 模型中添加 last_login_at 字段（可选，如没有则跳过）
    - 或使用最近订单时间作为参考
  - [x] 3.4 添加 Swagger 文档装饰器
    - @ApiOperation({ summary: '查询用户详情' })
    - @ApiResponse({ type: UserDetailResponseDto })
  - [x] 3.5 实现 404 错误处理
    - 用户不存在抛出 NotFoundException

- [x] Task 4: 实现用户状态更新 API (AC: #16-#22)
  - [x] 4.1 创建 DTO `backend-api/src/features/users/dto/admin/update-user-status.dto.ts`
    - status: UserStatus @IsEnum(UserStatus)
    - reason: string @IsOptional() @IsString()
  - [x] 4.2 实现 PATCH /api/v1/admin/users/:id/status 端点
    - 验证用户存在
    - 验证状态转换的合法性
    - 更新用户状态
  - [x] 4.3 实现缓存清理
    - 清除用户相关缓存：user:detail:{userId}
    - 清除用户统计缓存：user:stats
  - [x] 4.4 添加 Swagger 文档装饰器
    - @ApiOperation({ summary: '更新用户状态' })
    - @ApiResponse({ type: UserDetailResponseDto })
  - [x] 4.5 记录状态变更日志
    - 记录管理员操作日志（可选）
    - 包含操作人、时间、原因

- [x] Task 5: 实现用户统计 API (AC: #23)
  - [x] 5.1 创建 DTO `backend-api/src/features/users/dto/admin/user-stats-response.dto.ts`
    - total: number
    - parents: number
    - admins: number
    - active: number
    - inactive: number
    - banned: number
    - todayRegistered: number
    - weekRegistered: number
    - monthRegistered: number
  - [x] 5.2 实现 GET /api/v1/admin/users/stats 端点
    - 使用 Prisma 的分组聚合统计
    - 统计各角色用户数：groupBy role + _count
    - 统计各状态用户数：groupBy status + _count
    - 统计今日注册：created_at >= today_start
    - 统计本周注册：created_at >= week_start
    - 统计本月注册：created_at >= month_start
  - [x] 5.3 实现缓存优化
    - 缓存统计结果到 Redis（TTL: 5分钟）
    - 缓存键：user:stats
  - [x] 5.4 添加 Swagger 文档装饰器
    - @ApiOperation({ summary: '获取用户统计数据' })
    - @ApiResponse({ type: UserStatsResponseDto })

- [x] Task 6: 添加单元测试 (AC: 全部)
  - [x] 6.1 创建 `backend-api/src/features/users/admin-users.service.spec.ts`
    - 测试用户列表查询（各种筛选条件组合）
    - 测试用户详情查询
    - 测试用户状态更新
    - 测试用户统计计算
    - Mock PrismaService
  - [x] 6.2 创建 `backend-api/src/features/users/admin-users.controller.spec.ts`
    - 测试所有端点的路由和权限
    - 测试请求参数验证
    - Mock AdminUsersService
  - [x] 6.3 测试覆盖率要求
    - 至少 80% 代码覆盖率
    - 关键业务逻辑 100% 覆盖

- [x] Task 7: 添加 Swagger 文档 (AC: 全部)
  - [x] 7.1 为所有端点添加 @ApiOperation() 描述
  - [x] 7.2 为所有端点添加 @ApiResponse() 响应示例
  - [x] 7.3 为所有 DTO 添加 @ApiProperty() 装饰器
  - [x] 7.4 添加响应状态码说明

## Dev Notes

### 功能概述
实现管理员用户信息查询功能，包括用户列表查询（支持筛选、分页）、用户详情查询、用户状态更新和用户统计数据。这是 Epic 6（用户管理与分析）的第一个 Story，为后续的用户订单历史查询、问题处理和数据看板功能提供基础。

### 数据模型依赖
- **User 模型**（已在 Epic 2.1 创建）：
  - id: Int @id @default(autoincrement())
  - openid: String? @unique (家长微信 OpenID)
  - email: String? @unique (管理员邮箱)
  - nickname: String?
  - avatarUrl: String?
  - phone: String? (加密存储)
  - role: Role (PARENT, ADMIN)
  - status: UserStatus (ACTIVE, INACTIVE, BANNED)
  - createdAt: DateTime @default(now())
  - updatedAt: DateTime @updatedAt
  - orders: Order[] (关联订单)
- **Order 模型**（已在 Epic 4.1 创建）：
  - 用于统计用户的订单数和总消费

### API 端点设计
1. **GET /api/v1/admin/users** - 用户列表查询
   - 权限：@Roles(Role.ADMIN)
   - 参数：page, pageSize, role, status, keyword, startDate, endDate
   - 返回：分页用户列表（手机号脱敏）

2. **GET /api/v1/admin/users/:id** - 用户详情查询
   - 权限：@Roles(Role.ADMIN)
   - 返回：完整用户信息（手机号不脱敏）

3. **PATCH /api/v1/admin/users/:id/status** - 更新用户状态
   - 权限：@Roles(Role.ADMIN)
   - Body：{ status: UserStatus, reason?: string }
   - 返回：更新后的用户信息

4. **GET /api/v1/admin/users/stats** - 用户统计数据
   - 权限：@Roles(Role.ADMIN)
   - 返回：用户总数、角色分布、状态分布、注册趋势

### 关键业务逻辑
1. **手机号脱敏**：
   - 列表显示：保留前3位和后4位，中间4位显示为 ****
   - 详情查询：不脱敏，管理员可查看完整手机号

2. **用户统计**：
   - 订单数：统计用户的所有订单（不区分状态）
   - 总消费：统计已支付订单的总金额（status = PAID, COMPLETED）

3. **状态转换**：
   - ACTIVE → INACTIVE / BANNED（允许）
   - INACTIVE → ACTIVE / BANNED（允许）
   - BANNED → ACTIVE / INACTIVE（允许）
   - 被禁用的用户无法登录（在 Story 2.3、2.4 的 AuthService 中验证）

4. **筛选逻辑**：
   - keyword：同时搜索 nickname 和 phone 字段
   - 日期范围：created_at BETWEEN startDate AND endDate

### 缓存策略
- 用户列表缓存：user:list:{hash(params)} (TTL: 2分钟)
- 用户详情缓存：user:detail:{userId} (TTL: 5分钟)
- 用户统计缓存：user:stats (TTL: 5分钟)
- 状态更新时清除相关缓存

### 错误处理
- 用户不存在：抛出 NotFoundException (404)
- 无效的状态转换：抛出 BadRequestException (400)
- 分页参数验证：使用 class-validator 自动验证

## Project Structure Notes

### 文件组织
```
backend-api/src/features/users/
├── admin-users.controller.ts       # 管理员用户控制器
├── admin-users.controller.spec.ts  # 控制器测试
├── admin-users.service.ts          # 用户服务
├── admin-users.service.spec.ts     # 服务测试
└── dto/
    ├── admin/
    │   ├── query-users.dto.ts          # 用户列表查询 DTO
    │   ├── user-list-response.dto.ts   # 用户列表响应 DTO
    │   ├── user-detail-response.dto.ts  # 用户详情响应 DTO
    │   ├── update-user-status.dto.ts   # 状态更新 DTO
    │   └── user-stats-response.dto.ts   # 统计数据响应 DTO
```

### 模块依赖
- **依赖**：AuthModule（权限验证）、PrismaModule（数据库）、RedisModule（缓存）
- **被依赖**：无（这是第一个用户管理 Story）
- **导入到**：AppModule

### 对齐现有模式
遵循 Story 2.5、3.5、5.2 等管理员端点的模式：
- Controller 路由：`/api/v1/admin/{resource}`
- 权限保护：`@Roles(Role.ADMIN)`
- 分页响应格式：`{ data: [], meta: { total, page, pageSize } }`
- 错误处理：使用 NestJS 内置异常类

### 检测到的冲突或差异
无冲突。这是 Epic 6 的第一个 Story，建立用户管理功能的基础。

## References

### Epic 需求来源
- [Epic 6: 用户管理与分析](../planning-artifacts/epics.md#epic-6-用户管理与分析-)
- [Story 6.1: 实现管理员用户信息查询](../planning-artifacts/epics.md#story-61-实现管理员用户信息查询)

### 架构文档
- [Architecture.md](../planning-artifacts/architecture.md) - 系统架构设计

### 项目上下文
- [project-context.md](../project-context.md) - 编码规范和反模式

### 前置 Story 依赖
- Epic 1: 项目初始化与基础设施
- Epic 2: 用户认证系统（用户模型、JWT 认证、角色权限）

### 相关模型定义
- User 模型：`backend-api/prisma/schema.prisma`
- Order 模型：`backend-api/prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used
glm-4.7 (Claude Code)

### Debug Log References
无调试日志引用。

### Completion Notes List
**Story 6.1 实现完成**

**实现时间**: 2026-01-15

**代码审查修复** (2026-01-15):
1. **HIGH - 路由冲突修复**: 将 @Get('stats') 端点移至 @Get(':id') 之前，防止 "stats" 被匹配为 :id 参数
2. **HIGH - 缓存删除修复**: 移除无效的通配符删除 'user:list:*'，改为精确删除 'user:stats'
3. **HIGH - 日期范围验证**: 添加 startDate > endDate 校验，抛出 BadRequestException
4. **MEDIUM - Swagger 认证**: 添加 @ApiBearerAuth() 装饰器用于文档化 JWT 认证
5. **MEDIUM - 日志格式**: 修复日志格式，使用 JSON.stringify(queryDto) 正确序列化对象
6. **MEDIUM - ParseIntPipe**: 使用 @Param('id', ParseIntPipe) 替代手动 parseInt
7. **MEDIUM - 类型断言移除**: 添加正确的返回类型注解 Promise<T>，移除类型断言
8. **测试修复**: 更新控制器测试以使用数字类型参数（适配 ParseIntPipe 行为）

**实现的功能**:
1. **用户列表查询 API (GET /api/v1/admin/users)**
   - 支持分页查询 (默认20条/页，最大50条)
   - 支持角色筛选 (PARENT, ADMIN)
   - 支持状态筛选 (ACTIVE, INACTIVE, BANNED)
   - 支持关键词搜索 (昵称或手机号)
   - 支持日期范围筛选 (注册开始/结束日期)
   - 手机号脱敏显示 (138****8000)
   - 包含用户订单统计 (订单数、总消费、最近下单时间)
   - 按 created_at 降序排序

2. **用户详情查询 API (GET /api/v1/admin/users/:id)**
   - 验证用户存在
   - 返回完整用户信息 (手机号不脱敏)
   - 包含用户订单统计
   - 404 错误处理

3. **用户状态更新 API (PATCH /api/v1/admin/users/:id/status)**
   - 支持状态转换 (ACTIVE ↔ INACTIVE ↔ BANNED)
   - 状态重复更新校验
   - 日期范围验证 (startDate 不能晚于 endDate)
   - 自动清除相关缓存 (user:detail:{userId}, user:stats)
   - 返回更新后的用户信息

4. **用户统计 API (GET /api/v1/admin/users/stats)**
   - 总用户数统计
   - 角色分布统计 (家长、管理员)
   - 状态分布统计 (活跃、未激活、已禁用)
   - 注册趋势统计 (今日、本周、本月)
   - 缓存优化 (TTL: 5分钟)

**技术实现细节**:
- 使用 Prisma 聚合查询统计用户订单信息
- 手机号脱敏: maskPhone() 方法 (保留前3位和后4位)
- Redis 缓存策略:
  - 用户详情: user:detail:{userId} (TTL: 5分钟)
  - 用户统计: user:stats (TTL: 5分钟)
  - 状态更新时清除相关缓存 (精确删除，不使用通配符)
- 权限保护: @Roles(Role.ADMIN) + AuthGuard('jwt')
- 参数验证: 使用 ParseIntPipe 进行 ID 参数转换和验证
- 日期验证: startDate 不能晚于 endDate
- Swagger 文档完整覆盖所有端点（包括 @ApiBearerAuth()）

**测试覆盖**:
- AdminUsersService: 16 个测试用例全部通过
- AdminUsersController: 12 个测试用例全部通过
- Users feature: 95 个测试用例全部通过

**文件清单**:
- ✅ `backend-api/src/features/users/admin-users.controller.ts`
- ✅ `backend-api/src/features/users/admin-users.controller.spec.ts`
- ✅ `backend-api/src/features/users/admin-users.service.ts`
- ✅ `backend-api/src/features/users/admin-users.service.spec.ts`
- ✅ `backend-api/src/features/users/dto/admin/query-users.dto.ts`
- ✅ `backend-api/src/features/users/dto/admin/user-list-response.dto.ts`
- ✅ `backend-api/src/features/users/dto/admin/user-detail-response.dto.ts`
- ✅ `backend-api/src/features/users/dto/admin/update-user-status.dto.ts`
- ✅ `backend-api/src/features/users/dto/admin/user-stats-response.dto.ts`
- ✅ `backend-api/src/features/users/users.module.ts` (已更新)

### File List

**New Files to Create:**
- `backend-api/src/features/users/admin-users.controller.ts`
- `backend-api/src/features/users/admin-users.controller.spec.ts`
- `backend-api/src/features/users/admin-users.service.ts`
- `backend-api/src/features/users/admin-users.service.spec.ts`
- `backend-api/src/features/users/dto/admin/query-users.dto.ts`
- `backend-api/src/features/users/dto/admin/user-list-response.dto.ts`
- `backend-api/src/features/users/dto/admin/user-detail-response.dto.ts`
- `backend-api/src/features/users/dto/admin/update-user-status.dto.ts`
- `backend-api/src/features/users/dto/admin/user-stats-response.dto.ts`

**Files to Modify:**
- `backend-api/src/features/users/users.module.ts` (导入 AdminUsersController 和 AdminUsersService)
- `backend-api/src/app.module.ts` (如果 UsersModule 未导入)

**Existing Files to Reference:**
- `backend-api/prisma/schema.prisma` (User 模型定义)
- `backend-api/src/features/orders/admin-orders.controller.ts` (参考管理员端点模式)
- `backend-api/src/features/products/admin-products.controller.ts` (参考管理员端点模式)
