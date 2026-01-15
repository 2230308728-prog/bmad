# Story 6.5: 实现数据看板 - 热门产品和转化分析

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **管理员**,
I want **查看热门产品排行和转化率分析**,
So that **我可以优化产品策略和营销方案**.

## Acceptance Criteria

1. **Given** Epic 1、Epic 2、Epic 3、Epic 4、Epic 6.4 已完成
2. **When** 在 DashboardController 中实现 GET /api/v1/admin/dashboard/popular-products 端点
3. **Then** 接收请求参数：
   - period: 'week' | 'month' | 'all' (默认 'week')
   - limit: number (默认10，最大50)
4. **And** 返回热门产品排行：
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
5. **And** 按 orders 降序排序
6. **And** conversionRate = (orders / views) × 100
7. **And** avgRating 来自用户评价（如果实现了评价系统）
8. **When** 实现 GET /api/v1/admin/dashboard/conversion-funnel 端点
9. **Then** 返回转化漏斗分析：
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
10. **And** overallConversion = 完成支付用户数 / 浏览产品用户数 × 100
11. **And** dropoffs 显示每个环节流失的用户数和百分比
12. **When** 实现 GET /api/v1/admin/dashboard/user-retention 端点
13. **Then** 返回用户留存分析：
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
14. **And** cohortAnalysis 按注册周期分组
15. **And** retention 返回留存率百分比
16. **When** 实现 GET /api/v1/admin/dashboard/product-performance/:id 端点
17. **Then** 返回单个产品的详细表现数据：
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
18. **And** trend 数据按日期排序
19. **And** demographics 分析参与儿童的年龄分布
20. **And** 所有统计数据缓存到 Redis（TTL: 10分钟）

## Tasks / Subtasks

- [x] Task 1: 扩展 Dashboard DTO 结构 (AC: #3-#4, #8-#9, #12-#13, #16-#17)
  - [x] 1.1 创建 `backend-api/src/features/dashboard/dto/popular-products-query.dto.ts`
    - period: 'week' | 'month' | 'all'
    - limit: number (默认10，最大50)
    - 添加 @IsOptional(), @IsEnum(), @Min(), @Max() 验证
  - [x] 1.2 创建 `backend-api/src/features/dashboard/dto/popular-products-response.dto.ts`
    - PopularProductDto: id, title, image, category, price, orders, amount, views, conversionRate, avgRating, rank
    - PopularProductsSummaryDto: totalOrders, totalAmount, avgConversionRate
    - PopularProductsResponseDto: period, products[], summary
  - [x] 1.3 创建 `backend-api/src/features/dashboard/dto/conversion-funnel-response.dto.ts`
    - FunnelStageDto: stage, users, percentage
    - FunnelDropoffDto: stage, users, percentage
    - ConversionFunnelResponseDto: period, funnel[], overallConversion, dropoffs[]
  - [x] 1.4 创建 `backend-api/src/features/dashboard/dto/user-retention-response.dto.ts`
    - CohortRetentionDto: period, newUsers, retention (day1, day7, day30)
    - AvgRetentionDto: day1, day7, day30
    - UserRetentionResponseDto: cohortAnalysis[], avgRetention
  - [x] 1.5 创建 `backend-api/src/features/dashboard/dto/product-performance-response.dto.ts`
    - ProductPerformanceStatsDto: totalViews, totalOrders, totalRevenue, conversionRate, avgOrderValue, cancelRate, refundRate
    - ProductTrendDto: last7Days[], last30Days[]
    - DemographicsDto: avgAge, ageDistribution[]
    - ProductPerformanceResponseDto: product, stats, trend, demographics

- [x] Task 2: 实现热门产品排行接口 (AC: #2-#7)
  - [x] 2.1 在 DashboardService 中实现 getPopularProducts(query) 方法
    - 根据 period 计算时间范围
    - 使用 Prisma 的 groupBy 和 aggregate 统计产品订单数
    - 关联 Product 和 ProductCategory 获取产品信息
    - 计算 conversionRate = (orders / views) × 100
    - 按 orders 降序排序，应用 limit 限制
    - 计算汇总数据（totalOrders, totalAmount, avgConversionRate）
    - 添加 rank 排名
  - [x] 2.2 在 DashboardController 中实现 GET /popular-products 端点
    - 使用 @Query(ValidationPipe) 验证参数
    - 调用 DashboardService.getPopularProducts()
    - 添加 Swagger 文档
    - 数据缓存到 Redis（TTL: 10分钟）

- [x] Task 3: 实现转化漏斗分析接口 (AC: #8-#11)
  - [x] 3.1 在 DashboardService 中实现 getConversionFunnel(period) 方法
    - 统计四个阶段的用户数：
      - 浏览产品：唯一浏览产品的用户数
      - 查看详情：唯一查看产品详情的用户数
      - 创建订单：唯一创建订单的用户数
      - 完成支付：唯一完成支付的用户数
    - 计算每个阶段的转化率（相对于第一阶段）
    - 计算总体转化率 overallConversion
    - 计算每个环节的流失用户数和百分比
  - [x] 3.2 在 DashboardController 中实现 GET /conversion-funnel 端点
    - 接收 period 参数：'week' | 'month' | 'all'
    - 调用 DashboardService.getConversionFunnel()
    - 添加 Swagger 文档
    - 数据缓存到 Redis（TTL: 10分钟）

- [x] Task 4: 实现用户留存分析接口 (AC: #12-#15)
  - [x] 4.1 在 DashboardService 中实现 getUserRetention() 方法
    - 按注册周期（周）分组用户
    - 计算每个队列的留存率：day1, day7, day30
    - day1: 注册后第1天有订单的用户比例
    - day7: 注册后第7天有订单的用户比例
    - day30: 注册后第30天有订单的用户比例
    - 计算平均留存率
  - [x] 4.2 在 DashboardController 中实现 GET /user-retention 端点
    - 调用 DashboardService.getUserRetention()
    - 添加 Swagger 文档
    - 数据缓存到 Redis（TTL: 10分钟）

- [x] Task 5: 实现产品表现详情接口 (AC: #16-#19)
  - [x] 5.1 在 DashboardService 中实现 getProductPerformance(productId) 方法
    - 统计产品的总浏览量、订单数、收入
    - 计算转化率和平均订单价值
    - 统计取消率和退款率
    - 生成最近7天和30天的趋势数据
    - 分析参与儿童的年龄分布（从订单参与者数据）
  - [x] 5.2 在 DashboardController 中实现 GET /product-performance/:id 端点
    - 验证产品存在
    - 调用 DashboardService.getProductPerformance()
    - 添加 Swagger 文档
    - 数据缓存到 Redis（TTL: 10分钟）

- [x] Task 6: 更新缓存常量 (AC: #20)
  - [x] 6.1 更新 DashboardService 缓存 TTL 常量
    - 添加 STATS_CACHE_TTL_SECONDS = 600 (10分钟)
    - 区分概览缓存（5分钟）和统计缓存（10分钟）
  - [x] 6.2 为新接口实现缓存
    - popular-products: 缓存键 `dashboard:products:popular:{period}:{limit}`
    - conversion-funnel: 缓存键 `dashboard:conversion:funnel:{period}`
    - user-retention: 缓存键 `dashboard:user:retention`
    - product-performance: 缓存键 `dashboard:product:performance:{id}`

- [x] Task 7: 添加单元测试 (AC: 全部)
  - [x] 7.1 在 DashboardService 测试中添加：
    - 测试热门产品统计正确性
    - 测试转化漏斗计算逻辑
    - 测试用户留存率计算
    - 测试产品表现数据聚合
    - 测试缓存功能
    - Mock PrismaService 和 CacheService
  - [x] 7.2 在 DashboardController 测试中添加：
    - 测试所有新端点的路由和权限
    - 测试请求参数验证（limit 边界值）
    - 测试响应格式
  - [x] 7.3 测试覆盖率要求
    - 至少 80% 代码覆盖率
    - 统计计算逻辑 100% 覆盖

- [x] Task 8: 添加 Swagger 文档 (AC: 全部)
  - [x] 8.1 为所有新端点添加 @ApiOperation() 描述
  - [x] 8.2 为所有新端点添加 @ApiResponse() 响应示例
  - [x] 8.3 为所有新 DTO 添加 @ApiProperty() 装饰器

## Dev Notes

### 功能概述
实现管理后台数据看板的高级分析功能，为管理员提供热门产品排行、转化漏斗分析、用户留存分析和产品表现详情。这是 Epic 6 的第五个 Story，建立在 Story 6.4 的基础上，提供更深度的数据洞察。

### 数据模型依赖

**依赖的已完成 Story：**
- Epic 1: 项目初始化与基础设施（DashboardModule 已创建）
- Epic 2: 用户认证系统（User 模型、角色权限）
- Epic 3: 产品发现与管理（Product、ProductCategory 模型）
- Epic 4: 预订与支付（Order、OrderItem 模型，支付状态）
- Story 6.4: Dashboard 核心统计功能（DashboardController, DashboardService）

**关键数据模型：**
- **User 模型**（Epic 2.1）：id, created_at, children（参与者信息）
- **Product 模型**（Epic 3.1）：id, title, image, price, category_id
- **ProductCategory 模型**（Epic 3.1）：id, name
- **Order 模型**（Epic 4.1）：id, user_id, status, total_amount, created_at
- **OrderItem 模型**（Epic 4.1）：id, order_id, product_id, quantity, price

### 关键实现细节

**热门产品排行计算：**
```typescript
// 使用 Prisma 的 groupBy 和 include 关联
const productStats = await this.prisma.orderItem.groupBy({
  by: ['product_id'],
  where: {
    order: {
      created_at: { gte: startDate },
      status: { in: ['PAID', 'COMPLETED'] }
    }
  },
  _count: { order_id: true },
  _sum: { price: true },
  orderBy: { _count: { order_id: 'desc' } }
});

// 计算转化率
const conversionRate = (orders / views) * 100;
```

**转化漏斗阶段：**
1. 浏览产品：统计 ProductView 表（如果存在）或估算
2. 查看详情：统计访问产品详情页的唯一用户
3. 创建订单：统计 Order 表的 created_at 记录
4. 完成支付：统计 Order 表的 status = 'PAID' | 'COMPLETED'

**用户留存计算：**
```typescript
// 按注册周分组
const cohorts = await this.prisma.user.findMany({
  where: { created_at: { gte: cohortStart } },
  select: { id: true, created_at: true }
});

// 计算留存率
for (const cohort of cohorts) {
  const day1Retention = await this.calculateRetention(cohort.users, 1);
  const day7Retention = await this.calculateRetention(cohort.users, 7);
  const day30Retention = await this.calculateRetention(cohort.users, 30);
}
```

**缓存策略差异：**
- 概览数据（Story 6.4）：5分钟 TTL - 需要较高实时性
- 统计数据（Story 6.5）：10分钟 TTL - 相对稳定，计算成本高

### 模块设计

**DashboardModule 扩展：**
- **无需修改**：模块结构已完整（Story 6.4）
- **扩展内容**：在 DashboardService 中添加 4 个新方法
- **依赖不变**：AuthModule, PrismaModule, CacheModule

#### 对齐现有模式
遵循 Story 6.4 的代码模式：
- Controller 路由：`/api/v1/admin/dashboard`
- 权限保护：`@Roles(Role.ADMIN)`
- 统一响应格式：`{ data: {...} }`
- 参数验证：ValidationPipe + class-validator
- 缓存策略：统计数据缓存 10 分钟（常量 `STATS_CACHE_TTL_SECONDS = 600`）
- 日志记录：管理员操作日志
- 错误处理：使用 NestJS 内置异常类

### 检测到的冲突或差异
无冲突。Story 6.5 扩展现有 Dashboard 功能，复用已建立的架构和模式。

### Previous Story Intelligence (Story 6.4)

**从 Story 6.4 学到的经验（代码审查修复）：**

1. **性能优化：使用 SQL 聚合**
   ```typescript
   // ✅ 正确：使用 $queryRaw 进行数据库层面聚合
   const stats = await this.prisma.$queryRaw`
     SELECT category, COUNT(*) as orders, SUM(amount) as total
     FROM orders GROUP BY category
   `;

   // ❌ 错误：加载所有数据到内存再聚合
   const orders = await this.prisma.order.findMany();
   const stats = orders.reduce(...); // 内存消耗大
   ```

2. **常量化管理**
   ```typescript
   // ✅ 正确：使用常量
   private readonly STATS_CACHE_TTL_SECONDS = 600;
   private readonly BUSINESS_HOURS_START = 9;
   private readonly BUSINESS_HOURS_END = 22;
   ```

3. **Date 对象安全操作**
   ```typescript
   // ✅ 正确：避免突变
   const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

   // ❌ 错误：突变原始对象
   const now = new Date();
   const todayStart = new Date(now.setHours(0, 0, 0, 0)); // now 被修改
   ```

4. **缓存实现**
   ```typescript
   // ✅ 正确：完整实现缓存清除
   async clearStatsCache(): Promise<void> {
     const cacheKeys = ['dashboard:overview', 'dashboard:revenue:breakdown'];
     for (const key of cacheKeys) {
       await this.cacheService.del(key);
     }
   }
   ```

5. **类型安全测试**
   ```typescript
   // ✅ 正确：使用类型断言修复测试
   const result = await service.getOverview() as any;
   expect(result.today.orders).toBe(25);
   ```

**代码模式参考：**
- DashboardService: `backend-api/src/features/dashboard/dashboard.service.ts`
  - 使用 `CACHE_TTL_SECONDS = 300` 常量
  - 使用 `$queryRaw` 进行复杂聚合
  - 并行查询优化（Promise.all）
- DashboardController: `backend-api/src/features/dashboard/dashboard.controller.ts`
  - 统一的端点结构和 Swagger 文档
  - @Roles(Role.ADMIN) 权限保护

**测试模式：**
- Service 测试：Mock PrismaService (`$queryRaw`, `groupBy`, `aggregate`)
- Controller 测试：Mock Service，验证端点调用
- 测试覆盖率：至少 80%

### Git Intelligence

**最近相关提交（Story 6.4 相关）：**
1. `f26b5ef` - fix: 应用 Story 6.4 代码审查修复
   - 实现了 `clearStatsCache()` 方法
   - 优化 `getRevenueBreakdown()` 使用 `$queryRaw`
   - 添加业务小时常量

2. `bb83e3e` - docs: Story 6.4 代码审查完成，状态更新为 done
   - 13 个测试全部通过
   - TypeScript 编译通过

**可复用的代码模式：**
- Dashboard 模块结构已建立，直接扩展
- 缓存模式已验证，可直接复用
- 测试模式已验证，直接参考 Story 6.4 测试文件

### 项目上下文引用

**技术栈约束（来自 project-context.md）：**
- NestJS (TypeScript strict mode)
- Prisma 5.x（使用 `$queryRaw` 进行复杂查询）
- Redis 7.x（缓存统计数据）
- class-validator（DTO 验证）

**关键规则：**
- 使用 `@ApiProperty({ enum: [...] })` 文档化枚举
- 使用 `as any` 类型断言修复测试类型问题
- 缓存 TTL 使用常量管理
- 避免在循环中执行数据库查询（使用 `$queryRaw` 聚合）

### References

#### Epic 需求来源
- [Epic 6: 用户管理与分析](../planning-artifacts/epics.md#epic-6-用户管理与分析-)
- [Story 6.5: 实现数据看板 - 热门产品和转化分析](../planning-artifacts/epics.md#story-65-实现数据看板---热门产品和转化分析)

#### 架构文档
- [Architecture.md](../planning-artifacts/architecture.md) - 系统架构设计
  - Redis 缓存策略（TTL、失效模式）
  - 统计数据的性能考虑

#### 项目上下文
- [project-context.md](../project-context.md) - 编码规范和反模式
  - TypeScript 严格模式规则
  - 测试文件组织
  - 命名约定

#### 前置 Story 依赖
- Epic 1: 项目初始化与基础设施（DashboardModule）
- Epic 2: 用户认证系统（User 模型、JWT 认证）
- Epic 3: 产品发现与管理（Product、ProductCategory）
- Epic 4: 预订与支付（Order、OrderItem）
- Story 6.4: Dashboard 核心统计功能（基础架构）

#### 相关模型定义
- User 模型：`backend-api/prisma/schema.prisma`
- Product 模型：`backend-api/prisma/schema.prisma`
- Order 模型：`backend-api/prisma/schema.prisma`
- OrderItem 模型：`backend-api/prisma/schema.prisma`

#### 参考代码
- `backend-api/src/features/dashboard/dashboard.service.ts` (Story 6.4 - 缓存、聚合模式)
- `backend-api/src/features/dashboard/dashboard.controller.ts` (Story 6.4 - 端点模式)
- `backend-api/src/features/dashboard/dashboard.service.spec.ts` (Story 6.4 - 测试模式)

## Dev Agent Record

### Agent Model Used

_待实现时填写_

### Debug Log References

_实现过程中的调试日志引用_

### Completion Notes List

_Story 实现完成时的总结_

### File List

**New Files to Create:**
- `backend-api/src/features/dashboard/dto/popular-products-query.dto.ts` (新建)
- `backend-api/src/features/dashboard/dto/popular-products-response.dto.ts` (新建)
- `backend-api/src/features/dashboard/dto/conversion-funnel-response.dto.ts` (新建)
- `backend-api/src/features/dashboard/dto/user-retention-response.dto.ts` (新建)
- `backend-api/src/features/dashboard/dto/product-performance-response.dto.ts` (新建)

**Files to Modify:**
- `backend-api/src/features/dashboard/dashboard.service.ts` (扩展：添加 4 个新方法)
- `backend-api/src/features/dashboard/dashboard.controller.ts` (扩展：添加 4 个新端点)
- `backend-api/src/features/dashboard/dashboard.service.spec.ts` (扩展：添加新测试)
- `backend-api/src/features/dashboard/dashboard.controller.spec.ts` (扩展：添加新测试)

**Existing Files to Reference:**
- `backend-api/prisma/schema.prisma` (User、Product、Order 模型定义)
- `backend-api/src/features/dashboard/dashboard.service.ts` (Story 6.4 实现参考)
- `backend-api/src/features/dashboard/dashboard.controller.ts` (Story 6.4 实现参考)
