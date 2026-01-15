# Story 6.2: 实现用户订单历史查询

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **管理员**,
I want **查看特定用户的完整订单历史**,
so that **我可以了解用户的消费习惯和预订行为**.

## Acceptance Criteria

1. **Given** Epic 1、Epic 2、Epic 4、Epic 6.1 已完成
2. **When** 在 AdminUsersController 中实现 GET /api/v1/admin/users/:id/orders 端点
3. **Then** 应用 @Roles(Role.ADMIN) 权限保护
4. **And** 验证用户存在
5. **When** 接收请求参数：
   - page: number (默认1)
   - pageSize: number (默认20)
   - status: OrderStatus? (可选)
   - startDate: string?
   - endDate: string?
6. **Then** 查询指定用户的所有订单
7. **And** 支持按状态和时间范围筛选
8. **And** 按 created_at 降序排序
9. **And** 返回分页订单列表，包含产品基本信息
10. **When** 实现 GET /api/v1/admin/users/:id/order-summary 端点
11. **Then** 返回用户订单汇总统计：
    - totalOrders: 总订单数
    - paidOrders: 已支付订单数
    - completedOrders: 已完成订单数
    - cancelledOrders: 已取消订单数
    - refundedOrders: 已退款订单数
    - totalSpent: 总消费金额
    - avgOrderAmount: 平均订单金额
    - firstOrderDate: 首次订单日期
    - lastOrderDate: 最后订单日期
    - favoriteCategory: 最常预订的分类 (id, name, orderCount)
    - monthlyStats: 最近6个月的订单趋势数组 (month, orders, amount)
12. **And** favoriteCategory 为预订次数最多的产品分类
13. **And** monthlyStats 包含最近6个月的订单趋势
14. **When** 实现 GET /api/v1/admin/users/:id/refunds 端点
15. **Then** 返回用户的所有退款申请记录
16. **And** 包含退款状态和金额统计
17. **And** 按申请时间降序排序

## Tasks / Subtasks

- [x] Task 1: 在 AdminUsersController 中添加用户订单列表查询端点 (AC: #2-#9)
  - [x] 1.1 创建 DTO `backend-api/src/features/users/dto/admin/query-user-orders.dto.ts`
    - page: number @IsOptional() @IsInt() @Min(1)
    - pageSize: number @IsOptional() @IsInt() @Min(1) @Max(50)
    - status: OrderStatus @IsOptional() @IsEnum(OrderStatus)
    - startDate: string @IsOptional() @IsDateString()
    - endDate: string @IsOptional() @IsDateString()
  - [x] 1.2 创建 DTO `backend-api/src/features/users/dto/admin/user-order-list-response.dto.ts`
    - id: number
    - orderNo: string
    - status: OrderStatus
    - paymentStatus: PaymentStatus
    - totalAmount: string (Decimal)
    - actualAmount: string (Decimal)
    - bookingDate: Date?
    - items: OrderItemResponseDto[] (产品基本信息)
    - paidAt: Date?
    - createdAt: Date
  - [x] 1.3 在 AdminUsersService 中实现 findUserOrders(userId, queryDto) 方法
    - 验证用户存在
    - 查询指定用户的订单（使用 userId 过滤）
    - 支持状态筛选 (status)
    - 支持日期范围筛选 (startDate, endDate)
    - 按 created_at 降序排序
    - 使用 Prisma 的分页：skip + take
    - 包含订单项 (items) 和产品基本信息
  - [x] 1.4 在 AdminUsersController 中实现 GET /api/v1/admin/users/:id/orders 端点
    - 应用 @Roles(Role.ADMIN) 权限保护
    - 使用 ParseIntPipe 转换 id 参数
    - 调用 AdminUsersService.findUserOrders()
  - [x] 1.5 添加 Swagger 文档装饰器
    - @ApiOperation({ summary: '查询用户订单历史' })
    - @ApiResponse({ type: UserOrderListResponseDto })
    - @ApiHeader({ name: 'Authorization', description: 'Bearer JWT 令牌' })

- [x] Task 2: 实现用户订单汇总统计 API (AC: #10-#13)
  - [x] 2.1 创建 DTO `backend-api/src/features/users/dto/admin/user-order-summary-response.dto.ts`
    - totalOrders: number
    - paidOrders: number
    - completedOrders: number
    - cancelledOrders: number
    - refundedOrders: number
    - totalSpent: string (Decimal)
    - avgOrderAmount: string (Decimal)
    - firstOrderDate: Date
    - lastOrderDate: Date
    - favoriteCategory: { id: number, name: string, orderCount: number }
    - monthlyStats: { month: string, orders: number, amount: string }[]
  - [x] 2.2 在 AdminUsersService 中实现 getUserOrderSummary(userId) 方法
    - 验证用户存在
    - 统计各状态订单数量（使用 Prisma groupBy 或 count）
    - 计算总消费金额（sum of actualAmount for paid orders）
    - 计算平均订单金额
    - 查询首次和最后订单日期
    - 统计最常预订的分类（join OrderItem → Product → ProductCategory，group by category）
    - 生成最近6个月的订单趋势数据
  - [x] 2.3 在 AdminUsersController 中实现 GET /api/v1/admin/users/:id/order-summary 端点
    - 应用 @Roles(Role.ADMIN) 权限保护
    - 使用 ParseIntPipe 转换 id 参数
    - 返回汇总统计数据
  - [x] 2.4 添加缓存优化
    - 缓存键：user:order-summary:{userId}
    - TTL: 5分钟
    - 用户有新订单时清除缓存
  - [x] 2.5 添加 Swagger 文档装饰器

- [x] Task 3: 实现用户退款记录查询 API (AC: #14-#17)
  - [x] 3.1 创建 DTO `backend-api/src/features/users/dto/admin/user-refund-list-response.dto.ts`
    - id: number
    - orderId: number
    - orderNo: string
    - amount: string (Decimal)
    - status: RefundStatus
    - reason: string?
    - requestedAt: Date
    - processedAt: Date?
  - [x] 3.2 在 AdminUsersService 中实现 findUserRefunds(userId) 方法
    - 验证用户存在
    - 查询指定用户的所有退款记录
    - 按申请时间降序排序
  - [x] 3.3 在 AdminUsersController 中实现 GET /api/v1/admin/users/:id/refunds 端点
    - 应用 @Roles(Role.ADMIN) 权限保护
    - 使用 ParseIntPipe 转换 id 参数
    - 返回退款记录列表
  - [x] 3.4 添加 Swagger 文档装饰器

- [x] Task 4: 添加单元测试 (AC: 全部)
  - [x] 4.1 在 AdminUsersService 测试中添加：
    - 测试用户订单列表查询（各种筛选条件）
    - 测试用户订单汇总统计计算
    - 测试用户退款记录查询
    - 测试用户不存在时的错误处理
  - [x] 4.2 在 AdminUsersController 测试中添加：
    - 测试所有新端点的路由和权限
    - 测试请求参数验证
    - Mock AdminUsersService
  - [x] 4.3 测试覆盖率要求
    - 至少 80% 代码覆盖率
    - 关键业务逻辑 100% 覆盖

- [x] Task 5: 添加 Swagger 文档 (AC: 全部)
  - [x] 5.1 为所有新端点添加 @ApiOperation() 描述
  - [x] 5.2 为所有新端点添加 @ApiResponse() 响应示例
  - [x] 5.3 为所有新 DTO 添加 @ApiProperty() 装饰器

## Dev Notes

### 功能概述
实现管理员查看特定用户订单历史的功能，包括订单列表查询（支持筛选、分页）、订单汇总统计和退款记录查询。这是 Epic 6 的第二个 Story，建立在 Story 6.1 用户信息查询的基础上，为用户行为分析和问题处理提供数据支持。

### 数据模型依赖
- **User 模型**（已在 Epic 2.1 创建）：
  - id: Int @id
  - orders: Order[] (关联订单)
  - refunds: RefundRecord[] (关联退款记录)

- **Order 模型**（已在 Epic 4.1 创建）：
  - id: Int @id
  - userId: Int (外键关联 User)
  - orderNo: String (订单号)
  - status: OrderStatus (订单状态)
  - paymentStatus: PaymentStatus (支付状态)
  - totalAmount: Decimal (订单总金额)
  - actualAmount: Decimal (实际支付金额)
  - bookingDate: DateTime? (预订日期)
  - paidAt: DateTime? (支付时间)
  - createdAt: DateTime (创建时间)
  - items: OrderItem[] (订单项)

- **OrderItem 模型**（已在 Epic 4.1 创建）：
  - id: Int @id
  - orderId: Int
  - productId: Int
  - productName: String (产品名称快照)
  - productPrice: Decimal (产品单价快照)
  - quantity: Int

- **Product 模型**（已在 Epic 3.1 创建）：
  - id: Int @id
  - categoryId: Int (外键关联 ProductCategory)
  - title: String (产品标题)

- **ProductCategory 模型**（已在 Epic 3.1 创建）：
  - id: Int @id
  - name: String (分类名称)

- **RefundRecord 模型**（已在 Epic 5.3 创建）：
  - id: Int @id
  - userId: Int (外键关联 User)
  - orderId: Int (外键关联 Order)
  - amount: Decimal (退款金额)
  - status: RefundStatus (退款状态)
  - reason: String? (退款原因)
  - createdAt: DateTime (申请时间)
  - processedAt: DateTime? (处理时间)

### API 端点设计
1. **GET /api/v1/admin/users/:id/orders** - 用户订单列表查询
   - 权限：@Roles(Role.ADMIN)
   - 参数：page, pageSize, status, startDate, endDate
   - 返回：分页订单列表（包含产品基本信息）

2. **GET /api/v1/admin/users/:id/order-summary** - 用户订单汇总统计
   - 权限：@Roles(Role.ADMIN)
   - 返回：订单统计数据、消费习惯、偏好分类

3. **GET /api/v1/admin/users/:id/refunds** - 用户退款记录查询
   - 权限：@Roles(Role.ADMIN)
   - 返回：退款申请列表（包含状态和金额）

### 关键业务逻辑
1. **订单查询**：
   - 必须验证用户存在
   - 使用 userId 精确匹配订单
   - 支持多条件组合筛选（状态、日期范围）
   - 包含订单项和产品基本信息（通过 OrderItem 关联）

2. **汇总统计**：
   - 订单数量统计：按 status 分组计数
   - 消费金额统计：只计算 paymentStatus = SUCCESS 的订单
   - 平均订单金额 = 总消费金额 / 已支付订单数
   - 最常预订分类：通过 OrderItem → Product → ProductCategory 关联，group by category，count desc 取第一条
   - 月度趋势：按日期截断到月份 (DATE_TRUNC('month', created_at))，group by month

3. **退款记录**：
   - 查询用户的所有 RefundRecord
   - 包含关联的 Order 信息（orderNo）
   - 按申请时间降序排序

### 缓存策略
- 用户订单汇总缓存：user:order-summary:{userId} (TTL: 5分钟)
- 退款记录不缓存（数据量小，实时性要求高）

### 错误处理
- 用户不存在：抛出 NotFoundException (404)
- 分页参数验证：使用 class-validator 自动验证
- 日期范围验证：startDate 不能晚于 endDate

## Project Structure Notes

### 文件组织
```
backend-api/src/features/users/
├── admin-users.controller.ts       # 管理员用户控制器 (添加新端点)
├── admin-users.controller.spec.ts  # 控制器测试 (添加新测试)
├── admin-users.service.ts          # 用户服务 (添加新方法)
├── admin-users.service.spec.ts     # 服务测试 (添加新测试)
└── dto/
    └── admin/
        ├── query-user-orders.dto.ts              # 用户订单查询 DTO (新建)
        ├── user-order-list-response.dto.ts       # 用户订单列表响应 DTO (新建)
        ├── user-order-summary-response.dto.ts    # 订单汇总响应 DTO (新建)
        └── user-refund-list-response.dto.ts      # 退款记录响应 DTO (新建)
```

### 模块依赖
- **依赖**：AuthModule（权限验证）、PrismaModule（数据库）、RedisModule（缓存）
- **被依赖**：无
- **导入到**：AppModule (已导入)

### 对齐现有模式
遵循 Story 5.2、6.1 管理员端点的模式：
- Controller 路由：`/api/v1/admin/users/:id/orders`
- 权限保护：`@Roles(Role.ADMIN)`
- 分页响应格式：`{ data: [], total, page, pageSize }`
- 参数验证：使用 ParseIntPipe 转换 ID 参数
- 错误处理：使用 NestJS 内置异常类

### 检测到的冲突或差异
无冲突。Story 6.2 扩展 AdminUsersController 的功能，添加订单相关查询端点。

## References

### Epic 需求来源
- [Epic 6: 用户管理与分析](../planning-artifacts/epics.md#epic-6-用户管理与分析-)
- [Story 6.2: 实现用户订单历史查询](../planning-artifacts/epics.md#story-62-实现用户订单历史查询)

### 架构文档
- [Architecture.md](../planning-artifacts/architecture.md) - 系统架构设计
  - 技术栈：NestJS + Prisma + PostgreSQL
  - API 设计：RESTful v1
  - 安全：JWT 认证、角色权限

### 项目上下文
- [project-context.md](../project-context.md) - 编码规范和反模式

### 前置 Story 依赖
- Epic 1: 项目初始化与基础设施
- Epic 2: 用户认证系统（用户模型、JWT 认证、角色权限）
- Epic 4: 预订与支付（订单模型、支付集成）
- Story 6.1: 管理员用户信息查询（AdminUsersController 基础）

### 相关模型定义
- User 模型：`backend-api/prisma/schema.prisma` (line 30-49)
- Order 模型：`backend-api/prisma/schema.prisma` (line 156-196)
- OrderItem 模型：`backend-api/prisma/schema.prisma` (line 199-218)
- Product 模型：`backend-api/prisma/schema.prisma` (line 73-104)
- ProductCategory 模型：`backend-api/prisma/schema.prisma` (line 59-70)
- RefundRecord 模型：`backend-api/prisma/schema.prisma` (line 250+)

### 参考代码
- `backend-api/src/features/users/admin-users.controller.ts` (Story 6.1 实现)
- `backend-api/src/features/users/admin-users.service.ts` (Story 6.1 实现)
- `backend-api/src/features/orders/admin-orders.controller.ts` (订单查询模式参考)

## Dev Agent Record

### Agent Model Used
glm-4.7 (Claude Code)

### Debug Log References
无调试日志引用。

### Completion Notes List
**Story 6.2 实现完成**

**实现时间**: 2026-01-15

**实现的功能**:
1. **用户订单列表查询 API (GET /api/v1/admin/users/:id/orders)**
   - 支持分页查询 (默认20条/页，最大50条)
   - 支持订单状态筛选
   - 支持日期范围筛选 (订单创建开始/结束日期)
   - 包含订单项和产品基本信息
   - 按 created_at 降序排序

2. **用户订单汇总统计 API (GET /api/v1/admin/users/:id/order-summary)**
   - 订单数量统计 (总数、已支付、已完成、已取消、已退款)
   - 消费金额统计 (总消费、平均订单金额)
   - 首次和最后订单日期
   - 最常预订分类统计
   - 最近6个月订单趋势数据
   - 缓存优化 (TTL: 5分钟)

3. **用户退款记录查询 API (GET /api/v1/admin/users/:id/refunds)**
   - 查询用户的所有退款申请记录
   - 包含订单号、退款金额、状态和原因
   - 按申请时间降序排序

**技术实现细节**:
- 使用 Prisma 聚合查询统计订单数据
- 使用原生 SQL 查询统计最常预订分类和月度趋势
- Redis 缓存策略:
  - 用户订单汇总: user:order-summary:{userId} (TTL: 5分钟)
- 权限保护: @Roles(Role.ADMIN) + AuthGuard('jwt')
- 参数验证: 使用 ParseIntPipe 进行 ID 参数转换和验证
- 日期验证: startDate 不能晚于 endDate
- Swagger 文档完整覆盖所有端点（包括 @ApiBearerAuth()）

**测试覆盖**:
- AdminUsersService: 28 个测试用例全部通过
- AdminUsersController: 12 个测试用例全部通过
- 总计: 40 个测试用例通过

**文件清单**:
- ✅ `backend-api/src/features/users/admin-users.controller.ts` (已修改)
- ✅ `backend-api/src/features/users/admin-users.service.ts` (已修改)
- ✅ `backend-api/src/features/users/dto/admin/query-user-orders.dto.ts` (新建)
- ✅ `backend-api/src/features/users/dto/admin/user-order-list-response.dto.ts` (新建)
- ✅ `backend-api/src/features/users/dto/admin/user-order-summary-response.dto.ts` (新建)
- ✅ `backend-api/src/features/users/dto/admin/user-refund-list-response.dto.ts` (新建)

### File List

**New Files to Create:**
- `backend-api/src/features/users/dto/admin/query-user-orders.dto.ts` ✅
- `backend-api/src/features/users/dto/admin/user-order-list-response.dto.ts` ✅
- `backend-api/src/features/users/dto/admin/user-order-summary-response.dto.ts` ✅
- `backend-api/src/features/users/dto/admin/user-refund-list-response.dto.ts` ✅

**Files to Modify:**
- `backend-api/src/features/users/admin-users.controller.ts` ✅ (添加新端点)
- `backend-api/src/features/users/admin-users.service.ts` ✅ (添加新方法)

**Existing Files to Reference:**
- `backend-api/prisma/schema.prisma` (User, Order, OrderItem, Product, ProductCategory, RefundRecord 模型定义)
- `backend-api/src/features/orders/admin-orders.controller.ts` (管理员订单查询模式)
- `backend-api/src/features/users/admin-users.controller.ts` (Story 6.1 实现)
