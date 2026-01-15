# 微信支付 SDK 集成指南

**文档日期：** 2026-01-14
**Epic：** Epic 4 - 预订与支付
**目的：** 为 Epic 4 故事提供微信支付集成参考

---

## 1. 概述

微信支付 API v3 是微信支付平台提供的最新版本接口，采用 RESTful 风格设计，使用 JSON 格式进行数据交换（替代 v2 的 XML 格式），使用 SHA256-RSA 数字签名算法。

### 关键特性

- **RESTful API 设计**：资源导向的 URL 设计
- **JSON 数据格式**：更易于解析和处理
- **异步通知机制**：支付结果通过回调通知
- **证书签名验证**：确保通信安全
- **多种支付方式**：JSAPI 支付、Native 支付、H5 支付等

---

## 2. SDK 选型

### 推荐方案：wechatpay-node-v3-ts

**项目地址：** [klover2/wechatpay-node-v3-ts](https://github.com/klover2/wechatpay-node-v3-ts)

**选择理由：**
- ✅ TypeScript 原生支持，类型安全
- ✅ 完整的 API v3 实现
- ✅ 活跃的社区维护（759+ stars, 131 forks）
- ✅ NestJS 友好，易于集成
- ✅ 支持所有主要支付场景

**安装：**
```bash
npm install wechatpay-node-v3-ts
```

### 备选方案

| 包名 | 优点 | 缺点 |
|------|------|------|
| `wechat-pay-nodejs` | 文档完善 | 非 TypeScript |
| `wechat-pay-v3-sdk` | 类型完整 | 需要 Node.js > 15.6 |
| `@jsrsc/wechat-pay` | 轻量级 | 维护较少 |

---

## 3. 集成步骤

### 3.1 准备工作

**前置条件：**
1. 注册微信支付商户账号
2. 获取商户号 (mchid)
3. 获取商户 API 密钥 (APIv3 key)
4. 下载商户证书 (apiclient_cert.pem, apiclient_key.pem)
5. 获取微信支付平台证书序列号
6. 配置支付回调 URL

**环境变量配置：**
```env
# 微信支付配置
WECHAT_PAY_MCHID=1234567890
WECHAT_PAY_SERIAL_NO=XXXXXXXXXXXXXXXXXXXX
WECHAT_PAY_APIV3_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
WECHAT_PAY_CERT_PATH=./certs/apiclient_cert.pem
WECHAT_PAY_KEY_PATH=./certs/apiclient_key.pem
WECHAT_PAY_NOTIFY_URL=https://your-domain.com/api/v1/payments/notify
```

### 3.2 创建微信支付模块

```bash
nest g module payments
nest g service payments
nest g controller payments
```

### 3.3 安装依赖

```bash
npm install wechatpay-node-v3-ts
npm install uuid  # 用于生成订单号
```

### 3.4 配置微信支付服务

**文件：** `backend-api/src/payments/wechat-pay.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Wechatpay, Formatter } from 'wechatpay-node-v3-ts';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly wechatpay: Wechatpay;

  constructor(private readonly configService: ConfigService) {
    // 初始化微信支付客户端
    this.wechatpay = new Wechatpay({
      appid: this.configService.get('WECHAT_PAY_APPID'),
      mchid: this.configService.get('WECHAT_PAY_MCHID'),
      serial_no: this.configService.get('WECHAT_PAY_SERIAL_NO'),
      apiV3Key: this.configService.get('WECHAT_PAY_APIV3_KEY'),
      apiclient_key: fs.readFileSync(
        path.join(__dirname, '../../certs/apiclient_key.pem'),
      ),
      notify_url: this.configService.get('WECHAT_PAY_NOTIFY_URL'),
    });

    this.logger.log('WeChat Pay service initialized');
  }

  /**
   * 创建 JSAPI 支付订单（小程序/公众号）
   * @param orderId 系统订单号
   * @param amount 支付金额（分）
   * @param description 商品描述
   * @param openid 用户 openid
   * @returns 预支付交易会话标识
   */
  async createJsApiOrder(
    orderId: string,
    amount: number,
    description: string,
    openid: string,
  ) {
    const params = {
      appid: this.configService.get('WECHAT_PAY_APPID'),
      mchid: this.configService.get('WECHAT_PAY_MCHID'),
      description,
      out_trade_no: orderId,
      notify_url: this.configService.get('WECHAT_PAY_NOTIFY_URL'),
      amount: {
        total: amount,
        currency: 'CNY',
      },
      payer: {
        openid,
      },
    };

    const result = await this.wechatpay.transactions_jsapi(params);

    this.logger.log(`Created JSAPI order: ${orderId}`);

    return result;
  }

  /**
   * 创建 Native 支付订单（扫码支付）
   * @param orderId 系统订单号
   * @param amount 支付金额（分）
   * @param description 商品描述
   * @returns 二维码链接
   */
  async createNativeOrder(
    orderId: string,
    amount: number,
    description: string,
  ) {
    const params = {
      appid: this.configService.get('WECHAT_PAY_APPID'),
      mchid: this.configService.get('WECHAT_PAY_MCHID'),
      description,
      out_trade_no: orderId,
      notify_url: this.configService.get('WECHAT_PAY_NOTIFY_URL'),
      amount: {
        total: amount,
        currency: 'CNY',
      },
    };

    const result = await this.wechatpay.transactions_native(params);

    this.logger.log(`Created Native order: ${orderId}`);

    return result;
  }

  /**
   * 查询订单
   * @param orderId 系统订单号
   * @returns 订单详情
   */
  async queryOrder(orderId: string) {
    const result = await this.wechatpay.query({
      out_trade_no: orderId,
    });

    return result;
  }

  /**
   * 关闭订单
   * @param orderId 系统订单号
   */
  async closeOrder(orderId: string) {
    await this.wechatpay.close({
      out_trade_no: orderId,
    });

    this.logger.log(`Closed order: ${orderId}`);
  }

  /**
   * 申请退款
   * @param transactionId 微信支付订单号
   * @param outRefundNo 退款订单号
   * @param amount 退款金额（分）
   * @param totalAmount 订单总金额（分）
   */
  async refund(
    transactionId: string,
    outRefundNo: string,
    amount: number,
    totalAmount: number,
  ) {
    const params = {
      transaction_id: transactionId,
      out_refund_no: outRefundNo,
      amount: {
        refund: amount,
        total: totalAmount,
        currency: 'CNY',
      },
    };

    const result = await this.wechatpay.refund(params);

    this.logger.log(`Refund initiated: ${outRefundNo}`);

    return result;
  }

  /**
   * 验证支付通知签名
   * @param headers 请求头
   * @param body 请求体
   * @returns 解密后的通知数据
   */
  verifyNotify(headers: any, body: any) {
    const signature = headers['wechatpay-signature'];
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const serial = headers['wechatpay-serial'];

    // 验证签名并解密数据
    const result = this.wechatpay.verify({
      signature,
      timestamp,
      nonce,
      body: JSON.stringify(body),
    });

    return result;
  }
}
```

### 3.5 创建支付控制器

**文件：** `backend-api/src/payments/payments.controller.ts`

```typescript
import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { WechatPayService } from './wechat-pay.service';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * 创建支付订单（JSAPI）
   */
  @Post('create-jsapi')
  async createJsApiPayment(@Body() createPaymentDto: CreatePaymentDto) {
    const { orderId, productId, openid } = createPaymentDto;

    // 1. 创建系统订单
    const order = await this.paymentsService.createOrder(orderId, productId);

    // 2. 调用微信支付
    const payment = await this.wechatPayService.createJsApiOrder(
      orderId,
      order.amount,
      order.description,
      openid,
    );

    return {
      orderId,
      prepayId: payment.prepay_id,
      // 前端需要的支付参数
      paySign: this.generatePaySign(payment.prepay_id),
    };
  }

  /**
   * 创建支付订单（Native 扫码）
   */
  @Post('create-native')
  async createNativePayment(@Body() createPaymentDto: CreatePaymentDto) {
    const { orderId, productId } = createPaymentDto;

    // 1. 创建系统订单
    const order = await this.paymentsService.createOrder(orderId, productId);

    // 2. 调用微信支付
    const payment = await this.wechatPayService.createNativeOrder(
      orderId,
      order.amount,
      order.description,
    );

    return {
      orderId,
      codeUrl: payment.code_url,
    };
  }

  /**
   * 微信支付回调通知
   */
  @Post('notify')
  async handlePaymentNotify(
    @Headers() headers: any,
    @Body() body: any,
  ) {
    this.logger.log(`Received payment notification: ${JSON.stringify(body)}`);

    // 1. 验证签名
    const notify = this.wechatPayService.verifyNotify(headers, body);

    // 2. 更新订单状态
    await this.paymentsService.handlePaymentSuccess(
      notify.resource.out_trade_no,
      notify.resource.transaction_id,
    );

    // 3. 返回成功响应
    return { code: 'SUCCESS', message: '成功' };
  }

  /**
   * 查询支付结果
   */
  @Post('query')
  async queryPayment(@Body('orderId') orderId: string) {
    const result = await this.wechatPayService.queryOrder(orderId);
    return result;
  }

  /**
   * 生成前端支付签名
   */
  private generatePaySign(prepayId: string) {
    // 实现前端支付签名生成逻辑
    // 参考：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_5_4.shtml
    return {
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: Math.random().toString(36).substring(2),
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: '', // 使用商户私钥签名
    };
  }
}
```

---

## 4. 数据模型设计

### 4.1 Prisma Schema

```prisma
enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDING
  REFUNDED
  CANCELLED
}

enum PaymentChannel {
  WECHAT_JSAPI
  WECHAT_NATIVE
  WECHAT_H5
  ALIPAY
}

model Order {
  id            Int           @id @default(autoincrement())
  orderNo       String        @unique
  userId        Int
  productId     Int
  amount        Decimal       @db.Decimal(10, 2)
  status        OrderStatus   @default(PENDING)
  paymentStatus PaymentStatus @default(PENDING)
  paymentChannel PaymentChannel?

  // 微信支付相关
  transactionId String?       // 微信支付订单号
  prepayId      String?       // 预支付交易会话标识

  // 时间戳
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  user          User          @relation(fields: [userId], references: [id])
  product       Product       @relation(fields: [productId], references: [id])

  @@map("orders")
}

model PaymentRecord {
  id            Int           @id @default(autoincrement())
  orderId       Int
  transactionId String        @unique
  amount        Decimal       @db.Decimal(10, 2)
  status        PaymentStatus
  channel       PaymentChannel
  notifyData    Json?         // 支付通知原始数据

  createdAt     DateTime      @default(now())

  order         Order         @relation(fields: [orderId], references: [id])

  @@map("payment_records")
}
```

---

## 5. 测试环境配置

### 5.1 微信支付沙箱环境

微信支付提供沙箱环境用于测试：

- **沙箱商户号**：自动生成
- **沙箱 API 密钥**：自动生成
- **测试用户**：微信提供的测试账号

**配置：**
```env
WECHAT_PAY_SANDBOX=true
WECHAT_PAY_SANDBOX_MCHID=sandbox_mchid
WECHAT_PAY_SANDBOX_KEY=sandbox_key
```

### 5.2 单元测试示例

```typescript
describe('WechatPayService', () => {
  let service: WechatPayService;

  const mockWechatpay = {
    transactions_jsapi: jest.fn(),
    transactions_native: jest.fn(),
    query: jest.fn(),
    close: jest.fn(),
    refund: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WechatPayService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              const config = {
                WECHAT_PAY_APPID: 'test_appid',
                WECHAT_PAY_MCHID: 'test_mchid',
                // ...其他配置
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WechatPayService>(WechatPayService);
  });

  it('should create JSAPI order successfully', async () => {
    mockWechatpay.transactions_jsapi.mockResolvedValue({
      prepay_id: 'test_prepay_id',
    });

    const result = await service.createJsApiOrder(
      'ORDER123',
      29900,
      'Test Product',
      'test_openid',
    );

    expect(result).toHaveProperty('prepay_id');
  });
});
```

---

## 6. 安全考虑

### 6.1 签名验证

- ✅ 所有请求必须验证签名
- ✅ 使用平台证书验证回调通知
- ✅ 敏感信息加密存储

### 6.2 证书管理

```bash
# 证书目录结构
backend-api/
├── certs/
│   ├── apiclient_cert.pem    # 商户证书
│   ├── apiclient_key.pem     # 商户私钥
│   └── .gitkeep              # 确保 .gitignore 忽略此目录
```

**.gitignore 配置：**
```gitignore
# 忽略证书文件
certs/*.pem
certs/*.p12
```

### 6.3 环境变量

- ✅ 使用 `.env.example` 提供配置模板
- ✅ 生产环境使用环境变量或密钥管理服务
- ✅ 定期轮换 API 密钥

---

## 7. 常见问题

### Q1: 如何处理支付超时？

**A:** 设置订单超时时间，使用定时任务检查并关闭超时订单：

```typescript
@Cron('*/5 * * * *') // 每 5 分钟执行
async checkExpiredOrders() {
  const expiredOrders = await this.paymentsService.findExpiredOrders();

  for (const order of expiredOrders) {
    await this.wechatPayService.closeOrder(order.orderNo);
    await this.paymentsService.updateOrderStatus(order.id, 'CANCELLED');
  }
}
```

### Q2: 如何处理重复支付通知？

**A:** 使用幂等性检查：

```typescript
async handlePaymentSuccess(orderId: string, transactionId: string) {
  // 检查订单是否已处理
  const existing = await this.prisma.paymentRecord.findUnique({
    where: { transactionId },
  });

  if (existing) {
    this.logger.warn(`Duplicate notification: ${transactionId}`);
    return;
  }

  // 处理支付成功
  await this.prisma.$transaction([
    // 更新订单状态
    this.prisma.order.update({
      where: { orderNo: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    }),
    // 创建支付记录
    this.prisma.paymentRecord.create({
      data: {
        orderId,
        transactionId,
        amount,
        status: 'PAID',
        channel: 'WECHAT_JSAPI',
      },
    }),
  ]);
}
```

### Q3: 如何测试支付回调？

**A:** 使用内网穿透工具（如 ngrok）暴露本地服务：

```bash
ngrok http 3000
```

配置微信支付回调 URL 为 ngrok 提供的公网地址。

---

## 8. 参考资料

### 官方文档

- [微信支付 API v3 文档](https://pay.weixin.qq.com/doc/global/v3/en/4012356434)
- [微信支付 Node.js SDK 示例](https://pay.weixin.qq.com/doc/global/v3/en/4012356404)
- [WechatPay-API-v3 简介](https://wechatpay-api.gitbook.io/wechatpay-api-v3)

### 开源项目

- [wechatpay-node-v3-ts](https://github.com/klover2/wechatpay-node-v3-ts) - TypeScript SDK
- [wechat-pay-v3-sdk](https://github.com/wwog/wechat-pay-v3-sdk) - 完整类型 SDK

### NPM 包

- [wechatpay-node-v3-ts](https://www.npmjs.com/package/wechatpay-node-v3-ts)
- [wechat-pay-nodejs](https://www.npmjs.com/package/wechat-pay-nodejs)

---

**文档版本：** 1.0
**最后更新：** 2026-01-14
**维护者：** Dev Team
