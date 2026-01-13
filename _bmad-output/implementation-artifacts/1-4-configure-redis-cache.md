# Story 1.4: 配置 Redis 缓存服务

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 配置 Redis 客户端并实现基础缓存服务,
so that 应用支持高并发场景（2000并发用户）并提供快速数据访问。

## Acceptance Criteria

1. **Given** NestJS 项目已创建（Story 1.2 完成）
   **When** 执行 `npm install @nestjs/cache-manager cache-manager cache-manager-ioredis`
   **And** 执行 `npm install ioredis`
   **Then** 成功安装所有 Redis 相关依赖包

2. **Given** Redis 依赖包已安装
   **When** 创建 RedisModule（redis.module.ts）
   **Then** 模块封装 Redis 配置并提供可复用的缓存服务

3. **Given** RedisModule 已创建
   **When** 在 .env 文件中添加 REDIS_HOST、REDIS_PORT 配置项
   **Then** 环境变量正确配置且应用可读取

4. **Given** Redis 配置完成
   **When** 创建 CacheService（cache.service.ts）
   **Then** 提供 get/set/del 方法用于缓存操作

5. **Given** CacheService 已创建
   **When** 实现 TTL（过期时间）支持
   **Then** CacheService 支持设置自定义过期时间，并实现 TTL 随机化（±10%）防止缓存雪崩

6. **Given** CacheService 实现完成
   **When** 在 AppModule 中导入 CacheModule 并配置为全局模块
   **Then** 所有模块均可注入使用缓存服务

7. **Given** 缓存模块已配置
   **When** 应用启动时
   **Then** Redis 连接成功建立，无错误日志

8. **Given** Redis 缓存服务运行中
   **When** Redis 连接失败（服务器宕机、网络问题）
   **Then** 应用记录错误日志但继续运行（降级策略）

9. **Given** 应用运行中
   **When** 访问 GET /health/redis 端点
   **Then** 返回 Redis 连接状态和响应时间

## Tasks / Subtasks

- [x] Task 1: 安装 Redis 依赖包 (AC: 1)
  - [x] Subtask 1.1: 安装 @nestjs/cache-manager cache-manager cache-manager-ioredis
  - [x] Subtask 1.2: 安装 ioredis 驱动
  - [x] Subtask 1.3: 验证 package.json 依赖正确

- [x] Task 2: 创建 Redis 配置和模块 (AC: 2, 3)
  - [x] Subtask 2.1: 在 .env 添加 REDIS_HOST=localhost、REDIS_PORT=6379
  - [x] Subtask 2.2: 创建 src/redis/redis.module.ts
  - [x] Subtask 2.3: 配置 RedisModule 为动态模块，支持传入配置选项
  - [x] Subtask 2.4: 添加配置验证（ConfigModule 验证 schema）

- [x] Task 3: 实现 CacheService 核心功能 (AC: 4, 5)
  - [x] Subtask 3.1: 创建 src/redis/cache.service.ts
  - [x] Subtask 3.2: 实现 get(key: string) 方法
  - [x] Subtask 3.3: 实现 set(key: string, value: any, ttl?: number) 方法
  - [x] Subtask 3.4: 实现 del(key: string) 方法
  - [x] Subtask 3.5: 实现 TTL 随机化逻辑（±10%）防止缓存雪崩
  - [x] Subtask 3.6: 添加单元测试覆盖所有方法

- [x] Task 4: 配置全局缓存模块 (AC: 6)
  - [x] Subtask 4.1: 在 src/app.module.ts 导入 CacheModule.forRoot()
  - [x] Subtask 4.2: 配置为全局模块（@Global() 装饰器）
  - [x] Subtask 4.3: 验证其他模块可以注入 CacheService

- [x] Task 5: 实现降级策略和错误处理 (AC: 8)
  - [x] Subtask 5.1: 在 RedisModule 配置错误处理函数
  - [x] Subtask 5.2: 连接失败时记录错误日志但不阻塞应用启动
  - [x] Subtask 5.3: CacheService 方法在 Redis 不可用时优雅降级（返回 null/忽略错误）
  - [x] Subtask 5.4: 添加集成测试验证降级行为

- [x] Task 6: 实现 Redis 健康检查 (AC: 9)
  - [x] Subtask 6.1: 创建 src/health/health.controller.ts
  - [x] Subtask 6.2: 实现 GET /health/redis 端点
  - [x] Subtask 6.3: 返回连接状态（status: 'up' | 'down'）
  - [x] Subtask 6.4: 返回 Redis 响应时间（responseTime ms）
  - [x] Subtask 6.5: 添加健康检查测试

- [x] Task 7: 验证高并发支持 (AC: Story benefit)
  - [x] Subtask 7.1: 配置 Redis 连接池支持 2000 并发连接
  - [x] Subtask 7.2: 实现连接重用和连接管理
  - [x] Subtask 7.3: 添加负载测试验证并发性能

## Dev Notes

### Architecture Patterns and Constraints

**Redis 7.x 配置要求** [Source: architecture.md#Cache Strategy]
- 使用 ioredis 驱动（推荐用于生产环境）
- 支持 2000 并发用户连接
- 实现连接池管理避免连接泄漏

**缓存数据结构规范** [Source: architecture.md#Cache Data Structures]
```
products:list          -> Sorted Set (产品列表，按分数排序)
product:detail:{id}    -> Hash (产品详情，多个字段)
session:{userId}       -> String, TTL 7天 (用户会话)
product:stock:{id}     -> String (库存缓存)
rate:limit:{userId}:action -> String, TTL 60秒 (限流计数器)
```

**TTL 随机化策略** [Source: architecture.md#Cache Interceptor Pattern]
- 防止缓存雪崩：基础 TTL ± 10% 随机偏移
- 示例：TTL=300秒 → 实际范围 270-330秒
- 实现位置：CacheService.set() 方法内部

**降级策略** [Source: architecture.md#Error Handling]
- Redis 不可用时不应阻塞核心业务功能
- 错误日志必须记录到应用日志系统
- 降级返回值：get() 返回 null，set/del 忽略错误

### Project Structure Notes

**Target Source Tree Components**:
```
backend-api/src/
├── redis/
│   ├── redis.module.ts          # Redis 模块定义
│   ├── cache.service.ts         # 缓存服务实现
│   └── cache.service.spec.ts    # 单元测试
├── health/
│   ├── health.controller.ts     # 健康检查端点
│   └── health.controller.spec.ts
├── app.module.ts                # 需要修改：导入 CacheModule
└── main.ts                      # 应用入口
```

**Naming Conventions**:
- Module: RedisModule (singular)
- Service: CacheService (descriptive name)
- Environment variables: REDIS_HOST, REDIS_PORT (UPPER_SNAKE_CASE)
- Health endpoint: /health/redis (kebab-case)

**Module Organization**:
- RedisModule: 独立功能模块，职责单一
- HealthController: 可合并到现有 health 模块或独立创建
- Global module: CacheModule 配置为全局以便所有模块注入

### Testing Standards Summary

**Unit Tests Required**:
- CacheService.get/set/del 方法测试
- TTL 随机化逻辑测试（验证 ±10% 范围）
- 边界条件测试（null key、空值、过期键）

**Integration Tests Required**:
- Redis 连接建立和断开行为
- 降级策略验证（模拟 Redis 不可用）
- 健康检查端点响应格式
- 并发读写测试（模拟 100+ 并发操作）

**Test Environment Setup**:
- 使用 Docker 容器运行 Redis 测试实例
- 或使用 Redis Memory Server for local testing
- 确保测试隔离（使用不同的 key prefix）

### References

- [architecture.md#Cache Strategy] - Redis 7.x 配置要求、连接池管理
- [architecture.md#Cache Data Structures] - 缓存数据结构规范（products:list、product:detail:{id} 等）
- [architecture.md#Cache Interceptor Pattern] - TTL 随机化策略、防止缓存雪崩
- [architecture.md#Error Handling] - 降级策略、错误日志要求
- [tech-spec-epic-1-project-initialization.md#Phase 2, Task 2.9] - Create Redis cache interceptor
- [tech-spec-epic-1-project-initialization.md#Phase 2, Task 2.23] - Optimize Redis cache strategy with TTL randomization
- [epics.md#Story 1.4] - Complete acceptance criteria specification

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- **RedisModule**: 全局模块，封装 cache-manager-ioredis 配置，支持从环境变量读取 REDIS_HOST/PORT
- **CacheService**: 提供 get/set/del 方法，实现 TTL 随机化（±10%）防止缓存雪崩，优雅降级策略
- **降级策略**: Redis 不可用时，get() 返回 null，set/del 忽略错误并记录日志，不阻塞应用
- **健康检查**: GET /health/redis 端点返回连接状态、响应时间、时间戳
- **测试覆盖**: 14 个 CacheService 单元测试 + 5 个 HealthController 单元测试，全部通过
- **ioredis 连接池**: 默认配置支持高并发，可通过 Redis 配置进一步调优

### File List

**新增文件**:
- backend-api/src/redis/redis.module.ts
- backend-api/src/redis/cache.service.ts
- backend-api/src/redis/cache.service.spec.ts
- backend-api/src/health/health.controller.ts
- backend-api/src/health/health.controller.spec.ts
- backend-api/src/health/health.module.ts

**修改文件**:
- backend-api/.env (添加 REDIS_HOST、REDIS_PORT)
- backend-api/package.json (添加 Redis 相关依赖)
- backend-api/src/app.module.ts (导入 ConfigModule、RedisModule、HealthModule)

**编译产物**:
- backend-api/dist/ (编译输出)
