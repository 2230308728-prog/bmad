# bmad API 接口文档

**项目:** bmad 研学产品预订平台
**版本:** v1.0
**基础路径:** `/api/v1`
**协议:** HTTPS
**格式:** JSON

---

## 目录

- [概述](#概述)
- [通用规范](#通用规范)
- [认证 API](#认证-api)
- [产品 API](#产品-api)
- [订单 API](#订单-api)
- [支付 API](#支付-api)
- [退款 API](#退款-api)
- [通知 API](#通知-api)
- [用户管理 API](#用户管理-api)
- [数据分析 API](#数据分析-api)
- [错误码](#错误码)

---

## 概述

### API 版本控制

所有 API 都使用版本号前缀：

```
/api/v1/{resource}
```

未来版本：
```
/api/v2/{resource}
```

### 响应格式

**成功响应：**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-10T10:00:00Z",
    "version": "1.0"
  }
}
```

**列表响应：**
```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

**错误响应：**
```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

---

## 通用规范

### HTTP 方法

| 方法 | 说明 | 示例 |
|------|------|------|
| GET | 查询资源 | `GET /api/v1/products` |
| POST | 创建资源 | `POST /api/v1/orders` |
| PATCH | 更新资源 | `PATCH /api/v1/products/:id` |
| DELETE | 删除资源 | `DELETE /api/v1/products/:id` |

### 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 无内容（删除成功） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

### 认证方式

**家长端（小程序）：**
```
Authorization: Bearer {access_token}
```

**管理端（Web 后台）：**
```
Authorization: Bearer {access_token}
```

### 限流规则

| 接口类型 | 限制 |
|---------|------|
| 登录接口 | 10 次/分钟 |
| 订单接口 | 20 次/分钟 |
| 其他接口 | 60 次/分钟 |

超过限制返回 429 状态码。

---

## 认证 API

### 家长端认证

#### 1. 微信授权登录

**请求：**
```http
POST /api/v1/parent/auth/wechat-login
Content-Type: application/json

{
  "code": "081234567890abcdef",
  "userInfo": {
    "nickname": "张爸爸",
    "avatarUrl": "https://wx.qlogo.cn/..."
  }
}
```

**响应：**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "nickname": "张爸爸",
      "avatarUrl": "https://...",
      "role": "PARENT"
    }
  }
}
```

#### 2. 刷新令牌

**请求：**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**响应：**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 3. 登出

**请求：**
```http
POST /api/v1/auth/logout
Authorization: Bearer {access_token}
```

**响应：**
```json
{
  "data": {
    "message": "登出成功"
  }
}
```

### 管理端认证

#### 4. 管理员注册

**请求：**
```http
POST /api/v1/admin/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Password123",
  "nickname": "管理员"
}
```

**响应：**
```json
{
  "data": {
    "id": 1,
    "email": "admin@example.com",
    "nickname": "管理员",
    "role": "ADMIN"
  }
}
```

#### 5. 管理员登录

**请求：**
```http
POST /api/v1/admin/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Password123"
}
```

**响应：**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "nickname": "管理员",
      "role": "ADMIN"
    }
  }
}
```

---

## 产品 API

### 1. 获取产品列表

**请求：**
```http
GET /api/v1/products?page=1&pageSize=20&categoryId=1&sortBy=price_asc
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20，最大 50 |
| categoryId | number | 否 | 分类 ID |
| sortBy | string | 否 | 排序：price_asc, price_desc, created, popular |

**响应：**
```json
{
  "data": [
    {
      "id": 1,
      "title": "上海科技馆探索之旅",
      "price": "299.00",
      "originalPrice": "399.00",
      "images": ["https://oss.example.com/1.jpg"],
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

### 2. 搜索产品

**请求：**
```http
GET /api/v1/products/search?keyword=科技&minPrice=100&maxPrice=500&minAge=6&maxAge=12
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| categoryId | number | 否 | 分类筛选 |
| minPrice | decimal | 否 | 最低价格 |
| maxPrice | decimal | 否 | 最高价格 |
| minAge | number | 否 | 最小年龄 |
| maxAge | number | 否 | 最大年龄 |
| location | string | 否 | 地点筛选 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

### 3. 获取产品详情

**请求：**
```http
GET /api/v1/products/1
```

**响应：**
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

### 管理端产品 API

#### 4. 创建产品

**请求：**
```http
POST /api/v1/admin/products
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "新产品",
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

#### 5. 更新产品

**请求：**
```http
PATCH /api/v1/admin/products/1
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "更新后的标题",
  "price": 399.00
}
```

#### 6. 删除产品

**请求：**
```http
DELETE /api/v1/admin/products/1
Authorization: Bearer {admin_token}
```

#### 7. 更新产品状态

**请求：**
```http
PATCH /api/v1/admin/products/1/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "PUBLISHED"
}
```

#### 8. 更新库存

**请求：**
```http
PATCH /api/v1/admin/products/1/stock
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "stock": 100,
  "reason": "补货"
}
```

#### 9. 获取低库存产品

**请求：**
```http
GET /api/v1/admin/products/low-stock
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": [
    {
      "id": 1,
      "title": "产品名称",
      "stock": 5,
      "lowStock": true
    }
  ]
}
```

---

## 订单 API

### 1. 创建订单

**请求：**
```http
POST /api/v1/orders
Authorization: Bearer {access_token}
Content-Type: application/json

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

**响应：**
```json
{
  "data": {
    "id": 1,
    "orderNo": "ORD20240110123456789",
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

### 2. 查询我的订单列表

**请求：**
```http
GET /api/v1/orders?page=1&pageSize=10&status=PAID
Authorization: Bearer {access_token}
```

### 3. 查询订单详情

**请求：**
```http
GET /api/v1/orders/1
Authorization: Bearer {access_token}
```

**响应：**
```json
{
  "data": {
    "id": 1,
    "orderNo": "ORD20240110123456789",
    "status": "PAID",
    "totalAmount": "299.00",
    "paidAmount": "299.00",
    "paidAt": "2024-01-09T12:30:00Z",
    "product": {
      "id": 1,
      "title": "上海科技馆探索之旅",
      "description": "...",
      "images": ["https://..."],
      "location": "上海",
      "duration": "1天"
    },
    "childName": "张小明",
    "childAge": 8,
    "contactName": "张爸爸",
    "contactPhone": "138****8000",
    "bookingDate": "2024-02-15",
    "participantCount": 1,
    "remark": "如有食物过敏请提前告知",
    "refundRule": "活动开始前48小时可全额退款",
    "createdAt": "2024-01-09T12:00:00Z"
  }
}
```

### 管理端订单 API

#### 4. 获取所有订单

**请求：**
```http
GET /api/v1/admin/orders?page=1&pageSize=20&status=PAID&orderNo=ORD20240110
Authorization: Bearer {admin_token}
```

#### 5. 更新订单状态

**请求：**
```http
PATCH /api/v1/admin/orders/1/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "COMPLETED",
  "reason": "活动已完成"
}
```

#### 6. 获取订单统计

**请求：**
```http
GET /api/v1/admin/orders/stats
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": {
    "total": 1000,
    "pending": 50,
    "paid": 800,
    "completed": 100,
    "cancelled": 30,
    "refunded": 20,
    "todayCount": 25,
    "todayAmount": "7500.00"
  }
}
```

---

## 支付 API

### 1. 发起支付

**请求：**
```http
POST /api/v1/orders/1/payment
Authorization: Bearer {access_token}
```

**响应：**
```json
{
  "data": {
    "timeStamp": "1704782400",
    "nonceStr": "abc123",
    "package": "prepay_id=wx123456789",
    "signType": "RSA",
    "paySign": "签名"
  }
}
```

### 2. 查询支付状态

**请求：**
```http
GET /api/v1/orders/1/payment-status
Authorization: Bearer {access_token}
```

**响应（支付成功）：**
```json
{
  "data": {
    "orderId": 1,
    "orderNo": "ORD20240110123456789",
    "status": "PAID",
    "paidAt": "2024-01-09T12:30:00Z",
    "paidAmount": "299.00",
    "transactionId": "微信支付订单号"
  }
}
```

**响应（支付中）：**
```json
{
  "data": {
    "status": "PENDING",
    "message": "支付处理中，请稍后查询"
  }
}
```

### 3. 支付回调通知

**请求：**
```http
POST /api/v1/orders/payment/notify
Content-Type: application/json

{微信支付回调数据}
```

**响应：**
```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <return_msg><![CDATA[成功]]></return_msg>
</xml>
```

---

## 退款 API

### 1. 申请退款

**请求：**
```http
POST /api/v1/refunds
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "orderId": 1,
  "reason": "行程冲突",
  "description": "孩子临时有考试，无法参加",
  "images": ["https://oss.example.com/refunds/1/image1.jpg"]
}
```

**响应：**
```json
{
  "data": {
    "id": 1,
    "refundNo": "REF20240110123456789",
    "status": "PENDING",
    "refundAmount": "299.00",
    "appliedAt": "2024-01-09T12:00:00Z"
  }
}
```

### 2. 查询我的退款列表

**请求：**
```http
GET /api/v1/refunds?page=1&pageSize=10
Authorization: Bearer {access_token}
```

### 3. 查询退款详情

**请求：**
```http
GET /api/v1/refunds/1
Authorization: Bearer {access_token}
```

### 管理端退款 API

#### 4. 获取所有退款申请

**请求：**
```http
GET /api/v1/admin/refunds?page=1&pageSize=20&status=PENDING
Authorization: Bearer {admin_token}
```

#### 5. 审核通过退款

**请求：**
```http
PATCH /api/v1/admin/refunds/1/approve
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "adminNote": "符合退款条件"
}
```

#### 6. 审核拒绝退款

**请求：**
```http
PATCH /api/v1/admin/refunds/1/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "rejectedReason": "超过退款期限"
}
```

#### 7. 获取退款统计

**请求：**
```http
GET /api/v1/admin/refunds/stats
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": {
    "total": 50,
    "pending": 10,
    "approved": 30,
    "rejected": 5,
    "processing": 3,
    "completed": 2,
    "totalAmount": "15000.00",
    "pendingAmount": "3000.00"
  }
}
```

#### 8. 退款回调通知

**请求：**
```http
POST /api/v1/refunds/payment/notify
Content-Type: application/json

{微信退款回调数据}
```

---

## 通知 API

### 1. 获取消息模板列表

**请求：**
```http
GET /api/v1/notifications/templates
Authorization: Bearer {access_token}
```

**响应：**
```json
{
  "data": [
    {
      "id": "template_1",
      "title": "订单确认通知",
      "description": "支付成功后发送",
      "content": "您的订单{orderNo}已支付成功..."
    }
  ]
}
```

### 2. 订阅消息通知

**请求：**
```http
POST /api/v1/notifications/subscribe
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "templateIds": ["template_1", "template_2"]
}
```

---

## 用户管理 API

### 管理端用户 API

#### 1. 获取用户列表

**请求：**
```http
GET /api/v1/admin/users?page=1&pageSize=20&role=PARENT&status=ACTIVE
Authorization: Bearer {admin_token}
```

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| pageSize | number | 每页数量 |
| role | string | 角色筛选：PARENT/ADMIN |
| status | string | 状态筛选：ACTIVE/INACTIVE/BANNED |
| keyword | string | 搜索昵称或手机号 |

**响应：**
```json
{
  "data": [
    {
      "id": 1,
      "nickname": "张爸爸",
      "avatarUrl": "https://...",
      "role": "PARENT",
      "status": "ACTIVE",
      "phone": "138****8000",
      "orderCount": 5,
      "totalSpent": "1495.00",
      "lastOrderAt": "2024-01-08T10:00:00Z",
      "createdAt": "2023-12-01T12:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 2. 获取用户详情

**请求：**
```http
GET /api/v1/admin/users/1
Authorization: Bearer {admin_token}
```

#### 3. 更新用户状态

**请求：**
```http
PATCH /api/v1/admin/users/1/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "BANNED"
}
```

#### 4. 获取用户统计

**请求：**
```http
GET /api/v1/admin/users/stats
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": {
    "total": 150,
    "parents": 145,
    "admins": 5,
    "active": 140,
    "inactive": 5,
    "banned": 5,
    "todayRegistered": 3,
    "weekRegistered": 18,
    "monthRegistered": 65
  }
}
```

#### 5. 获取用户订单历史

**请求：**
```http
GET /api/v1/admin/users/1/orders?page=1&pageSize=20
Authorization: Bearer {admin_token}
```

#### 6. 获取用户订单汇总

**请求：**
```http
GET /api/v1/admin/users/1/order-summary
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": {
    "totalOrders": 15,
    "paidOrders": 12,
    "completedOrders": 10,
    "cancelledOrders": 2,
    "refundedOrders": 1,
    "totalSpent": "4485.00",
    "avgOrderAmount": "299.00",
    "firstOrderDate": "2023-12-01",
    "lastOrderDate": "2024-01-08",
    "favoriteCategory": {
      "id": 1,
      "name": "自然科学",
      "orderCount": 8
    },
    "monthlyStats": [
      { "month": "2023-12", "orders": 5, "amount": "1495.00" },
      { "month": "2024-01", "orders": 10, "amount": "2990.00" }
    ]
  }
}
```

---

## 数据分析 API

### 管理端仪表盘 API

#### 1. 获取概览数据

**请求：**
```http
GET /api/v1/admin/dashboard/overview
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": {
    "today": {
      "orders": 25,
      "ordersAmount": "7500.00",
      "newUsers": 3,
      "paidOrders": 20,
      "completedOrders": 15
    },
    "week": {
      "orders": 150,
      "ordersAmount": "45000.00",
      "newUsers": 18,
      "paidOrders": 120,
      "completedOrders": 100
    },
    "month": {
      "orders": 600,
      "ordersAmount": "180000.00",
      "newUsers": 65,
      "paidOrders": 480,
      "completedOrders": 400
    },
    "total": {
      "users": 150,
      "orders": 2000,
      "products": 50,
      "revenue": "600000.00"
    }
  }
}
```

#### 2. 获取订单趋势

**请求：**
```http
GET /api/v1/admin/dashboard/orders-trend?period=today&granularity=hour
Authorization: Bearer {admin_token}
```

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| period | string | today/week/month |
| granularity | string | hour/day |

**响应：**
```json
{
  "data": {
    "period": "today",
    "granularity": "hour",
    "data": [
      { "time": "09:00", "orders": 5, "amount": "1500.00" },
      { "time": "10:00", "orders": 8, "amount": "2400.00" },
      { "time": "11:00", "orders": 12, "amount": "3600.00" }
    ],
    "totalOrders": 25,
    "totalAmount": "7500.00"
  }
}
```

#### 3. 获取用户增长趋势

**请求：**
```http
GET /api/v1/admin/dashboard/users-trend?period=week
Authorization: Bearer {admin_token}
```

#### 4. 获取收入构成分析

**请求：**
```http
GET /api/v1/admin/dashboard/revenue-breakdown
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": {
    "byCategory": [
      { "category": "自然科学", "orders": 80, "amount": "24000.00", "percentage": 53.33 },
      { "category": "历史文化", "orders": 50, "amount": "15000.00", "percentage": 33.33 },
      { "category": "艺术体验", "orders": 20, "amount": "6000.00", "percentage": 13.33 }
    ],
    "byPaymentMethod": [
      { "method": "WECHAT", "amount": "45000.00", "percentage": 100 }
    ]
  }
}
```

#### 5. 获取热门产品排行

**请求：**
```http
GET /api/v1/admin/dashboard/popular-products?period=week&limit=10
Authorization: Bearer {admin_token}
```

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| period | string | week/month/all |
| limit | number | 返回数量，默认 10 |

**响应：**
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

#### 6. 获取转化漏斗分析

**请求：**
```http
GET /api/v1/admin/dashboard/conversion-funnel?period=week
Authorization: Bearer {admin_token}
```

**响应：**
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

#### 7. 获取产品详细表现

**请求：**
```http
GET /api/v1/admin/dashboard/product-performance/1
Authorization: Bearer {admin_token}
```

---

## 用户问题 API

### 管理端问题管理 API

#### 1. 获取问题列表

**请求：**
```http
GET /api/v1/admin/issues?page=1&pageSize=20&status=OPEN&priority=HIGH
Authorization: Bearer {admin_token}
```

#### 2. 创建问题

**请求：**
```http
POST /api/v1/admin/issues
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "userId": 1,
  "orderId": 5,
  "type": "COMPLAINT",
  "title": "活动时间变更问题",
  "description": "用户反映活动时间临时变更...",
  "priority": "HIGH"
}
```

#### 3. 更新问题状态

**请求：**
```http
PATCH /api/v1/admin/issues/1/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "RESOLVED",
  "assignedTo": 2,
  "resolution": "已联系用户协调，已达成一致"
}
```

#### 4. 获取问题统计

**请求：**
```http
GET /api/v1/admin/issues/stats
Authorization: Bearer {admin_token}
```

**响应：**
```json
{
  "data": {
    "total": 50,
    "open": 10,
    "inProgress": 15,
    "resolved": 20,
    "closed": 5,
    "urgent": 2,
    "high": 8,
    "avgResolutionTime": "24小时",
    "todayCreated": 3
  }
}
```

---

## 图片上传 API

### 1. 获取 OSS 上传签名

**请求：**
```http
POST /api/v1/admin/products/images/upload
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "fileName": "product_image.jpg",
  "fileSize": 1024000
}
```

**响应：**
```json
{
  "data": {
    "uploadUrl": "https://bucket.oss-region.aliyuncs.com/...",
    "signature": "signature",
    "policy": "base64_policy",
    "accessKeyId": "access_key_id",
    "expiresIn": 900
  }
}
```

---

## 错误码

| 错误码 | 说明 | 示例 |
|--------|------|------|
| 400 | 请求参数错误 | 验证失败、格式错误 |
| 401 | 未认证 | Token 缺失或无效 |
| 403 | 权限不足 | 非管理员访问管理接口 |
| 404 | 资源不存在 | 产品/订单不存在 |
| 409 | 资源冲突 | 订单已支付、库存不足 |
| 429 | 请求过于频繁 | 超过限流阈值 |
| 500 | 服务器错误 | 内部错误 |

### 错误响应示例

**400 参数验证错误：**
```json
{
  "statusCode": 400,
  "message": "验证失败",
  "error": [
    "childName must be a string",
    "childAge must be a positive number"
  ],
  "timestamp": "2024-01-10T10:00:00Z"
}
```

**401 未认证：**
```json
{
  "statusCode": 401,
  "message": "未授权访问",
  "error": "Unauthorized",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

**404 资源不存在：**
```json
{
  "statusCode": 404,
  "message": "产品不存在",
  "error": "Not Found",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

**409 业务冲突：**
```json
{
  "statusCode": 409,
  "message": "库存不足，请选择其他日期或产品",
  "error": "Conflict",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

---

## 附录

### API 端点清单

**认证 API (5个)**
- POST /api/v1/parent/auth/wechat-login
- POST /api/v1/admin/auth/register
- POST /api/v1/admin/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

**产品 API (9个)**
- GET /api/v1/products
- GET /api/v1/products/search
- GET /api/v1/products/:id
- POST /api/v1/admin/products
- PATCH /api/v1/admin/products/:id
- DELETE /api/v1/admin/products/:id
- PATCH /api/v1/admin/products/:id/status
- PATCH /api/v1/admin/products/:id/stock
- GET /api/v1/admin/products/low-stock

**订单 API (6个)**
- POST /api/v1/orders
- GET /api/v1/orders
- GET /api/v1/orders/:id
- GET /api/v1/admin/orders
- PATCH /api/v1/admin/orders/:id/status
- GET /api/v1/admin/orders/stats

**支付 API (3个)**
- POST /api/v1/orders/:id/payment
- GET /api/v1/orders/:id/payment-status
- POST /api/v1/orders/payment/notify

**退款 API (8个)**
- POST /api/v1/refunds
- GET /api/v1/refunds
- GET /api/v1/refunds/:id
- GET /api/v1/admin/refunds
- GET /api/v1/admin/refunds/:id
- PATCH /api/v1/admin/refunds/:id/approve
- PATCH /api/v1/admin/refunds/:id/reject
- GET /api/v1/admin/refunds/stats

**通知 API (2个)**
- GET /api/v1/notifications/templates
- POST /api/v1/notifications/subscribe

**用户管理 API (6个)**
- GET /api/v1/admin/users
- GET /api/v1/admin/users/:id
- PATCH /api/v1/admin/users/:id/status
- GET /api/v1/admin/users/stats
- GET /api/v1/admin/users/:id/orders
- GET /api/v1/admin/users/:id/order-summary

**数据分析 API (7个)**
- GET /api/v1/admin/dashboard/overview
- GET /api/v1/admin/dashboard/orders-trend
- GET /api/v1/admin/dashboard/users-trend
- GET /api/v1/admin/dashboard/revenue-breakdown
- GET /api/v1/admin/dashboard/popular-products
- GET /api/v1/admin/dashboard/conversion-funnel
- GET /api/v1/admin/dashboard/product-performance/:id

**用户问题 API (4个)**
- GET /api/v1/admin/issues
- POST /api/v1/admin/issues
- PATCH /api/v1/admin/issues/:id/status
- GET /api/v1/admin/issues/stats

**图片上传 API (1个)**
- POST /api/v1/admin/products/images/upload

**总计：51 个 API 端点**

### Swagger 文档

开发环境访问：
```
http://localhost:3000/api-docs
```

### Postman 集合

可以导入以下 Postman Collection 进行测试：
```json
{
  "info": {
    "name": "bmad API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  }
}
```

---

**文档维护者:** Zhang
**最后更新:** 2026-01-10
**版本:** 1.0
