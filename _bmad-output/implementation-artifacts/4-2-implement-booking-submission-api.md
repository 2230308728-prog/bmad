# Story 4.2: 实现预订信息提交 API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality-check before dev-story. -->

## Story

作为一名家长，
我想要提交预订信息创建订单，
以便我可以预订心仪的研学产品。

## Acceptance Criteria

**Given** Epic 1、Epic 2、Epic 3、Epic 4.1 已完成
**When** 创建 OrdersController（orders.controller.ts）
**Then** 实现 POST /api/v1/orders 端点
**And** 应用 @Roles(Role.PARENT) 权限保护
**When** POST /api/v1/orders 接收请求 Body：
  ```json
  {
    "productId": 1,
    "bookingDate": "2024-02-15",
    "childName": "张小明",
    "childAge": 8,
    "contactName": "张爸爸",
    "contactPhone": "13800138000",
    "participantCount": 1,
    "remark": "如有食物过敏请提前告知"
  }
  ```
**Then** 验证 productId 对应的产品存在且状态为 PUBLISHED
**And** 验证产品库存 >= participantCount
**And** 验证 childAge 在产品的 min_age 和 max_age 范围内
**And** 验证 booking_date 格式为有效的日期
**And** 验证 contact_phone 格式为有效的手机号（11位数字）
**And** 计算订单总金额：product.price × participantCount
**And** 生成唯一订单编号（格式：ORD + YYYYMMDD + 8位随机数）
**And** 创建订单，状态为 PENDING
**And** 使用 Redis 原子操作预扣库存：
  - DECRBY product:stock:{productId} participantCount
  - 如果扣减后库存 < 0，则回滚并返回库存不足
**And** 返回 201 状态码和订单信息：
  ```json
  {
    "data": {
      "id": 1,
      "orderNo": "ORD20240109123456789",
      "status": "PENDING",
      "totalAmount": "299.00",
      "product": {
        "id": 1,
        "title": "上海科技馆探索之旅",
        "images": ["https://..."]
      },
      "bookingDate": "2024-02-15",
      "createdAt": "2024-01-09T12:00:00Z"
    }
  }
  ```
**When** 产品库存不足
**Then** 返回 400：{ "statusCode": 400, "message": "库存不足，请选择其他日期或产品" }
**When** 订单创建失败
**Then** 返回 500：{ "statusCode": 500, "message": "订单创建失败，请重试" }
**And** 记录错误日志

## Tasks / Subtasks

- [x] **Task 1: 创建订单相关 DTO** (AC: 接收请求 Body)
  - [x] 创建 CreateOrderDto
    - [x] productId: @IsNotEmpty() @IsInt() @ApiProperty()
    - [x] bookingDate: @IsNotEmpty() @IsDateString() @ApiProperty()
    - [x] childName: @IsNotEmpty() @IsString() @MaxLength(50) @ApiProperty()
    - [x] childAge: @IsNotEmpty() @IsInt() @Min(1) @Max(18) @ApiProperty()
    - [x] contactName: @IsNotEmpty() @IsString() @MaxLength(50) @ApiProperty()
    - [x] contactPhone: @IsNotEmpty() @IsPhoneNumber('CN') @ApiProperty()
    - [x] participantCount: @IsNotEmpty() @IsInt() @Min(1) @Max(20) @ApiProperty()
    - [x] remark: @IsOptional() @IsString() @MaxLength(500) @ApiProperty()
  - [x] 添加完整的 Swagger 文档

- [x] **Task 2: 实现 OrdersService 创建订单逻辑** (AC: 验证和创建订单)
  - [x] 创建 OrdersService（orders.service.ts）
  - [x] 实现 create() 方法：
    - [x] 验证产品存在且状态为 PUBLISHED
    - [x] 验证产品库存 >= participantCount
    - [x] 验证 childAge 在产品 min_age 和 max_age 范围内
    - [x] 计算订单总金额
    - [x] 生成唯一订单编号（ORD + YYYYMMDD + 8位随机数）
    - [x] 使用 Redis DECRBY 原子操作预扣库存
    - [x] 如果库存不足，回滚并抛出异常
    - [x] 创建 Order 和 OrderItem 记录
    - [x] 返回完整订单信息（包含产品快照）
  - [x] 添加完整的错误处理和日志记录

- [x] **Task 3: 实现 OrdersController 端点** (AC: 实现 POST /api/v1/orders)
  - [x] 创建 OrdersController（orders.controller.ts）
  - [x] 应用 @UseGuards(AuthGuard('jwt'), RolesGuard)
  - [x] 应用 @Roles(Role.PARENT)
  - [x] 实现 POST /api/v1/orders 端点
  - [x] 使用 @CurrentUser() 装饰器获取当前用户 ID
  - [x] 调用 OrdersService.create() 方法
  - [x] 返回 201 状态码和订单信息
  - [x] 添加完整的 Swagger 文档

- [x] **Task 4: 实现 Redis 库存预扣逻辑** (AC: Redis 原子操作预扣库存)
  - [x] 在 OrdersService 中注入 CacheService（Redis）
  - [x] 实现 preDeductStock() 方法：
    - [x] 使用 Redis DECRBY 原子操作扣减库存
    - [x] 返回扣减后的库存值
    - [x] 如果库存 < 0，则回滚（INCRBY）并返回 false
  - [x] 实现 rollbackStock() 方法：
    - [x] 使用 Redis INCRBY 回滚库存
  - [x] 在 create() 方法中使用事务保证数据一致性

- [x] **Task 5: 实现订单编号生成逻辑** (AC: 生成唯一订单编号)
  - [x] 实现 generateOrderNo() 方法
  - [x] 格式：ORD + YYYYMMDD + 8位随机数
  - [x] 示例：ORD20240109123456789
  - [x] 确保订单编号全局唯一

- [x] **Task 6: 编写单元测试** (AC: 综合)
  - [x] 测试 OrdersService.create() 成功场景
  - [x] 测试产品不存在（404）
  - [x] 测试产品未发布（400）
  - [x] 测试库存不足（400）
  - [x] 测试年龄范围不符（400）
  - [x] 测试手机号格式无效（400）
  - [x] 测试 Redis 库存扣减和回滚
  - [x] 测试订单编号生成唯一性

- [x] **Task 7: 编写集成测试和文档** (AC: 综合)
  - [x] 测试 POST /api/v1/orders 端点
  - [x] 验证 Swagger 文档正确生成
  - [x] 验证权限保护（@Roles(Role.PARENT)）
  - [x] 验证 JWT 认证

## Dev Notes

### Epic 4 上下文分析

**Epic 4: 预订与支付**
- 目标：家长可以选择日期、填写信息、完成支付，体验流畅的预订流程
- 当前进度：2/8 Stories（25%）
- 已完成：4.1（订单数据模型）
- 当前：4.2（预订提交 API）← **本故事**
- 后续：4.3（微信支付）、4.4（支付回调）、4.5（支付结果查询）

### Previous Story Intelligence (Story 4.1)

**从 Story 4.1 学到的经验:**

1. **数据模型结构:**
   - Order 模型：id, orderNo, userId, totalAmount, actualAmount, status, paymentStatus, remark, paidAt, createdAt...
   - OrderItem 模型：id, orderId, productId, productName, productPrice, quantity, subtotal（快照模式）
   - OrderStatus 枚举：PENDING, PAID, CONFIRMED, COMPLETED, CANCELLED, REFUNDING, REFUNDED
   - PaymentStatus 枚举：PENDING, PROCESSING, SUCCESS, FAILED, REFUNDING, REFUNDED, CANCELLED

2. **Prisma Schema 模式:**
   - 数据库表名：小写复数（orders, order_items）
   - 数据库列名：snake_case（order_no, user_id, created_at）
   - TypeScript 字段名：camelCase（orderNo, userId, createdAt）
   - Decimal 类型使用 @db.Decimal(10, 2) 精度
   - 关联关系使用 @relation 装饰器

3. **索引设计:**
   - Order: userId, status, paymentStatus, createdAt, (userId, status)
   - OrderItem: orderId, productId
   - 外键字段自动创建索引

4. **快照模式:**
   - OrderItem 存储产品名称和价格快照（productName, productPrice）
   - 防止产品删除或修改后无法显示历史订单

5. **级联删除:**
   - OrderItem 使用 onDelete: Cascade
   - 订单删除时自动删除订单项

**Story 4.1 创建/修改的文件:**
```
backend-api/prisma/
└── schema.prisma    (已存在，Order 和 OrderItem 模型已定义)
```

**Story 4.2 需要创建的文件:**
```
backend-api/src/features/orders/
├── orders.controller.ts         (新建)
├── orders.service.ts            (新建)
├── dto/
│   └── create-order.dto.ts      (新建)
├── orders.controller.spec.ts    (新建)
└── orders.service.spec.ts       (新建)

backend-api/src/features/orders/
└── orders.module.ts             (新建)
```

### Project Structure Notes

**对齐项目结构:**
- 模块位置：`backend-api/src/features/orders/`
- Controller：`orders.controller.ts`（家长端）
- Service：`orders.service.ts`
- DTO 位置：`backend-api/src/features/orders/dto/`
- 测试位置：与实现文件同级
- 命名约定：kebab-case 文件名，PascalCase 类名

**检测到的冲突或差异:**
- 无冲突，这是 Epic 4 的第二个故事
- Story 4.1 已定义 Order 和 OrderItem 数据模型
- 需要在 AppModule 中导入 OrdersModule

### Technical Requirements

**NestJS 模块:**
- OrdersController：家长端订单控制器
- OrdersService：订单业务逻辑
- OrdersModule：订单模块（导入 PrismaModule、CacheModule）

**DTO 验证:**
```typescript
// create-order.dto.ts
export class CreateOrderDto {
  @ApiProperty({ example: 1, description: '产品 ID' })
  @IsNotEmpty()
  @IsInt()
  productId: number;

  @ApiProperty({ example: '2024-02-15', description: '预订日期' })
  @IsNotEmpty()
  @IsDateString()
  bookingDate: string;

  @ApiProperty({ example: '张小明', description: '孩子姓名' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  childName: string;

  @ApiProperty({ example: 8, description: '孩子年龄' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(18)
  childAge: number;

  @ApiProperty({ example: '张爸爸', description: '联系人姓名' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  contactName: string;

  @ApiProperty({ example: '13800138000', description: '联系人手机号' })
  @IsNotEmpty()
  @IsPhoneNumber('CN')
  contactPhone: string;

  @ApiProperty({ example: 1, description: '参与人数' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(20)
  participantCount: number;

  @ApiProperty({ example: '如有食物过敏请提前告知', required: false, description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
```

**订单编号生成:**
```typescript
// orders.service.ts
generateOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const random = Math.random().toString(10).substring(2, 10).padEnd(8, '0'); // 8位随机数
  return `ORD${date}${random}`;
}
```

**Redis 库存预扣:**
```typescript
// orders.service.ts
async preDeductStock(productId: number, quantity: number): Promise<boolean> {
  const stockKey = `product:stock:${productId}`;
  const newStock = await this.cacheService.decrby(stockKey, quantity);

  if (newStock < 0) {
    // 回滚库存
    await this.cacheService.incrby(stockKey, quantity);
    return false;
  }

  return true;
}

async rollbackStock(productId: number, quantity: number): Promise<void> {
  const stockKey = `product:stock:${productId}`;
  await this.cacheService.incrby(stockKey, quantity);
}
```

**订单创建流程:**
```typescript
// orders.service.ts
async create(userId: number, dto: CreateOrderDto): Promise<Order> {
  // 1. 验证产品存在且状态为 PUBLISHED
  const product = await this.prisma.product.findFirst({
    where: { id: dto.productId, status: 'PUBLISHED' },
  });

  if (!product) {
    throw new NotFoundException('产品不存在或已下架');
  }

  // 2. 验证库存
  if (product.stock < dto.participantCount) {
    throw new BadRequestException('库存不足，请选择其他日期或产品');
  }

  // 3. 验证年龄范围
  if (dto.childAge < product.minAge || dto.childAge > product.maxAge) {
    throw new BadRequestException(
      `产品适用年龄：${product.minAge}-${product.maxAge}岁`,
    );
  }

  // 4. Redis 预扣库存
  const stockPreDeducted = await this.preDeductStock(
    dto.productId,
    dto.participantCount,
  );

  if (!stockPreDeducted) {
    throw new BadRequestException('库存不足，请选择其他日期或产品');
  }

  // 5. 计算订单总金额
  const totalAmount = product.price.mul(dto.participantCount);

  // 6. 生成订单编号
  const orderNo = this.generateOrderNo();

  // 7. 使用事务创建订单和订单项
  try {
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNo,
          userId,
          totalAmount,
          actualAmount: totalAmount,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          remark: dto.remark,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: createdOrder.id,
          productId: product.id,
          productName: product.title,
          productPrice: product.price,
          quantity: dto.participantCount,
          subtotal: totalAmount,
        },
      });

      return createdOrder;
    });

    return order;
  } catch (error) {
    // 回滚 Redis 库存
    await this.rollbackStock(dto.productId, dto.participantCount);
    throw error;
  }
}
```

**权限控制:**
- 所有端点需要 PARENT 角色
- JWT 令牌验证
- RolesGuard 自动拒绝非家长用户
- @CurrentUser() 装饰器获取当前用户 ID

### Testing Requirements

**单元测试覆盖率目标:**
- OrdersService: 100% 覆盖核心方法
- OrdersController: 100% 覆盖端点
- DTO 验证：覆盖所有验证规则

**测试场景:**

**OrdersService.create():**
1. 成功创建订单
2. 产品不存在（404）
3. 产品未发布（400）
4. 库存不足（400）
5. 年龄范围不符（400）
6. 手机号格式无效（400）
7. Redis 库存扣减成功
8. Redis 库存扣减失败并回滚
9. 订单编号唯一性
10. 事务失败回滚库存

**OrdersController.create():**
1. 成功创建订单（201）
2. 未授权（401）
3. 权限不足（403）
4. DTO 验证失败（400）

**测试框架:**
- Jest（已配置）
- Mock PrismaService 和 CacheService
- Mock Logger 以验证日志调用

### Security Considerations

**权限验证:**
- 所有端点需要 PARENT 角色
- JWT 令牌验证
- RolesGuard 自动拒绝非家长用户
- 用户只能创建自己的订单

**输入验证:**
- 所有输入字段必须经过验证
- 手机号格式验证（@IsPhoneNumber('CN')）
- 日期格式验证（@IsDateString()）
- 防止 SQL 注入（Prisma 自动处理）
- 防止 XSS 攻击（输入转义）

**业务逻辑验证:**
- 产品存在性和状态验证
- 库存数量验证
- 年龄范围验证
- 参与人数范围验证（1-20）

**数据一致性:**
- 使用 Prisma 事务保证数据一致性
- Redis 库存预扣失败时回滚
- 事务失败时回滚 Redis 库存

### API Documentation

**Swagger 文档要求:**
- @ApiTags('orders')
- @ApiOperation 描述操作
- @ApiResponse 示例：
  - 201: 创建成功
  - 400: 验证失败
  - 401: 未授权
  - 403: 权限不足
  - 404: 产品不存在
  - 500: 服务器错误

**端点文档:**
- POST /api/v1/orders
  - Headers: Authorization: Bearer {accessToken}
  - Body: CreateOrderDto
  - Response: { id, orderNo, status, totalAmount, product, bookingDate, createdAt }

### References

**源文档引用:**
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#API设计]
- [Source: _bmad-output/planning-artifacts/architecture.md#数据架构]

**前一个 Story:**
- Story 4.1: 设计并创建订单数据模型 (done) - Order 和 OrderItem 模型已定义

**依赖的 Stories:**
- Story 4.1: 设计并创建订单数据模型 (done) - 数据模型
- Epic 2: 用户认证系统 (done) - JWT 认证和角色权限
- Epic 3: 产品发现与管理 (done) - Product 数据模型

**相关文档:**
- 微信支付集成指南：`_bmad-output/implementation-artifacts/wechat-pay-integration-guide.md`

## Dev Agent Record

### Agent Model Used

glm-4.7 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

**Story 创建日期:** 2026-01-14

### File List

**Story 文件:**
- `_bmad-output/implementation-artifacts/4-2-implement-booking-submission-api.md`

**需要创建的文件:**
- `backend-api/src/features/orders/orders.controller.ts`
  - POST /api/v1/orders 端点
  - @Roles(Role.PARENT) 权限保护
  - 完整的 Swagger 文档
- `backend-api/src/features/orders/orders.service.ts`
  - create() 方法
  - generateOrderNo() 方法
  - preDeductStock() 方法
  - rollbackStock() 方法
- `backend-api/src/features/orders/dto/create-order.dto.ts`
  - CreateOrderDto 类
  - 完整的字段验证
  - 完整的 Swagger 文档
- `backend-api/src/features/orders/orders.module.ts`
  - OrdersModule 定义
  - 导入 PrismaModule、CacheModule
- `backend-api/src/features/orders/orders.controller.spec.ts`
  - 完整的控制器测试
- `backend-api/src/features/orders/orders.service.spec.ts`
  - 完整的服务测试

**需要修改的文件:**
- `backend-api/src/app.module.ts`
  - 导入 OrdersModule

**已存在文件（作为参考）:**
- `backend-api/prisma/schema.prisma`（Order 和 OrderItem 模型已定义）
- `backend-api/src/auth/strategies/jwt.strategy.ts`（JWT 认证策略）
- `backend-api/src/common/guards/roles.guard.ts`（角色权限守卫）
- `backend-api/src/common/decorators/current-user.decorator.ts`（当前用户装饰器）
- `backend-api/src/redis/cache.service.ts`（Redis 缓存服务）
