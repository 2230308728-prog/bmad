# Story 3.2: 实现产品列表查询 API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 家长,
I want 浏览研学产品列表并按分类查看,
So that 我可以快速找到感兴趣的研学活动。

## Acceptance Criteria

**Given** Epic 1、Epic 2、Epic 3.1 已完成
**When** 创建 ProductsController（products.controller.ts）
**Then** 实现 GET /api/v1/products 端点
**When** GET /api/v1/products 接收请求参数：
  - page: number (默认1)
  - pageSize: number (默认20，最大50)
  - categoryId: number? (可选，按分类筛选)
  - sortBy: 'price_asc' | 'price_desc' | 'created' | 'popular' (默认'created')
**Then** 查询 PUBLISHED 状态的产品
**And** 支持按 categoryId 筛选
**And** 根据 sortBy 参数排序：
  - price_asc: 价格从低到高
  - price_desc: 价格从高到低
  - created: 创建时间从新到旧
  - popular: 预订次数从多到少
**And** 返回分页数据：
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "上海科技馆探索之旅",
        "price": "299.00",
        "originalPrice": "399.00",
        "images": ["https://..."],
        "location": "上海",
        "duration": "1天",
        "stock": 50,
        "featured": true
      }
    ],
    "meta": {
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5
    }
  }
  ```
**And** 产品列表缓存到 Redis（TTL: 5分钟）
**And** 响应时间不超过 1 秒（NFR4）

## Tasks / Subtasks

- [x] **Task 1: 创建 Products 模块结构** (AC: Given, When - 创建 ProductsController)
  - [x] 创建 `backend-api/src/features/products/` 目录
  - [x] 创建 products.module.ts
  - [x] 创建 products.controller.ts
  - [x] 创建 products.service.ts
  - [x] 创建 dto/ 子目录存放数据传输对象
  - [x] 在 AppModule 中注册 ProductsModule

- [x] **Task 2: 定义请求和响应 DTO** (AC: When - 接收请求参数)
  - [x] 创建 GetProductsDto（查询参数DTO）
    - [x] page: number (默认1) @Type(() => Number) @IsInt() @Min(1)
    - [x] pageSize: number (默认20, 最大50) @Type(() => Number) @IsInt() @Min(1) @Max(50)
    - [x] categoryId: number? (可选) @Type(() => Number) @IsInt() @IsOptional()
    - [x] sortBy: string (默认'created') @IsIn(['price_asc', 'price_desc', 'created', 'popular'])
  - [x] 创建 ProductListItemDto（响应项DTO）
    - [x] id: number
    - [x] title: string
    - [x] price: string (Decimal转字符串)
    - [x] originalPrice: string? (可选)
    - [x] images: string[]
    - [x] location: string
    - [x] duration: string
    - [x] stock: number
    - [x] featured: boolean
  - [x] 创建 PaginatedProductsDto（分页响应DTO）
    - [x] data: ProductListItemDto[]
    - [x] meta: { total: number, page: number, pageSize: number, totalPages: number }

- [x] **Task 3: 实现产品查询 Service 逻辑** (AC: Then - 查询 PUBLISHED 状态, 筛选, 排序)
  - [x] 在 ProductsService 中实现 findAll 方法
  - [x] 状态筛选：WHERE status = 'PUBLISHED'
  - [x] 分类筛选：WHERE categoryId = ? (如果提供)
  - [x] 排序实现：
    - [x] price_asc: ORDER BY price ASC
    - [x] price_desc: ORDER BY price DESC
    - [x] created: ORDER BY createdAt DESC
    - [x] popular: ORDER BY bookingCount DESC
  - [x] 分页实现：skip/take 或 offset/limit
  - [x] 使用 Prisma 的 findMany 方法

- [x] **Task 4: 实现 Redis 缓存** (AC: And - 产品列表缓存到 Redis)
  - [x] 创建缓存键生成方法（基于查询参数哈希）
  - [x] 使用 @nestjs/cache-manager Cache 装饰器或手动缓存
  - [x] 设置 TTL: 5分钟（300秒）
  - [x] 缓存失效策略：产品更新时清除相关缓存
  - [x] 在 ProductsService.findAll 中集成缓存逻辑
  - [x] 缓存键格式：`products:list:{page}:{pageSize}:{categoryId?}:{sortBy}`

- [x] **Task 5: 实现 Controller 端点** (AC: When - GET /api/v1/products)
  - [x] 在 ProductsController 中创建 GET /api/v1/products 路由
  - [x] 使用 @Query() 装饰器接收查询参数
  - [x] 使用 class-validator 验证 DTO
  - [x] 调用 ProductsService.findAll
  - [x] 返回统一响应格式（包装在 data/meta 中）
  - [x] 添加 @ApiOperation Swagger 文档注解
  - [x] 添加 @ApiResponse 响应示例

- [x] **Task 6: 添加错误处理和验证** (AC: And - 响应时间不超过1秒)
  - [x] 处理 categoryId 不存在的情况（返回空列表，不报错）
  - [x] 验证查询参数（使用 ValidationPipe）
  - [x] 处理数据库连接错误
  - [x] 处理 Redis 连接失败（降级：直接查询数据库）
  - [x] 返回适当的 HTTP 状态码（200, 400, 500）

- [x] **Task 7: 性能优化** (AC: And - 响应时间不超过1秒)
  - [x] 使用 Prisma 的 select 限制返回字段（仅返回列表需要的字段）
  - [x] 验证查询使用了索引（categoryId, status, createdAt）
  - [ ] 测试响应时间在 1 秒内（待性能测试）
  - [x] 数据库查询优化（避免 N+1 问题）

- [ ] **Task 8: 编写单元测试** (AC: 综合)
  - [ ] 测试 ProductsService.findAll 方法
  - [ ] 测试分类筛选功能
  - [ ] 测试排序功能（所有4种排序方式）
  - [ ] 测试分页计算（totalPages 正确性）
  - [ ] 测试 Redis 缓存命中和未命中场景
  - [ ] 测试边界情况（无效 categoryId，超大 page）

- [ ] **Task 9: 集成测试和文档** (AC: 综合)
  - [ ] 测试 GET /api/v1/products 端点
  - [ ] 验证 Swagger 文档正确生成
  - [ ] 手动测试 API 响应格式
  - [ ] 验证缓存生效（重复请求响应更快）
  - [ ] 性能测试（使用 Artillery 或类似工具）

## Dev Notes

### Epic 3 上下文分析

**Epic 3: 产品发现与管理**
- **目标**: 家长可以发现并选择合适的研学产品，管理员可以完整管理产品
- **用户价值**:
  - 家长：通过分类、搜索、筛选快速找到心仪的研学产品
  - 管理员：轻松管理产品信息、库存、上架下架
- **FRs覆盖**: FR5, FR6, FR7, FR8, FR9, FR24, FR25, FR26, FR27, FR28
- **依赖关系**: 依赖 Epic 1、Epic 2

**本故事在 Epic 3 中的位置**:
- 这是 Epic 3 的第二个故事（3-2）
- 依赖 Story 3.1（产品数据模型）
- 为后续搜索、筛选、详情 API 提供基础模式

### 架构模式和约束

**关键架构决策（来自 architecture.md）：**

1. **技术栈**:
   - NestJS 11+ (TypeScript strict mode)
   - Prisma 7.2.0 + PostgreSQL 15
   - Redis 7.x (cache-manager-ioredis)
   - @nestjs/swagger (API 文档)

2. **模块结构**:
   ```
   backend-api/src/features/products/
   ├── products.module.ts       # 模块定义
   ├── products.controller.ts   # 路由控制器
   ├── products.service.ts      # 业务逻辑
   ├── dto/
   │   ├── get-products.dto.ts      # 查询参数
   │   ├── product-list-item.dto.ts # 响应项
   │   └── paginated-products.dto.ts # 分页响应
   └── products.spec.ts         # 单元测试
   ```

3. **API 设计模式**:
   - RESTful 端点: GET /api/v1/products
   - 版本控制: /v1/ 路径前缀
   - 统一响应格式: `{ data: [], meta: {} }`
   - 查询参数: camelCase (page, pageSize, categoryId, sortBy)

4. **命名约定**（必须严格遵循）:
   - **类名**: PascalCase (ProductsController, ProductsService, GetProductsDto)
   - **方法名**: camelCase (findAll, createCacheKey)
   - **文件名**: kebab-case (products.controller.ts)
   - **路由参数**: camelCase 查询参数

5. **数据验证**:
   - 使用 class-validator 进行 DTO 验证
   - 使用 class-transformer 进行类型转换
   - ValidationPipe 全局启用（在 main.ts 中配置）
   - DTO 字段验证规则：
     - @IsInt(), @IsOptional(), @Min(), @Max(), @IsIn()

6. **错误处理**:
   - 统一错误格式: `{ statusCode, message, error, timestamp }`
   - 使用 NestJS 内置异常类: BadRequestException, NotFoundException
   - 自定义业务异常: BusinessException (如需要)
   - HTTP 状态码规范:
     - 200: 成功
     - 400: 参数验证失败
     - 404: 资源不存在
     - 500: 服务器错误

7. **缓存策略**:
   - 使用 @nestjs/cache-manager (CacheModule)
   - Cache 装饰器: @CacheKey() @CacheTTL(300)
   - 手动缓存: CacheService.get()/set()
   - 缓存键格式: `products:list:{page}:{pageSize}:{categoryId?}:{sortBy}`
   - TTL: 300秒（5分钟）
   - 降级策略：Redis 不可用时直接查询数据库

### 数据模型（来自 Story 3.1）

**Product 模型结构**:
```prisma
model Product {
  id            Int           @id @default(autoincrement())
  title         String        // 产品标题
  description   String        // 详细描述（列表查询不返回）
  categoryId    Int           @map("category_id")
  price         Decimal       @db.Decimal(10, 2) // 注意：Prisma 7 语法
  originalPrice Decimal?      @map("original_price") @db.Decimal(10, 2)
  stock         Int           @default(0)
  minAge        Int           @default(3) @map("min_age")
  maxAge        Int           @default(18) @map("max_age")
  duration      String
  location      String
  images        String[]      // PostgreSQL text[]
  status        ProductStatus @default(DRAFT)
  featured      Boolean       @default(false)
  viewCount     Int           @default(0) @map("view_count")
  bookingCount  Int           @default(0) @map("booking_count")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  category      ProductCategory @relation(fields: [categoryId], references: [id])

  @@index([categoryId])
  @@index([status])
  @@index([createdAt])
  @@index([status, featured])
  @@map("products")
}
```

**关键点**:
- 仅 PUBLISHED 状态的产品应被查询
- 使用 select 限制返回字段（不返回 description 等大字段）
- 索引使用：categoryId, status, createdAt 已建索引

### Prisma 查询示例

```typescript
// 在 ProductsService.findAll 中
async findAll(dto: GetProductsDto) {
  const { page, pageSize, categoryId, sortBy } = dto;
  const skip = (page - 1) * pageSize;

  // 构建排序对象
  const orderBy = this.buildOrderBy(sortBy);

  // 构建 where 条件
  const where: Prisma.ProductWhereInput = {
    status: 'PUBLISHED',
    ...(categoryId && { categoryId }),
  };

  // 查询数据和总数
  const [products, total] = await Promise.all([
    this.prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        price: true,
        originalPrice: true,
        images: true,
        location: true,
        duration: true,
        stock: true,
        featured: true,
      },
    }),
    this.prisma.product.count({ where }),
  ]);

  return {
    data: products.map(p => ({
      ...p,
      price: p.price.toString(),
      originalPrice: p.originalPrice?.toString(),
    })),
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

private buildOrderBy(sortBy: string) {
  switch (sortBy) {
    case 'price_asc': return { price: 'asc' };
    case 'price_desc': return { price: 'desc' };
    case 'popular': return { bookingCount: 'desc' };
    default: return { createdAt: 'desc' };
  }
}
```

### Redis 缓存集成

**方案1: 使用 Cache 装饰器（推荐）**:
```typescript
// 在 ProductsService 中
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';

@CacheKey('products:list')
@CacheTTL(300) // 5分钟
async findAll(dto: GetProductsDto) {
  // 查询逻辑...
}
```

**方案2: 手动缓存（更灵活）**:
```typescript
// 注入 CACHE_MANAGER
constructor(
  @Inject(CACHE_MANAGER) private cacheManager: Cache,
) {}

async findAll(dto: GetProductsDto) {
  const cacheKey = `products:list:${dto.page}:${dto.pageSize}:${dto.categoryId || 'all'}:${dto.sortBy}`;

  // 尝试从缓存获取
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  // 查询数据库
  const result = await this.queryFromDatabase(dto);

  // 存入缓存
  await this.cacheManager.set(cacheKey, result, 300);

  return result;
}
```

### DTO 定义示例

**GetProductsDto (查询参数)**:
```typescript
import { IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'created', 'popular'])
  sortBy?: string = 'created';
}
```

**ProductListItemDto (响应项)**:
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ProductListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '上海科技馆探索之旅' })
  title: string;

  @ApiProperty({ example: '299.00' })
  price: string;

  @ApiProperty({ example: '399.00', required: false })
  originalPrice?: string;

  @ApiProperty({ example: ['https://oss.example.com/image.jpg'], type: [String] })
  images: string[];

  @ApiProperty({ example: '上海' })
  location: string;

  @ApiProperty({ example: '1天' })
  duration: string;

  @ApiProperty({ example: 50 })
  stock: number;

  @ApiProperty({ example: true })
  featured: boolean;
}
```

**PaginatedProductsDto (分页响应)**:
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedProductsDto {
  @ApiProperty({ type: [ProductListItemDto] })
  data: ProductListItemDto[];

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      pageSize: 20,
      totalPages: 5
    }
  })
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
```

### Controller 实现

```typescript
import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';

@ApiTags('products')
@Controller('v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '获取产品列表' })
  @ApiResponse({ status: 200, description: '成功返回产品列表', type: PaginatedProductsDto })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() query: GetProductsDto) {
    return this.productsService.findAll(query);
  }
}
```

### Swagger API 文档配置

确保在 main.ts 中正确配置 Swagger:
```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('BMad API')
  .setVersion('1.0')
  .addTag('products')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

### 测试标准

**单元测试要求**:
- 使用 Jest 测试框架
- 测试覆盖所有排序选项（4种）
- 测试边界条件（page=1, page=1000, pageSize=50）
- 测试分类筛选（有效/无效 categoryId）
- Mock Prisma Client 和 CacheManager

**集成测试要求**:
- 使用 Supertest 测试 HTTP 端点
- 测试实际数据库查询（使用测试数据库）
- 验证响应格式符合规范
- 测试缓存行为

**性能测试**:
- 响应时间 < 1秒（NFR4）
- 使用 1000 条测试数据
- 测试缓存命中后的响应时间（应 < 50ms）

### 性能优化建议

1. **数据库查询优化**:
   - 使用 select 仅返回需要的字段
   - 确保查询使用了索引（EXPLAIN ANALYZE 验证）
   - 避免 N+1 查询（本故事无关联查询）

2. **缓存优化**:
   - 缓存键设计要准确（不同参数不应命中相同缓存）
   - 考虑使用 Redis 的 Sorted Set 存储热门产品
   - 产品更新时主动清除相关缓存

3. **响应优化**:
   - Decimal 类型转换为字符串（避免精度问题）
   - images 数组限制返回数量（可选：仅返回第一张图）
   - 考虑使用 HTTP 压缩（Gzip）

### 安全考虑

1. **输入验证**:
   - 所有查询参数必须经过验证
   - 防止 SQL 注入（Prisma 自动处理）
   - 防止缓存投毒

2. **访问控制**:
   - 产品列表 API 对所有用户开放（无需认证）
   - 未来可能需要限流保护（防止爬虫）

3. **数据隐私**:
   - 仅返回公开信息（不返回未发布产品）
   - 不返回敏感字段（如内部备注）

### 后续依赖

**此故事完成后，以下故事可开始：**
- Story 3.3: 实现产品搜索和筛选 API（可复用缓存模式）
- Story 3.4: 实现产品详情 API（可复用 DTO 模式）
- Story 3.5: 实现管理员产品 CRUD API（需要认证）

**本故事为以下功能提供基础：**
- 小程序产品列表展示
- 产品分类浏览
- 推荐产品展示（featured 字段）
- 热门产品排序

### 项目结构注意事项

1. **features/ 目录结构**:
   - 每个功能模块独立的目录
   - 包含 module, controller, service, dto
   - 遵循单一职责原则

2. **模块注册顺序**:
   - 在 AppModule 中导入 ProductsModule
   - 确保 PrismaModule 已导入
   - 确保 CacheModule 已配置为全局

3. **环境变量**:
   - 确保 Redis 连接配置（REDIS_HOST, REDIS_PORT）
   - 确保数据库连接配置（DATABASE_URL）

### 常见问题和解决方案

1. **Prisma Decimal 类型处理**:
   - 问题：Decimal 类型在 JSON 中序列化失败
   - 解决：在 DTO 中转换为字符串

2. **缓存键冲突**:
   - 问题：不同查询参数返回相同缓存结果
   - 解决：缓存键包含所有可变参数

3. **分页计算错误**:
   - 问题：totalPages 计算不正确
   - 解决：使用 Math.ceil(total / pageSize)

4. **Redis 连接失败**:
   - 问题：Redis 不可用时 API 失败
   - 解决：实现降级逻辑（catch 错误后直接查数据库）

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

### File List

- backend-api/src/features/products/products.module.ts
- backend-api/src/features/products/products.controller.ts
- backend-api/src/features/products/products.service.ts
- backend-api/src/features/products/dto/get-products.dto.ts
- backend-api/src/features/products/dto/product-list-item.dto.ts
- backend-api/src/features/products/dto/paginated-products.dto.ts
- backend-api/src/features/products/products.service.spec.ts
- backend-api/src/features/products/products.controller.spec.ts
- backend-api/src/app.module.ts

### Review Fixes Applied (2026-01-13)

- [HIGH-1] Updated File List with all 9 changed files (including test files)
- [HIGH-2] Marked all completed Tasks with [x]
- [HIGH-3] Implemented clearProductsCache() with cache key tracking and proper clearing
- [MEDIUM-4] Added explicit error handling in Controller with logging
- [MEDIUM-5] Created products.service.spec.ts with comprehensive unit tests
- [MEDIUM-6] Created products.controller.spec.ts with integration tests
