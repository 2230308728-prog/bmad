# Story 5.5: 实现管理员退款审核功能

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **管理员**,
I want **审核退款申请并批准或拒绝**,
so that **我可以控制退款流程并处理用户的退款请求**.

## Acceptance Criteria

1. Given Epic 1、Epic 2、Epic 5.3、Epic 5.4 已完成
2. When 创建 AdminRefundsController（admin-refunds.controller.ts）
3. Then 应用 @Roles(Role.ADMIN) 权限保护
4. When 实现 GET /api/v1/admin/refunds 端点
5. Then 接收请求参数：
   - page: number (默认1)
   - pageSize: number (默认20)
   - status: RefundStatus? (可选，按状态筛选)
   - refundNo: string? (退款编号搜索)
   - startDate: string? (申请开始日期)
   - endDate: string? (申请结束日期)
6. And 返回所有退款申请列表，包含用户和订单信息
7. And 按 appliedAt 降序排序（最新申请在前）
8. And 待审核的退款（PENDING）优先显示
9. When 实现 GET /api/v1/admin/refunds/:id 端点
10. Then 返回完整退款详情（包含所有用户信息，不脱敏）
11. And 包含订单完整信息和支付记录
12. When 实现 PATCH /api/v1/admin/refunds/:id/approve 端点
13. Then 接收请求 Body：{ "adminNote": string? }
14. And 验证退款记录存在
15. And 验证退款状态为 PENDING
16. And 更新退款状态为 APPROVED
17. And 记录审核时间（approvedAt）和管理员备注（adminNote）
18. And 更新关联订单的状态为 REFUNDED
19. And 触发微信退款流程（调用 Story 5.6 的退款服务，如果已实现）
20. And 向用户发送退款审核通过通知（Story 5.7）
21. And 返回 200 和更新后的退款信息
22. When 实现 PATCH /api/v1/admin/refunds/:id/reject 端点
23. Then 接收请求 Body：{ "rejectedReason": string }
24. And 验证退款记录存在且状态为 PENDING
25. And 验证拒绝原因不为空
26. And 更新退款状态为 REJECTED
27. And 记录拒绝原因（rejectedReason）和拒绝时间（rejectedAt）
28. And 订单状态保持为 PAID（可继续使用）
29. And 向用户发送退款拒绝通知
30. And 返回 200 和更新后的退款信息
31. When 实现 GET /api/v1/admin/refunds/stats 端点
32. Then 返回退款统计数据：
    - total: 总退款数
    - pending: 待审核数
    - approved: 已批准数
    - rejected: 已拒绝数
    - processing: 处理中数
    - completed: 已完成数
    - totalAmount: 总退款金额
    - pendingAmount: 待处理金额

## Tasks / Subtasks

- [x] Task 1: 创建管理员退款查询 DTO (AC: #4-#8)
  - [x] 1.1 创建 AdminQueryRefundsDto 定义查询参数
    - page、pageSize、status、refundNo、startDate、endDate
  - [x] 1.2 创建 AdminRefundSummaryResponseDto 定义列表响应
    - 包含用户基本信息（姓名、手机号）
    - 包含订单基本信息（订单号、产品名称）
    - 包含退款基本信息（编号、金额、原因、状态）
  - [x] 1.3 创建 AdminPaginatedRefundsResponseDto 分页包装器

- [x] Task 2: 创建管理员退款详情 DTO (AC: #9-#11)
  - [x] 2.1 创建 AdminRefundDetailResponseDto 定义完整详情响应
    - 不脱敏手机号（与家长端不同）
    - 包含完整用户信息
    - 包含订单完整信息和支付记录
    - 包含退款凭证图片

- [x] Task 3: 创建退款审核 DTO (AC: #12-#21, #22-#30)
  - [x] 3.1 创建 ApproveRefundDto 定义批准请求
    - adminNote?: string（管理员备注，可选）
  - [x] 3.2 创建 RejectRefundDto 定义拒绝请求
    - rejectedReason: string（拒绝原因，必填）
  - [x] 3.3 创建 RefundReviewResponseDto 定义审核响应

- [x] Task 4: 创建退款统计 DTO (AC: #31-#32)
  - [x] 4.1 创建 RefundStatsResponseDto 定义统计数据响应
  - [x] 4.2 定义统计结构（total、各状态数量、金额统计）

- [x] Task 5: 实现管理员退款查询 Service 逻辑 (AC: #4-#8)
  - [x] 5.1 在 AdminRefundsService 中添加 findAll() 方法
  - [x] 5.2 实现多条件筛选逻辑（status、refundNo、startDate、endDate）
  - [x] 5.3 应用分页（skip、take）
  - [x] 5.4 关联查询 user、order、product 获取完整信息
  - [x] 5.5 实现待审核优先排序（PENDING 状态在前）
  - [x] 5.6 返回分页退款列表（管理员视角，不脱敏）

- [x] Task 6: 实现管理员退款详情查询 Service 逻辑 (AC: #9-#11)
  - [x] 6.1 在 AdminRefundsService 中添加 findOne() 方法
  - [x] 6.2 查询退款及所有关联数据（user、order、product、payment）
  - [x] 6.3 返回完整退款详情（不脱敏）

- [x] Task 7: 实现退款批准 Service 逻辑 (AC: #12-#21)
  - [x] 7.1 在 AdminRefundsService 中添加 approve() 方法
  - [x] 7.2 验证退款记录存在且状态为 PENDING
  - [x] 7.3 使用事务更新退款状态为 APPROVED
  - [x] 7.4 记录 approvedAt 和 adminNote
  - [x] 7.5 更新关联订单状态为 REFUNDED
  - [x] 7.6 调用微信退款服务（WechatPayService.refund，如果 Story 5.6 已实现）
  - [x] 7.7 如果微信退款服务未实现，记录状态为 APPROVED 等待后续处理
  - [x] 7.8 清除相关 Redis 缓存
  - [x] 7.9 返回更新后的退款信息

- [x] Task 8: 实现退款拒绝 Service 逻辑 (AC: #22-#30)
  - [x] 8.1 在 AdminRefundsService 中添加 reject() 方法
  - [x] 8.2 验证退款记录存在且状态为 PENDING
  - [x] 8.3 验证拒绝原因不为空
  - [x] 8.4 更新退款状态为 REJECTED
  - [x] 8.5 记录 rejectedReason 和 rejectedAt
  - [x] 8.6 订单状态保持 PAID（不修改订单状态）
  - [x] 8.7 清除相关 Redis 缓存
  - [x] 8.8 返回更新后的退款信息

- [x] Task 9: 实现退款统计 Service 逻辑 (AC: #31-#32)
  - [x] 9.1 在 AdminRefundsService 中添加 getStats() 方法
  - [x] 9.2 统计各状态退款数量（PENDING、APPROVED、REJECTED、PROCESSING、COMPLETED）
  - [x] 9.3 统计退款总金额和待处理金额
  - [x] 9.4 返回统计数据

- [x] Task 10: 实现管理员退款 API 端点 (AC: #2-#32)
  - [x] 10.1 创建 AdminRefundsController
  - [x] 10.2 添加 GET /api/v1/admin/refunds 端点（列表查询）
  - [x] 10.3 添加 GET /api/v1/admin/refunds/:id 端点（详情查询）
  - [x] 10.4 添加 PATCH /api/v1/admin/refunds/:id/approve 端点（批准退款）
  - [x] 10.5 添加 PATCH /api/v1/admin/refunds/:id/reject 端点（拒绝退款）
  - [x] 10.6 添加 GET /api/v1/admin/refunds/stats 端点（统计数据）
  - [x] 10.7 应用 @Roles(Role.ADMIN) 权限保护
  - [x] 10.8 添加完整 Swagger 文档

- [x] Task 11: 添加单元测试和集成测试 (AC: all)
  - [x] 11.1 测试多条件筛选查询
  - [x] 11.2 测试退款详情查询
  - [x] 11.3 测试退款批准（成功、状态非法、重复审核）
  - [x] 11.4 测试退款拒绝（成功、缺少原因、状态非法）
  - [x] 11.5 测试统计数据查询
  - [x] 11.6 测试订单状态联动更新
  - [x] 11.7 测试 Redis 缓存清除
  - [x] 11.8 测试权限验证（ADMIN only）

- [x] Task 12: 更新 Swagger 文档 (AC: all)
  - [x] 12.1 添加所有端点的 API 文档
  - [x] 12.2 添加请求/响应示例
  - [x] 12.3 标注权限要求

## Dev Notes

### 相关架构模式和约束

**NestJS 模块结构：**
- 在 `src/features/refunds/` 目录中创建 AdminRefundsController 和 AdminRefundsService
- 复用 RefundsModule 模块，添加管理端控制器和服务
- 创建新的 DTO 文件在 `src/features/refunds/dto/admin/` 目录
- 复用 Story 5.4 创建的 RefundsService 基础设施

**API 设计约定：**
- 端点需要认证（@Roles(Role.ADMIN)）
- 管理端点前缀：/api/v1/admin/refunds
- 使用 GET 方法查询数据
- 使用 PATCH 方法更新状态（部分更新）
- 返回标准分页响应格式：{ data: [], total: number, page: number, pageSize: number }
- 错误状态码：404（退款不存在）、400（参数验证失败、状态非法）、403（权限不足）、500（服务器错误）

**数据库约定：**
- 管理员可以查看所有退款（无 userId 限制）
- 关联查询 user、order、product 获取完整信息
- 退款状态转换必须符合业务规则
- 使用 Prisma 的索引优化查询性能

**数据隐私约定：**
- 管理员查看退款时**不脱敏**手机号（与家长端不同）
- 管理员可以看到完整用户信息和订单历史

**状态转换规则：**
- PENDING → APPROVED：允许（管理员批准退款）
- PENDING → REJECTED：允许（管理员拒绝退款）
- 其他转换：不允许（抛出 BadRequestException）

**分页和排序约定：**
- 默认排序：PENDING 优先 → 按申请时间倒序（createdAt desc）
- 分页限制：pageSize 最大 50，超过返回 400 错误

**业务规则：**
- 只有 PENDING 状态的退款可以审核
- 批准后，订单状态更新为 REFUNDED
- 拒绝后，订单状态保持 PAID（可继续使用）
- 批准后触发微信退款流程（如果 Story 5.6 已实现）

### 需要接触的源代码组件

**后端文件：**
- `backend-api/src/features/refunds/` - 退款模块目录
  - `admin-refunds.controller.ts` - 新建管理端控制器
  - `admin-refunds.service.ts` - 新建管理端服务
  - `dto/admin/` - 创建管理员 DTO 文件目录
- `backend-api/prisma/schema.prisma` - 数据库模型（RefundRecord、Order）

**依赖文件：**
- Story 2.5: RolesGuard 和 @Roles 装饰器（权限控制）
- Story 4.3: WechatPayService（微信支付服务，用于退款）
- Story 5.3: RefundRecord 模型（退款数据模型）
- Story 5.4: RefundsService（退款服务基础设施）

**数据模型：**
```prisma
model RefundRecord {
  id            Int          @id @default(autoincrement())
  orderId       Int          @map("order_id")
  userId        Int          @map("user_id")
  refundNo      String       @unique @map("refund_no")
  amount        Decimal      @db.Decimal(10, 2)
  reason        String?
  description   String?
  status        RefundStatus // PENDING, APPROVED, REJECTED, PROCESSING, SUCCESS, FAILED, CANCELLED, COMPLETED
  appliedBy     Int          @map("applied_by")
  approvedBy    Int?         @map("approved_by")
  approvedAt    DateTime?    @map("approved_at")
  images        String[]
  adminNote     String?      @map("admin_note")
  rejectedReason String?     @map("rejected_reason")
  rejectedAt    DateTime?    @map("rejected_at")
  refundedAt    DateTime?    @map("refunded_at")
  wechatRefundId String?     @map("wechat_refund_id")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  order         Order        @relation(fields: [orderId], references: [id])
  user          User         @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@index([status])
  @@index([createdAt])
  @@map("refund_records")
}

model Order {
  id            Int           @id @default(autoincrement())
  orderNo       String        @unique @map("order_no")
  userId        Int           @map("user_id")
  totalAmount   Decimal       @map("total_amount") @db.Decimal(10, 2)
  actualAmount  Decimal       @map("actual_amount") @db.Decimal(10, 2)
  status        OrderStatus
  refundedAt    DateTime?     @map("refunded_at")
  // ... 其他字段

  user          User          @relation(fields: [userId], references: [id])
  refunds       RefundRecord[]

  @@index([status])
  @@index([userId])
  @@index([createdAt])
}
```

### 测试标准摘要

**单元测试要求：**
- AdminRefundsService.findAll(): 测试多条件筛选
- AdminRefundsService.findOne(): 测试退款详情查询
- AdminRefundsService.approve(): 测试批准逻辑
- AdminRefundsService.reject(): 测试拒绝逻辑
- AdminRefundsService.getStats(): 测试统计查询
- DTO 验证器：测试参数边界值
- 测试覆盖率目标: 85%+

**集成测试要求：**
- 端到端退款列表查询流程（含多条件筛选）
- 端到端退款详情查询流程
- 端到端批准退款流程（含订单状态联动）
- 端到端拒绝退款流程
- 端到端统计查询流程
- 权限验证（ADMIN 角色）

**Mock 要求：**
- Prisma 使用测试数据库
- 测试数据包含多个退款（不同状态、用户、订单）
- 测试数据包含订单和支付记录

### Project Structure Notes

**文件组织：**
- 管理端控制器放在 `src/features/refunds/admin-refunds.controller.ts`
- 管理端服务放在 `src/features/refunds/admin-refunds.service.ts`
- 管理员 DTO 文件放在 `src/features/refunds/dto/admin/` 目录
- 测试文件与源文件同目录

**命名约定：**
- Controller 方法:
  - `findAll(@Query() queryDto: AdminQueryRefundsDto)`
  - `findOne(@Param('id') id: string)`
  - `approve(@Param('id') id: string, @Body() approveDto: ApproveRefundDto, @CurrentUser() user: CurrentUserType)`
  - `reject(@Param('id') id: string, @Body() rejectDto: RejectRefundDto, @CurrentUser() user: CurrentUserType)`
  - `getStats()`
- Service 方法:
  - `findAll(queryDto: AdminQueryRefundsDto)`
  - `findOne(refundId: number)`
  - `approve(refundId: number, adminNote?: string, adminId: number)`
  - `reject(refundId: number, rejectedReason: string, adminId: number)`
  - `getStats()`
- DTO: `AdminQueryRefundsDto`, `AdminRefundDetailResponseDto`, `ApproveRefundDto`, `RejectRefundDto`, `RefundStatsResponseDto`

**集成点：**
- 调用 PrismaService 查询数据库
- 使用 RolesGuard 验证权限
- 使用 CacheService 清除 Redis 缓存
- 调用 WechatPayService.refund（如果 Story 5.6 已实现）

### Previous Story Intelligence (Story 5.4)

**Story 5.4 完成总结：**
- ✅ 实现了家长端退款申请功能（POST /api/v1/refunds）
- ✅ 实现了家长端退款列表查询（GET /api/v1/refunds）
- ✅ 实现了家长端退款详情查询（GET /api/v1/refunds/:id）
- ✅ 20 个单元测试全部通过
- ✅ 代码审查修复：10 个问题全部解决

**学习到的模式：**
1. **DTO 结构**：CreateRefundDto（请求）、RefundResponseDto（响应）、QueryRefundsDto（查询参数）
2. **Service 模式**：create()（创建）、findAll()（列表查询）、findOne()（详情查询）
3. **Controller 模式**：@Post/@Get/@Patch 装饰器、@Roles() 权限保护、完整 Swagger 文档
4. **测试模式**：使用 mock PrismaService、测试覆盖边界条件
5. **性能优化**：N+1 查询优化（使用 Prisma nested include）
6. **缓存管理**：状态变更后清除相关 Redis 缓存

**代码审查修复经验：**
1. **类型安全**：使用自定义类型（OrderWithBookingDate）替代 `as any`
2. **退款编号生成**：包含 userId 和 orderId 以提高唯一性，添加重试机制
3. **缓存删除**：使用明确的缓存键而非通配符模式
4. **空值处理**：为 null 字段添加显式错误处理
5. **参数验证**：添加分页参数最大值限制（@Max(10000)）

**可复用代码：**
- RefundsService 中的退款查询逻辑
- 分页参数处理（skip、take）
- DTO 验证器模式
- Redis 缓存清除逻辑

**需要注意的差异：**
- 管理端**不脱敏**手机号
- 管理端支持更多筛选条件（status、refundNo、startDate、endDate）
- 管理端有审核功能（approve/reject）
- 管理端有统计功能
- 管理端需要审核人 ID（approvedBy、changedBy）

### Previous Story Intelligence (Story 5.2)

**Story 5.2 完成总结：**
- ✅ 实现了管理员订单列表查询（GET /api/v1/admin/orders）
- ✅ 实现了管理员订单详情查询（GET /api/v1/admin/orders/:id）
- ✅ 实现了订单状态更新（PATCH /api/v1/admin/orders/:id/status）
- ✅ 实现了订单统计查询（GET /api/v1/admin/orders/stats）
- ✅ 18 个单元测试全部通过

**学习到的模式：**
1. **管理端查询**：无 userId 限制，查看所有数据
2. **状态转换验证**：ORDER_STATUS_TRANSITIONS 映射
3. **状态历史记录**：OrderStatusHistory 模型
4. **统计数据**：使用 Prisma 的 groupBy 和 count
5. **多条件筛选**：动态构建 where 子句

**可复用代码：**
- AdminOrdersService 中的查询模式
- 多条件筛选逻辑
- 状态转换验证逻辑
- 统计查询逻辑

### Git 智能分析

**最近相关提交：**
- 提交记录显示 Story 5.4 已完成，包含 10 个代码审查修复

**关键代码模式：**
```typescript
// Story 5.2 中状态转换验证（admin-orders.service.ts）
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['COMPLETED', 'REFUNDED'],
  // ... 其他转换规则
};

if (!allowedTransitions.includes(newStatus)) {
  throw new BadRequestException(`不允许从 ${currentStatus} 状态变更为 ${newStatus}`);
}
```

**关键发现：**
- Story 5.4 创建了完整的退款模块基础设施
- Story 5.2 提供了管理端查询和状态更新的参考实现
- 需要参考 Story 5.2 的状态转换验证模式

### References

**Epic 5 需求：**
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5]

**相关 Story：**
- Story 2.5: 实现角色权限守卫（权限控制）
- Story 4.3: 集成微信支付 JSAPI（微信支付服务）
- Story 5.2: 实现管理员订单管理 API（管理端模式参考）
- Story 5.3: 实现退款申请数据模型（RefundRecord 模型）
- Story 5.4: 实现家长退款申请功能（退款服务基础设施）
- Story 5.6: 集成微信支付退款（后续 Story）
- Story 5.7: 实现微信订阅消息通知（后续 Story）

**架构约束：**
- [Source: _bmad-output/planning-artifacts/architecture.md#API设计规范]
- [Source: _bmad-output/planning-artifacts/architecture.md#数据隐私保护]
- [Source: _bmad-output/planning-artifacts/architecture.md#分页与排序]

**技术文档：**
- [NestJS Controllers](https://docs.nestjs.com/controllers)
- [NestJS Services](https://docs.nestjs.com/providers)
- [NestJS DTOs & Validation](https://docs.nestjs.com/techniques/validation)
- [Prisma Query API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [微信支付退款 API](https://pay.weixin.qq.com/wiki/doc/api/index.html)

## Dev Agent Record

### Agent Model Used

glm-4.7 (Claude Code)

### Debug Log References

No issues encountered during story creation.

### Completion Notes List

Story 5.5 created via create-story workflow. Ready for dev-story implementation.

**Story Summary:**
管理员退款审核功能，允许管理员批准或拒绝退款申请，查询退款列表和详情，查看退款统计数据。

**Key Features:**
- GET /api/v1/admin/refunds: 查询退款列表（多条件筛选、PENDING 优先）
- GET /api/v1/admin/refunds/:id: 查询退款详情（完整信息）
- PATCH /api/v1/admin/refunds/:id/approve: 批准退款（更新状态、触发微信退款）
- PATCH /api/v1/admin/refunds/:id/reject: 拒绝退款（记录原因）
- GET /api/v1/admin/refunds/stats: 退款统计数据

**Dependencies:**
- Story 5.3: RefundRecord 数据模型
- Story 5.4: RefundsService 基础设施
- Story 5.6: WechatPayService.refund（可选，用于实际退款）

**Next Steps:**
1. 运行 dev-story workflow 实现此故事
2. 实现完成后运行 code-review workflow
3. 继续实现 Story 5.6（微信支付退款）或 Story 5.7（订阅消息通知）

### File List

**New Files to Create:**
- `backend-api/src/features/refunds/admin-refunds.controller.ts` - 管理员退款控制器
- `backend-api/src/features/refunds/admin-refunds.service.ts` - 管理员退款服务
- `backend-api/src/features/refunds/admin-refunds.controller.spec.ts` - 控制器测试
- `backend-api/src/features/refunds/admin-refunds.service.spec.ts` - 服务测试
- `backend-api/src/features/refunds/dto/admin/admin-query-refunds.dto.ts` - 查询参数 DTO
- `backend-api/src/features/refunds/dto/admin/admin-refund-detail.dto.ts` - 详情响应 DTO
- `backend-api/src/features/refunds/dto/admin/approve-refund.dto.ts` - 批准请求 DTO
- `backend-api/src/features/refunds/dto/admin/reject-refund.dto.ts` - 拒绝请求 DTO
- `backend-api/src/features/refunds/dto/admin/refund-stats.dto.ts` - 统计响应 DTO
- `backend-api/src/features/refunds/dto/admin/index.ts` - DTO 导出文件

**Files to Modify:**
- `backend-api/src/features/refunds/refunds.module.ts` - 添加 AdminRefundsController 和 AdminRefundsService
