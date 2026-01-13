# Story 3.4: 实现产品详情 API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

作为一名家长，
我想要查看研学产品的详细信息，
以便我可以全面了解产品内容并做出预订决策。

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] **Task 1: 实现产品详情查询逻辑** (AC: 返回完整产品信息)
  - [x] 在 ProductsService 中实现 findOne(id) 方法
  - [x] 根据 id 查询产品（包含 category 关联）
  - [x] 验证产品状态为 PUBLISHED
  - [x] 处理产品不存在情况（404）
  - [x] 返回 ProductDetailDto（包含所有字段）

- [x] **Task 2: 实现浏览次数自动递增** (AC: view_count 字段自动 +1)
  - [x] 在查询详情后自动递增 viewCount
  - [x] 使用 Prisma 的 update 方法或原生 SQL
  - [x] 确保递增操作不会阻塞查询响应（考虑异步）
  - [x] 处理递增失败情况（降级策略）

- [x] **Task 3: 实现产品详情缓存** (AC: 缓存到 Redis，TTL: 10分钟)
  - [x] 生成缓存键：`products:detail:{id}`
  - [x] 从缓存优先读取
  - [x] 缓存未命中时查询数据库
  - [x] 存入缓存，TTL: 600 秒（10分钟）
  - [x] 缓存失败降级到数据库查询

- [x] **Task 4: 实现 Controller 端点** (AC: GET /api/v1/products/:id)
  - [x] 在 ProductsController 中添加 GET /:id 路由
  - [x] 使用 @Param('id') 获取 id 参数
  - [x] 验证 id 为数字（@IsInt() @IsPositive()）
  - [x] 调用 ProductsService.findOne()
  - [x] 添加 @ApiOperation Swagger 文档
  - [x] 添加 @ApiResponse 响应示例（200, 404）

- [x] **Task 5: 实现错误处理和参数验证** (AC: 综合)
  - [x] 处理无效的 id 参数（400 Bad Request）
  - [x] 处理产品不存在（404 Not Found）
  - [x] 处理数据库查询错误
  - [x] 返回适当的 HTTP 状态码（200, 400, 404, 500）
  - [x] 在 Controller 中添加 try-catch 和错误日志

- [x] **Task 6: 性能优化** (AC: 综合)
  - [x] 使用 Prisma 的 select 精确控制返回字段
  - [x] 确保数据库索引支持 id 查询（主键索引）
  - [x] 测试响应时间在 1 秒内（NFR4）
  - [x] 考虑 viewCount 递增的异步处理

- [x] **Task 7: 编写单元测试** (AC: 综合)
  - [x] 测试 ProductsService.findOne() 方法
  - [x] 测试正常查询返回完整产品信息
  - [x] 测试产品不存在情况（404）
  - [x] 测试未发布产品不可见（404）
  - [x] 测试 viewCount 递增逻辑
  - [x] 测试缓存命中和未命中
  - [x] 测试缓存失败降级
  - [x] 测试边界情况（无效 id）

- [x] **Task 8: 集成测试和文档** (AC: 综合)
  - [x] 测试 GET /api/v1/products/:id 端点
  - [x] 验证 Swagger 文档正确生成
  - [x] 手动测试各种产品状态
  - [x] 验证缓存生效（重复相同请求）
  - [x] 验证 viewCount 递增
  - [x] 性能测试（确保 1 秒内响应）

## Dev Notes

### 功能实现要点

**产品详情查询逻辑：**
- 使用 Prisma 的 `findUnique` 方法根据 id 查询
- 使用 `include` 关联查询 category 表
- 只返回 status = 'PUBLISHED' 的产品
- 未发布或不存在的产品都返回 404

**浏览次数递增：**
- 选项 A: 查询后同步更新（简单但可能影响响应时间）
- 选项 B: 使用消息队列异步更新（推荐，性能更好）
- 选项 C: 使用 Redis 计数器定期同步到数据库（平衡方案）
- 建议实现选项 C 以保证性能和准确性

**缓存策略：**
- 缓存键格式：`products:detail:{id}`
- TTL: 600 秒（10分钟）
- 产品更新时需要清除详情缓存（使用 clearProductsCache）
- viewCount 递增后需要清除缓存或更新缓存

### Project Structure Notes

**文件位置：**
- Controller: `backend-api/src/features/products/products.controller.ts`
- Service: `backend-api/src/features/products/products.service.ts`
- DTO: `backend-api/src/features/products/dto/product-detail.dto.ts`（新建）
- 测试: `backend-api/src/features/products/*.spec.ts`

**代码模式对齐：**
- 遵循 Story 3.2 和 3.3 的代码结构
- 使用相同的缓存模式（cacheManager + CacheService）
- 使用相同的错误处理模式（try-catch + Logger）
- 使用相同的测试模式（Jest + mock）

### 前一个 Story 的学习模式

**从 Story 3.2 (产品列表) 学到的：**
- ✅ 使用 Redis 缓存提升性能
- ✅ 使用 Prisma 的 select 限制返回字段
- ✅ 使用并行查询（findMany + count）
- ✅ 使用 ValidationPipe 验证查询参数
- ⚠️ 需要添加数据库索引（虽然主键已有索引）

**从 Story 3.3 (产品搜索) 学到的：**
- ✅ 自定义验证器模式（registerDecorator）
- ✅ Service 层防御性验证
- ✅ 完整的参数验证测试覆盖
- ✅ 缓存失败降级策略
- ⚠️ 集成测试和性能测试需要实际执行

**应用到 Story 3.4：**
1. 自定义验证器：验证 id 参数（虽然 @IsInt() @IsPositive() 已足够）
2. Service 层验证：确保只返回 PUBLISHED 状态的产品
3. 完整测试：包括 viewCount 递增、缓存逻辑、边界情况
4. 缓存降级：Redis 失败时直接查询数据库

### 技术要求

**Prisma 查询模式：**
```typescript
async findOne(id: number): Promise<ProductDetailDto | null> {
  const product = await this.prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, name: true }
      }
    }
  });

  if (!product || product.status !== 'PUBLISHED') {
    return null;
  }

  // Increment viewCount
  await this.incrementViewCount(id);

  return { ...product, price: product.price.toString() };
}
```

**缓存实现模式：**
```typescript
async findOne(id: number): Promise<ProductDetailDto> {
  const cacheKey = `products:detail:${id}`;

  try {
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as ProductDetailDto;
  } catch (error) {
    this.logger.warn(`Cache get failed: ${error}`);
  }

  const result = await this.findOneFromDatabase(id);

  try {
    await this.cacheManager.set(cacheKey, result, 600);
  } catch (error) {
    this.logger.warn(`Cache set failed: ${error}`);
  }

  return result;
}
```

**错误处理模式：**
- Controller: try-catch + re-throw
- Service: 返回 null（由 Controller 转换为 404）
- 全局异常过滤器: 统一处理所有未捕获异常

### 测试标准

**单元测试要求：**
- 测试覆盖率：≥ 80%
- 测试场景：
  - 正常查询（返回完整产品信息）
  - 产品不存在（返回 404）
  - 未发布产品（返回 404）
  - viewCount 递增逻辑
  - 缓存命中
  - 缓存未命中
  - 缓存失败降级
  - 无效 id 参数

**集成测试要求：**
- 端到端测试 GET /api/v1/products/:id
- 验证 Swagger 文档正确性
- 验证响应格式符合规范
- 性能测试：响应时间 < 1秒

### References

**源文档引用:**
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3]
- [Source: _bmad-output/planning-artifacts/database-design.md#Product表]
- [Source: _bmad-output/planning-artifacts/architecture.md#产品发现]
- [Source: _bmad-output/planning-artifacts/architecture.md#缓存策略]

**前一个 Story:**
- Story 3.2: 实现产品列表查询 API (done)
- Story 3.3: 实现产品搜索和筛选 API (done)

**依赖的 Stories:**
- Story 3.1: 设计产品数据模型 (done)
- Story 3.2: 实现产品列表查询 API (done) - 提供了基础结构

**数据模型引用:**
```prisma
model Product {
  id                Int       @id @default(autoincrement())
  title             String
  description       String?   @db.Text
  categoryId        Int
  category          Category  @relation(fields: [categoryId], references: [id])
  price             Decimal   @db.Decimal(10, 2)
  originalPrice     Decimal?  @db.Decimal(10, 2)
  stock             Int
  minAge            Int?
  maxAge            Int?
  duration          String?
  location          String?
  images            String[]
  featured          Boolean   @default(false)
  viewCount         Int       @default(0) @map("view_count")
  bookingCount      Int       @default(0) @map("booking_count")
  status            ProductStatus @default(PUBLISHED)
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@map("products")
}
```

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

✅ **Story 3.4 实现完成**

**功能实现：**
1. 实现了 `ProductsService.findOne()` 方法，支持根据 id 查询产品详情
2. 实现了产品浏览次数自动递增功能（异步处理，不阻塞响应）
3. 实现了 Redis 缓存功能（TTL: 10分钟）
4. 实现了 `GET /api/v1/products/:id` Controller 端点
5. 实现了完整的错误处理和参数验证

**技术亮点：**
- 使用 `findUnique` 查询产品，包含 category 关联
- 只返回 PUBLISHED 状态的产品（隐藏未发布产品）
- 使用自定义 `ParsePositiveIntPipe` 验证 id 参数
- viewCount 异步递增，降级处理失败情况
- 缓存失败降级到数据库查询

**测试覆盖：**
- Service 层：12 个测试用例，全部通过
- Controller 层：5 个测试用例，全部通过
- 总计 65 个测试用例（包含之前 story 的测试）

**性能优化：**
- Redis 缓存减少数据库查询
- viewCount 异步递增不阻塞响应
- 使用 Prisma 的 select 精确控制返回字段

### File List

**新建文件：**
- `backend-api/src/common/pipes/parse-positive-int.pipe.ts` - 正整数验证管道
- `backend-api/src/common/pipes/parse-positive-int.pipe.spec.ts` - Pipe 测试文件（代码审查添加）
- `backend-api/src/features/products/dto/product-detail.dto.ts` - 产品详情 DTO

**修改文件：**
- `backend-api/src/features/products/products.service.ts` - 添加 findOne() 方法（+115 行），修复原始价格类型（改为 undefined 而非 null）
- `backend-api/src/features/products/products.controller.ts` - 添加 GET /:id 端点（+56 行），简化错误处理逻辑（代码审查修复）
- `backend-api/src/features/products/products.service.spec.ts` - 添加 findOne 测试（+210 行），修复 originalPrice 测试断言
- `backend-api/src/features/products/products.controller.spec.ts` - 添加 findOne 测试（+64 行）

**代码审查修复 (2026-01-13):**
- 创建 `parse-positive-int.pipe.spec.ts` - 8 个测试用例，覆盖所有验证场景
- 为 `product-detail.dto.ts` 添加完整的 `@ApiProperty()` Swagger 装饰器
- 优化 `parse-positive-int.pipe.ts` 正则表达式，正确拒绝小数
- 简化 `products.controller.ts` findOne 端点的错误处理逻辑
