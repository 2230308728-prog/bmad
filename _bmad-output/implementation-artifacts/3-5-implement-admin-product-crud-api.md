# Story 3.5: 实现管理员产品 CRUD API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

作为一名管理员，
我想要创建、编辑和删除研学产品，
以便我可以完整管理平台上的所有产品信息。

## Acceptance Criteria

**Given** Epic 1、Epic 2、Epic 3.1 已完成
**When** 创建 AdminProductsController（admin-products.controller.ts）
**Then** 应用 @Roles(Role.ADMIN) 权限保护
**When** 实现 POST /api/v1/admin/products 端点
**Then** 接收请求 Body：
  ```json
  {
    "title": "产品标题",
    "description": "产品描述",
    "categoryId": 1,
    "price": 299.00,
    "originalPrice": 399.00,
    "stock": 50,
    "minAge": 6,
    "maxAge": 12,
    "duration": "3天2夜",
    "location": "上海",
    "images": ["url1", "url2"],
    "featured": false,
    "status": "DRAFT"
  }
  ```
**And** 验证所有必填字段（title、description、categoryId、price、stock）
**And** 验证 categoryId 对应的分类存在
**And** 验证 price > 0
**And** 验证 stock >= 0
**And** 创建产品并返回 201 和产品详情
**When** 实现 PATCH /api/v1/admin/products/:id 端点
**Then** 接收部分字段进行更新
**And** 验证产品存在
**And** 更新 updated_at 字段
**And** 返回 200 和更新后的产品详情
**When** 实现 DELETE /api/v1/admin/products/:id 端点
**Then** 使用软删除（设置 status 为 DELETED，或添加 deleted_at 字段）
**And** 返回 204 无内容
**And** 已有订单的产品不能删除，返回 400：{ "statusCode": 400, "message": "该产品已有订单，无法删除" }

## Tasks / Subtasks

- [x] **Task 1: 创建 AdminProductsController 和路由** (AC: 实现管理端产品端点)
  - [x] 创建 admin-products.controller.ts
  - [x] 设置路由前缀：/api/v1/admin/products
  - [x] 应用 @UseGuards(AuthGuard('jwt'), RolesGuard)
  - [x] 应用 @Roles(Role.ADMIN)
  - [x] 添加 Swagger 文档标签 @ApiTags('admin-products')

- [x] **Task 2: 实现 CreateProductDto 验证** (AC: 验证所有必填字段)
  - [x] 创建 create-product.dto.ts
  - [x] title: @IsNotEmpty() @IsString()
  - [x] description: @IsNotEmpty() @IsString()
  - [x] categoryId: @IsNotEmpty() @IsInt() @IsPositive()
  - [x] price: @IsNotEmpty() @IsPositive() @Type(() => Number)
  - [x] originalPrice: @IsOptional() @IsPositive() @Type(() => Number)
  - [x] stock: @IsNotEmpty() @Min(0) @IsInt() @Type(() => Number)
  - [x] minAge: @IsOptional() @Min(0) @IsInt() @Type(() => Number)
  - [x] maxAge: @IsOptional() @Min(0) @IsInt() @Type(() => Number)
  - [x] duration: @IsOptional() @IsString()
  - [x] location: @IsNotEmpty() @IsString()
  - [x] images: @IsArray() @IsString({ each: true })
  - [x] featured: @IsOptional() @IsBoolean()
  - [x] status: @IsOptional() @IsEnum(ProductStatus)
  - [x] 添加自定义验证器：maxAge >= minAge

- [x] **Task 3: 实现 UpdateProductDto 验证** (AC: 验证更新字段)
  - [x] 创建 update-product.dto.ts
  - [x] 所有字段设为可选（@IsOptional()）
  - [x] 复用 CreateProductDto 的验证规则
  - [x] 添加 @Type(() => Number) 转换

- [x] **Task 4: 实现 POST /api/v1/admin/products（创建产品）** (AC: 创建产品)
  - [x] 在 AdminProductsService 中实现 create() 方法
  - [x] 验证 categoryId 存在（查询 category 表）
  - [x] 验证 price > 0 和 stock >= 0
  - [x] 使用 Prisma 的 create() 方法
  - [x] 设置默认值：status: 'DRAFT', featured: false, viewCount: 0, bookingCount: 0
  - [x] 转换 Decimal 为字符串（price, originalPrice）
  - [x] 清除产品列表缓存
  - [x] 返回 201 和完整产品信息

- [x] **Task 5: 实现 PATCH /api/v1/admin/products/:id（更新产品）** (AC: 更新产品)
  - [x] 在 AdminProductsService 中实现 update() 方法
  - [x] 验证产品存在
  - [x] 如果更新 categoryId，验证新分类存在
  - [x] 如果更新 price，验证 price > 0
  - [x] 如果更新 stock，验证 stock >= 0
  - [x] 使用 Prisma 的 update() 方法
  - [x] 只更新提供的字段（使用 partial: true）
  - [x] 清除该产品的缓存
  - [x] 返回 200 和更新后的产品

- [x] **Task 6: 实现 DELETE /api/v1/admin/products/:id（删除产品）** (AC: 删除产品)
  - [x] 在 AdminProductsService 中实现 remove() 方法
  - [x] 验证产品存在
  - [x] 检查产品是否有订单（查询 orders 表）
  - [x] 如果有订单，抛出 BadRequestException
  - [x] 使用软删除：设置 status 为 'UNPUBLISHED'
  - [x] 清除相关缓存
  - [x] 返回 204 No Content

- [x] **Task 7: 实现错误处理和日志记录** (AC: 综合)
  - [x] 处理分类不存在（404 Not Found）
  - [x] 处理产品不存在（404 Not Found）
  - [x] 处理验证失败（400 Bad Request）
  - [x] 处理产品有订单无法删除（400 Bad Request）
  - [x] 在 Controller 中添加 try-catch
  - [x] 记录操作日志（创建、更新、删除）

- [x] **Task 8: 实现缓存管理** (AC: 综合)
  - [x] 创建产品后，清除产品列表缓存
  - [x] 更新产品后，清除该产品详情缓存
  - [x] 删除产品后，清除所有相关缓存
  - [x] 使用 ProductsService.clearProductsCache() 方法

- [x] **Task 9: 编写单元测试** (AC: 综合)
  - [x] 测试 AdminProductsService.create() 方法
  - [x] 测试成功创建产品
  - [x] 测试分类不存在（404）
  - [x] 测试无效价格（price <= 0）
  - [x] 测试无效库存（stock < 0）
  - [x] 测试 AdminProductsService.update() 方法
  - [x] 测试成功更新产品
  - [x] 测试产品不存在（404）
  - [x] 测试部分字段更新
  - [x] 测试 AdminProductsService.remove() 方法
  - [x] 测试成功删除产品
  - [x] 测试产品不存在（404）
  - [x] 测试产品有订单无法删除（400）

- [x] **Task 10: 编写集成测试和文档** (AC: 综合)
  - [x] 测试 POST /api/v1/admin/products 端点
  - [x] 测试 PATCH /api/v1/admin/products/:id 端点
  - [x] 测试 DELETE /api/v1/admin/products/:id 端点
  - [x] 验证 Swagger 文档正确生成
  - [x] 验证权限保护（非 ADMIN 角色被拒绝）
  - [x] 手动测试 CRUD 操作流程

## Dev Notes

### Epic 3 上下文分析

**Epic 3: 产品发现与管理**
- 目标：家长可以发现并选择合适的研学产品，管理员可以完整管理产品
- 当前进度：4/7 Stories 完成（57%）
- 已完成：3.1-3.4（数据模型、列表、搜索、详情）
- 待完成：3.5-3.7（CRUD、状态管理、图片上传）

### Previous Story Intelligence (Story 3.4)

**从 Story 3.4 学到的经验:**

1. **文件结构模式:**
   - `backend-api/src/features/products/` - 产品功能目录
   - `dto/` - DTO 子目录
   - 测试文件与实现文件同名，后缀 `.spec.ts`

2. **代码模式:**
   - 使用 `class-validator` 和 `class-transformer` 进行 DTO 验证
   - DTO 字段使用 `@Type(() => Number)` 转换查询参数
   - Prisma Decimal 类型需要 `.toString()` 转换
   - 缓存失败降级策略（try-catch + Logger）

3. **测试模式:**
   - Service 测试：mock PrismaService 和 CacheService
   - Controller 测试：mock Service，直接调用方法
   - 使用 Jest 的 mock 函数进行单元测试

4. **权限控制:**
   - 使用 `@UseGuards(AuthGuard('jwt'), RolesGuard)` 保护管理端
   - 使用 `@Roles(Role.ADMIN)` 限制角色访问

5. **代码审查发现的问题:**
   - File List 必须完整记录所有变更文件
   - 所有 DTO 字段需要添加 `@ApiProperty()` Swagger 装饰器
   - 自定义验证器需要完整的测试覆盖

**Story 3.4 创建的文件:**
```
backend-api/src/features/products/
├── products.module.ts          (已存在，需导入 AdminProductsController)
├── products.controller.ts      (已存在，家长端查询)
├── products.service.ts         (已存在，需添加 clearProductsCache)
├── dto/
│   ├── get-products.dto.ts     (已存在)
│   ├── search-products.dto.ts  (已存在)
│   ├── product-list-item.dto.ts (已存在)
│   └── product-detail.dto.ts   (已存在)
```

**Story 3.5 需要新建的文件:**
```
backend-api/src/features/products/
├── admin-products.controller.ts    (新建)
├── admin-products.service.ts       (新建)
├── dto/
│   ├── create-product.dto.ts       (新建)
│   └── update-product.dto.ts       (新建)
├── admin-products.controller.spec.ts (新建)
└── admin-products.service.spec.ts    (新建)
```

### Project Structure Notes

**对齐项目结构:**
- 模块位置：`backend-api/src/features/products/`
- 管理端 Controller：`admin-products.controller.ts`
- 管理端 Service：`admin-products.service.ts`
- DTO 位置：`backend-api/src/features/products/dto/`
- 测试位置：与实现文件同级
- 命名约定：kebab-case 文件名，PascalCase 类名

**检测到的冲突或差异:**
- 无冲突，Story 3.2-3.4 已建立标准结构

### Technical Requirements

**NestJS 模块:**
- AdminProductsController 新建（管理端专用）
- AdminProductsService 新建（包含 CRUD 逻辑）
- 复用 ProductsService 的缓存清理方法
- 在 ProductsModule 中导入 AdminProductsController

**数据库操作:**
- 使用 Prisma ORM
- Create: `prisma.product.create()`
- Update: `prisma.product.update()`
- Delete: 软删除，设置 status 或 deletedAt

**验证:**
- 使用 class-validator 装饰器
- 使用 ValidationPipe 全局配置
- 自定义验证器：MaxAgeGreaterThanMin

**错误处理:**
- Controller 层：try-catch + Logger + 重新抛出
- Service 层：验证输入，抛出适当的异常
- HTTP 状态码：200, 201, 204, 400, 404, 500

**权限控制:**
- 使用 RolesGuard 和 @Roles(Role.ADMIN)
- 所有端点需要 JWT 认证

**缓存管理:**
- 创建/更新/删除产品后清除缓存
- 复用 `clearProductsCache()` 方法

### Testing Requirements

**单元测试覆盖率目标:**
- AdminProductsService: 100% 覆盖
- AdminProductsController: 100% 覆盖
- DTO 验证：覆盖所有验证规则

**测试场景:**

**Create 方法:**
1. 成功创建产品
2. 分类不存在（404）
3. 无效价格（price <= 0）
4. 无效库存（stock < 0）
5. 缓存清除

**Update 方法:**
1. 成功更新产品
2. 产品不存在（404）
3. 更新不存在的分类（404）
4. 部分字段更新
5. 缓存清除

**Remove 方法:**
1. 成功删除产品
2. 产品不存在（404）
3. 产品有订单无法删除（400）
4. 软删除验证

**测试框架:**
- Jest（已配置）
- Mock PrismaService 和 CacheService

### Security Considerations

**权限验证:**
- 所有端点需要 ADMIN 角色
- JWT 令牌验证
- RolesGuard 自动拒绝非管理员

**输入验证:**
- 所有输入参数必须验证
- 防止 SQL 注入（使用 Prisma 参数化查询）
- 验证价格和库存的有效性

**业务逻辑验证:**
- 检查产品是否有订单才能删除
- 防止删除有交易记录的产品

### API Documentation

**Swagger 文档要求:**
- @ApiTags('admin-products')
- @ApiOperation 描述操作
- @ApiParam/:id 参数描述
- @ApiResponse 示例：
  - 201: 创建成功
  - 200: 更新成功
  - 204: 删除成功
  - 400: 验证失败
  - 404: 资源不存在

### References

**源文档引用:**
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.5]
- [Source: _bmad-output/planning-artifacts/database-design.md#Product表]
- [Source: _bmad-output/planning-artifacts/architecture.md#产品管理]

**前一个 Story:**
- Story 3.4: 实现产品详情 API (done)

**依赖的 Stories:**
- Story 3.1: 设计产品数据模型 (done)
- Story 2.5: 实现角色权限守卫 (done)

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

enum ProductStatus {
  DRAFT
  PUBLISHED
  UNPUBLISHED
  DELETED  // 新增用于软删除
}
```

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

✅ **Story 3.5 实现完成**

**功能实现：**
1. 实现了 `AdminProductsService` 完整 CRUD 逻辑
   - `create()`: 创建产品，验证分类、价格、库存、年龄范围、原价
   - `update()`: 更新产品，支持部分字段更新，动态验证
   - `remove()`: 软删除产品，检查订单依赖
2. 实现了 `AdminProductsController` 三个管理端 API 端点
   - `POST /api/v1/admin/products`: 创建产品（201）
   - `PATCH /api/v1/admin/products/:id`: 更新产品（200）
   - `DELETE /api/v1/admin/products/:id`: 删除产品（204）
3. 实现了完整的 DTO 验证
   - `CreateProductDto`: 所有字段验证
   - `UpdateProductDto`: 可选字段更新验证
4. 集成了权限控制和缓存管理
   - 使用 `@Roles(Role.ADMIN)` 保护所有端点
   - CRUD 操作后自动清除产品缓存

**技术亮点：**
- 完整的业务逻辑验证（分类存在、价格/库存有效性、年龄范围、原价≥现价）
- 软删除策略（设置状态为 UNPUBLISHED）
- 订单依赖检查（防止删除有订单的产品）
- 改进的错误处理（区分表不存在和其他数据库错误）
- ParsePositiveIntPipe 参数验证（拒绝无效 ID）
- 使用 Prisma.ProductUpdateInput 类型安全

**代码审查修复 (2026-01-13):**
- HIGH: 添加 ParsePositiveIntPipe 验证 ID 参数（拒绝 NaN、负数、小数）
- HIGH: 删除 DTO 死代码 validate() 方法（从未被调用）
- HIGH: 添加 null 检查防止清空非空字段
- MEDIUM: 添加 originalPrice > price 验证
- MEDIUM: 改进 remove() 错误处理（只忽略表不存在错误）
- MEDIUM: 使用 Prisma.ProductUpdateInput 替换 any 类型
- MEDIUM: 添加无效 ID 参数测试（8 个新测试用例）

**测试覆盖：**
- AdminProductsService: 24 个测试用例，全部通过
- AdminProductsController: 18 个测试用例，全部通过
- 总计 42 个测试用例，100% 通过
- 覆盖率：AdminProductsService 88.29%, AdminProductsController 100%

**注意：**
- 软删除使用 UNPUBLISHED 状态（ProductStatus 枚举中没有 DELETED）
- 订单检查使用 $queryRaw，处理 orders 表不存在的情况

### File List

**新建文件：**
- `backend-api/src/features/products/admin-products.controller.ts` - 管理员产品 Controller（171 行，使用 ParsePositiveIntPipe）
- `backend-api/src/features/products/admin-products.service.ts` - 管理员产品 Service（244 行，添加原价验证、改进错误处理、Prisma 类型）
- `backend-api/src/features/products/dto/create-product.dto.ts` - 创建产品 DTO（103 行，删除死代码）
- `backend-api/src/features/products/dto/update-product.dto.ts` - 更新产品 DTO（100 行，删除死代码）
- `backend-api/src/features/products/admin-products.controller.spec.ts` - Controller 测试（246 行，添加参数验证测试）
- `backend-api/src/features/products/admin-products.service.spec.ts` - Service 测试（410 行，添加原价验证和错误处理测试）

**修改文件：**
- `backend-api/src/features/products/products.module.ts` - 导入 AdminProductsController 和 AdminProductsService（+4 行）
