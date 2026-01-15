# Story 5.6: 集成微信支付退款

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **系统**,
I want **处理微信支付退款请求**,
so that **用户的款项可以原路退回到微信账户**.

## Acceptance Criteria

1. Given Epic 1、Epic 2、Epic 4.3、Epic 5.3 已完成
2. When 在 WechatPayService 中添加退款方法
3. Then 实现退款方法：refund(orderNo, refundNo, amount, reason)
4. And 调用微信支付退款接口：
   - 商户订单号（order_no）
   - 商户退款单号（refund_no）
   - 退款金额（单位：分）
   - 退款原因
5. When 退款请求成功提交
6. Then 更新退款状态为 PROCESSING
7. And 记录微信退款单号（wechat_refund_id）
8. And 返回成功
9. When 实现 POST /api/v1/refunds/payment/notify 端点
10. Then 接收微信退款回调通知
11. And 验证签名和数据完整性
12. When 退款状态为 SUCCESS
13. Then 根据 refund_no 查询退款记录
14. And 更新退款状态为 COMPLETED
15. And 记录完成时间
16. And 释放订单对应的库存（如果有）
17. And 向用户发送退款完成通知
18. And 返回成功响应给微信
19. When 退款状态为 ABNORMAL（异常）
20. Then 更新退款状态为 FAILED
21. And 记录失败原因
22. And 向用户发送退款失败通知
23. And 告知管理员手动处理
24. When 退款状态为 PROCESSING（处理中）
25. Then 不更新状态，等待后续回调
26. And 返回成功响应
27. When 退款请求失败（网络错误、参数错误等）
28. Then 更新退款状态为 FAILED
29. And 记录错误日志
30. And 告知管理员需要手动重试
31. And 实现手动重试端点：POST /api/v1/admin/refunds/:id/retry
32. And 退款金额必须 <= 订单原支付金额
33. And 退款必须在支付完成后365天内进行（微信限制）

## Tasks / Subtasks

- [ ] Task 1: 扩展 WechatPayService 添加退款方法 (AC: #2-#8)
  - [ ] 1.1 添加 refund() 方法到 WechatPayService
    - 参数：orderNo, refundNo, amount, reason
    - 调用微信支付退款 API v3
  - [ ] 1.2 处理退款请求成功提交
    - 更新退款状态为 PROCESSING
    - 记录微信退款单号 wechatRefundId
  - [ ] 1.3 处理退款请求失败场景
    - 网络错误、参数错误
    - 更新退款状态为 FAILED
    - 记录详细错误日志
  - [ ] 1.4 验证退款金额 <= 订单原支付金额
  - [ ] 1.5 验证退款在支付完成后365天内（微信限制）

- [ ] Task 2: 实现微信退款回调处理端点 (AC: #9-#26)
  - [ ] 2.1 创建 POST /api/v1/refunds/payment/notify 端点
    - 无需认证（微信服务器调用）
  - [ ] 2.2 验证微信退款回调签名
  - [ ] 2.3 解密退款回调数据
  - [ ] 2.4 处理退款成功状态（SUCCESS）
    - 查询退款记录
    - 更新状态为 COMPLETED
    - 记录完成时间 refundedAt
  - [ ] 2.5 处理退款异常状态（ABNORMAL）
    - 更新状态为 FAILED
    - 记录失败原因
  - [ ] 2.6 处理退款处理中状态（PROCESSING）
    - 不更新状态，等待后续回调
  - [ ] 2.7 实现幂等性处理（重复回调）
  - [ ] 2.8 返回正确的 XML 响应给微信

- [ ] Task 3: 实现管理员手动重试退款功能 (AC: #31)
  - [ ] 3.1 创建 POST /api/v1/admin/refunds/:id/retry 端点
    - 应用 @Roles(Role.ADMIN) 权限保护
  - [ ] 3.2 验证退款记录存在
  - [ ] 3.3 验证退款状态为 FAILED
  - [ ] 3.4 重新调用 WechatPayService.refund()
  - [ ] 3.5 更新退款状态和重试次数
  - [ ] 3.6 记录重试操作日志

- [ ] Task 4: 集成退款流程到 AdminRefundsService (AC: #2-#8)
  - [ ] 4.1 在 AdminRefundsService.approve() 中调用退款服务
    - 检查 WechatPayService.refund 是否已实现
    - 如果已实现，自动调用退款
    - 如果未实现，记录状态为 APPROVED 等待后续处理
  - [ ] 4.2 处理退款服务调用失败场景
    - 记录错误但保持 APPROVED 状态
    - 标记需要管理员手动重试
  - [ ] 4.3 清除相关 Redis 缓存

- [ ] Task 5: 添加退款 DTO 和响应类型 (AC: all)
  - [ ] 5.1 创建 WechatRefundRequestDto
    - orderNo, refundNo, amount, reason
  - [ ] 5.2 创建 WechatRefundResponseDto
    - 包含退款状态、微信退款单号
  - [ ] 5.3 创建 RefundNotifyDto
    - 微信回调数据结构
  - [ ] 5.4 创建 RetryRefundDto（如果需要）

- [ ] Task 6: 实现退款状态查询功能 (AC: all)
  - [ ] 6.1 在 WechatPayService 中添加 queryRefund() 方法
    - 查询退款状态
    - 主动刷新退款记录状态
  - [ ] 6.2 实现定时任务（可选）
    - 定期查询 PROCESSING 状态的退款
    - 自动更新超时未回调的退款

- [ ] Task 7: 添加单元测试和集成测试 (AC: all)
  - [ ] 7.1 测试退款方法成功场景
  - [ ] 7.2 测试退款方法失败场景（网络错误、参数错误）
  - [ ] 7.3 测试退款回调处理（SUCCESS、ABNORMAL、PROCESSING）
  - [ ] 7.4 测试幂等性处理（重复回调）
  - [ ] 7.5 测试手动重试功能
  - [ ] 7.6 测试退款金额验证
  - [ ] 7.7 测试退款期限验证（365天）
  - [ ] 7.8 测试签名验证和数据完整性

- [ ] Task 8: 更新 Swagger 文档 (AC: all)
  - [ ] 8.1 添加退款回调端点文档
  - [ ] 8.2 添加手动重试端点文档
  - [ ] 8.3 标注端点为外部调用（微信服务器）

## Dev Notes

### 相关架构模式和约束

**NestJS 模块结构：**
- 在 `src/features/refunds/` 目录中扩展 WechatPayService
- 在 `src/features/payments/` 目录中的 WechatPayService 添加退款方法
- 创建 RefundNotifyController 处理退款回调
- 更新 AdminRefundsService 集成退款流程

**API 设计约定：**
- 退款回调端点无需认证（微信服务器直接调用）
- 管理员重试端点需要 @Roles(Role.ADMIN) 权限保护
- 退款回调端点路径：/api/v1/refunds/payment/notify
- 管理员重试端点路径：/api/v1/admin/refunds/:id/retry

**微信支付退款 API 规范：**
- API 版本：v3
- 退款接口：POST https://api.mch.weixin.qq.com/v3/refund/domestic/refunds
- 请求参数：
  - out_trade_no: 商户订单号
  - out_refund_no: 商户退款单号
  - amount: 退款金额（单位：分）
  - reason: 退款原因
- 回调通知：
  - 退款状态：SUCCESS（成功）、ABNORMAL（异常）、PROCESSING（处理中）
  - 回调需验证签名和解密数据
- 退款限制：
  - 退款金额不能超过支付金额
  - 退款必须在支付后365天内进行
  - 部分退款支持（多次退款累计不超过总支付金额）

**数据库约定：**
- RefundRecord.wechatRefundId: 存储微信退款单号
- RefundRecord.status 状态转换：
  - APPROVED → PROCESSING（退款提交成功）
  - PROCESSING → COMPLETED（退款成功）
  - PROCESSING → FAILED（退款失败）
  - APPROVED → FAILED（退款请求失败）

**业务规则：**
- 只有 APPROVED 状态的退款可以调用微信退款接口
- 退款成功后不释放库存（订单已取消，库存不恢复）
- 退款失败需要管理员手动重试或线下处理
- 退款回调处理需要幂等性（重复回调不重复处理）

### 需要接触的源代码组件

**后端文件：**
- `backend-api/src/features/payments/wechat-pay.service.ts` - 添加退款方法
- `backend-api/src/features/refunds/admin-refunds.service.ts` - 集成退款流程
- `backend-api/src/features/refunds/refund-notify.controller.ts` - 退款回调控制器（新建）
- `backend-api/src/features/refunds/dto/` - 退款相关 DTO

**依赖文件：**
- Story 4.3: WechatPayService（微信支付服务基础）
- Story 5.3: RefundRecord 模型（退款数据模型）
- Story 5.5: AdminRefundsService（管理员退款审核）

**数据模型：**
```prisma
model RefundRecord {
  id            Int          @id @default(autoincrement())
  refundNo      String       @unique @map("refund_no")
  status        RefundStatus // PENDING, APPROVED, REJECTED, PROCESSING, SUCCESS, FAILED, COMPLETED
  wechatRefundId String?     @map("wechat_refund_id") // 微信退款单号
  refundedAt    DateTime?    @map("refunded_at")    // 退款完成时间
  // ... 其他字段
}
```

### 测试标准摘要

**单元测试要求：**
- WechatPayService.refund(): 测试退款请求成功和失败场景
- RefundNotifyController: 测试回调处理（SUCCESS、ABNORMAL、PROCESSING）
- 签名验证和数据完整性测试
- 幂等性处理测试（重复回调）
- 退款金额验证测试
- 退款期限验证测试（365天）
- 手动重试功能测试

**集成测试要求：**
- 端到端退款流程（批准 → 提交退款 → 回调处理）
- 退款失败后手动重试流程
- 退款状态同步查询（定时任务）

**Mock 要求：**
- Mock wechatpay-node-v3 SDK 的退款接口
- Mock 微信回调请求
- 测试数据包含多种退款状态

### Project Structure Notes

**文件组织：**
- 微信支付服务放在 `src/features/payments/wechat-pay.service.ts`
- 退款回调控制器放在 `src/features/refunds/refund-notify.controller.ts`
- 管理员重试功能放在 `src/features/refunds/admin-refunds.controller.ts`

**命名约定：**
- Service 方法:
  - `refund(orderNo: string, refundNo: string, amount: number, reason: string)`
  - `queryRefund(refundNo: string)`
- Controller 端点:
  - `POST /api/v1/refunds/payment/notify`（退款回调）
  - `POST /api/v1/admin/refunds/:id/retry`（手动重试）
- DTO: `WechatRefundRequestDto`, `WechatRefundResponseDto`, `RefundNotifyDto`

**集成点：**
- 调用 WechatPayService.refund() 执行退款
- 接收微信退款回调通知并更新状态
- AdminRefundsService.approve() 自动触发退款流程

### Previous Story Intelligence (Story 5.5)

**Story 5.5 完成总结：**
- ✅ 实现了管理员退款审核功能（APPROVE/REJECT）
- ✅ 实现了退款列表查询和详情查询
- ✅ 实现了退款统计数据
- ✅ 25 个单元测试全部通过
- ✅ 代码审查修复：5 个问题全部解决

**学习到的模式：**
1. **DTO 结构**：管理员 DTO 不脱敏数据，家长 DTO 脱敏手机号
2. **Service 模式**：使用事务确保数据一致性（approve 更新 RefundRecord 和 Order）
3. **Controller 模式**：@Roles(Role.ADMIN) 权限保护，完整 Swagger 文档
4. **测试模式**：Mock PrismaService、测试覆盖边界条件
5. **缓存管理**：状态变更后清除相关 Redis 缓存

**代码审查修复经验：**
1. **路由顺序**：@Get('stats') 必须在 @Get(':id') 之前
2. **类型安全**：使用 AdminQueryRefundsDto 替代 any 类型
3. **TODO 注释**：将 TODO 替换为 NOTE 注释，说明后续 Story 的职责
4. **事务使用**：Prisma.$transaction 确保原子操作
5. **Schema 字段**：不存在的字段（如 refundedAt）不能写入

**可复用代码：**
- AdminRefundsService 中的退款查询逻辑
- 多条件筛选逻辑（status、refundNo、startDate、endDate）
- Redis 缓存清除模式

**需要注意的差异：**
- 微信退款有独立的回调通知端点
- 退款状态需要轮询或通过回调更新
- 退款失败需要手动重试机制
- 退款金额有验证限制

### Previous Story Intelligence (Story 4.3)

**Story 4.3 完成总结：**
- ✅ 集成了 wechatpay-node-v3 SDK
- ✅ 实现了微信支付统一下单（createJsapiOrder）
- ✅ 实现了 JSAPI 支付参数生成（generateJsapiParams）
- ✅ 实现了支付订单查询（queryOrder）
- ✅ 15 个单元测试全部通过

**学习到的模式：**
1. **SDK 集成**：使用 wechatpay-node-v3 SDK 封装微信支付 API v3
2. **RSA 签名**：生成 JSAPI 支付参数时使用 RSA 签名
3. **商户私钥**：从文件系统读取商户私钥
4. **金额转换**：元 → 分（× 100）
5. **环境变量**：WECHAT_PAY_* 配置项

**可复用代码：**
- WechatPayService 基础设施（wxpay 实例、签名、验证）
- 环境变量配置模式
- 微信支付 API 调用错误处理

**需要扩展：**
- WechatPayService.refund() 方法
- WechatPayService.queryRefund() 方法
- 退款回调验证和解密

### Git 智能分析

**最近相关提交：**
- 最新提交：8198add feat: 实现管理员退款审核功能 (Story 5.5) + 代码审查修复
- 提交记录显示 Story 5.5 已完成，包含管理员退款审核功能

**关键代码模式：**
```typescript
// Story 5.5 中 approve() 方法的注释说明
// NOTE: 微信退款流程将在 Story 5.6 中实现
// 当前实现：退款状态已更新为 APPROVED，订单状态已更新为 REFUNDED
// 后续实现：调用 WechatPayService.refund() 执行实际退款到用户微信账户
```

**关键发现：**
- Story 5.5 已经预留了 Story 5.6 的集成点
- AdminRefundsService.approve() 中有 TODO 注释说明需要调用退款服务
- WechatPayService 已在 Story 4.3 中实现基础功能
- 需要在 WechatPayService 中添加 refund() 和 queryRefund() 方法

### References

**Epic 5 需求：**
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5]

**相关 Story：**
- Story 4.3: 集成微信支付 JSAPI（微信支付服务基础）
- Story 5.3: 实现退款申请数据模型（RefundRecord 模型）
- Story 5.4: 实现家长退款申请功能（退款服务基础设施）
- Story 5.5: 实现管理员退款审核功能（需要调用 Story 5.6 的退款服务）
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
- [wechatpay-node-v3 SDK](https://github.com/wechatpay-apiv3/wechatpay-node-v3)

## Dev Agent Record

### Agent Model Used

glm-4.7 (Claude Code)

### Debug Log References

No issues encountered during story creation.

### Completion Notes List

Story 5.6 created via create-story workflow. Ready for dev-story implementation.

**Story Summary:**
集成微信支付退款功能，实现自动退款到用户微信账户，包括退款申请提交、退款回调处理、状态同步、手动重试等功能。

**Key Features:**
- WechatPayService.refund(): 提交退款请求到微信
- POST /api/v1/refunds/payment/notify: 处理微信退款回调
- 退款状态管理：PROCESSING → COMPLETED/FAILED
- POST /api/v1/admin/refunds/:id/retry: 管理员手动重试失败退款
- WechatPayService.queryRefund(): 主动查询退款状态
- 幂等性处理：重复回调不重复处理

**Dependencies:**
- Story 4.3: WechatPayService（微信支付服务基础）
- Story 5.3: RefundRecord 模型（退款数据模型）
- Story 5.5: AdminRefundsService.approve()（调用退款服务）

**Next Steps:**
1. 运行 dev-story workflow 实现此故事
2. 实现完成后运行 code-review workflow
3. 继续实现 Story 5.7（微信订阅消息通知）

### File List

**New Files to Create:**
- `backend-api/src/features/refunds/refund-notify.controller.ts` - 退款回调控制器
- `backend-api/src/features/refunds/refund-notify.controller.spec.ts` - 测试文件
- `backend-api/src/features/refunds/dto/wechat-refund.dto.ts` - 微信退款 DTO
- `backend-api/src/features/refunds/dto/refund-notify.dto.ts` - 退款回调 DTO
- `backend-api/src/features/refunds/dto/retry-refund.dto.ts` - 手动重试 DTO

**Files to Modify:**
- `backend-api/src/features/payments/wechat-pay.service.ts` - 添加 refund() 和 queryRefund() 方法
- `backend-api/src/features/payments/wechat-pay.service.spec.ts` - 添加退款测试
- `backend-api/src/features/refunds/admin-refunds.controller.ts` - 添加 retry 端点
- `backend-api/src/features/refunds/admin-refunds.service.ts` - 集成退款流程到 approve()
- `backend-api/src/features/refunds/refunds.module.ts` - 导入 RefundNotifyController
- `backend-api/src/features/refunds/admin-refunds.service.spec.ts` - 添加重试测试
