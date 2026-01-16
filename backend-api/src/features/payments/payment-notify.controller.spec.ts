import { Test, TestingModule } from '@nestjs/testing';
import { PaymentNotifyController } from './payment-notify.controller';
import { WechatPayService } from './wechat-pay.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { HttpException } from '@nestjs/common';

describe('PaymentNotifyController', () => {
  let controller: PaymentNotifyController;
  let wechatPayService: WechatPayService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockWechatPayService = {
    verifyNotify: jest.fn(),
    decipherNotify: jest.fn(),
  };

  const mockPrismaService = {
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    paymentRecord: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCacheService = {
    incrby: jest.fn(),
    del: jest.fn(),
  };

  const mockOrder = {
    id: 1,
    orderNo: 'ORD20240114123456789',
    userId: 1,
    totalAmount: new Prisma.Decimal(299),
    actualAmount: new Prisma.Decimal(299),
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paidAt: null,
    items: [
      {
        productId: 10,
        quantity: 1,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentNotifyController],
      providers: [
        {
          provide: WechatPayService,
          useValue: mockWechatPayService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    controller = module.get<PaymentNotifyController>(PaymentNotifyController);
    wechatPayService = module.get<WechatPayService>(WechatPayService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handlePaymentNotify', () => {
    const validNotifyData = {
      id: 'notify-id-123',
      create_time: '2024-01-14T10:00:00+08:00',
      resource_type: 'encrypt-resource',
      event_type: 'TRANSACTION.SUCCESS',
      resource: {
        algorithm: 'AEAD_AES_256_GCM',
        ciphertext: 'encrypted-data',
        nonce: 'nonce123',
        associated_data: 'associated-data',
      },
    };

    const mockHeaders = {
      'wechatpay-timestamp': '1645123456',
      'wechatpay-nonce': 'abc123',
      'wechatpay-signature': 'signature123',
      'wechatpay-serial': 'serial123',
    };

    const decryptedData = {
      appid: 'wx1234567890',
      mchid: '1234567890',
      out_trade_no: 'ORD20240114123456789',
      transaction_id: 'wx1234567890',
      trade_type: 'JSAPI',
      trade_state: 'SUCCESS',
      trade_state_desc: '支付成功',
      bank_type: 'CFT',
      attach: '',
      success_time: '2024-01-14T10:00:00+08:00',
      payer: {
        openid: 'oXYZ_abcdefg1234567890hijklmnop',
      },
      amount: {
        total: 29900,
        payer_total: 29900,
        currency: 'CNY',
        payer_currency: 'CNY',
      },
      scene_info: {
        device_id: 'device123',
      },
      promote_info: '',
    };

    it('should handle successful payment notification', async () => {
      // Mock signature verification success
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      // Mock data decryption
      mockWechatPayService.decipherNotify.mockReturnValue(decryptedData);
      // Mock order found
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      // Mock transaction success
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
      // Mock order update
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      });
      // Mock product update
      mockPrismaService.product.update.mockResolvedValue({});
      // Mock payment record creation
      mockPrismaService.paymentRecord.create.mockResolvedValue({});

      const result = await controller.handlePaymentNotify(
        validNotifyData,
        mockHeaders,
      );

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      expect(wechatPayService.verifyNotify).toHaveBeenCalledWith(
        '1645123456',
        'abc123',
        JSON.stringify(validNotifyData),
        'signature123',
        'serial123',
      );
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.SUCCESS,
          paidAt: expect.any(Date),
        },
      });
    });

    it('should return SUCCESS for idempotent notification (order already PAID)', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue(decryptedData);
      // Order already PAID
      mockPrismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.SUCCESS,
      });

      const result = await controller.handlePaymentNotify(
        validNotifyData,
        mockHeaders,
      );

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      // Should not update order again
      expect(prismaService.order.update).not.toHaveBeenCalled();
    });

    it('should handle failed payment notification', async () => {
      const failedNotifyData = {
        ...validNotifyData,
        event_type: 'TRANSACTION.CLOSED',
      };

      const failedDecryptedData = {
        ...decryptedData,
        trade_state: 'CLOSED',
        trade_state_desc: '订单关闭',
      };

      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue(failedDecryptedData);
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      // Mock transaction for failure handling
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.CANCELLED,
      });
      mockCacheService.incrby.mockResolvedValue(10);

      const result = await controller.handlePaymentNotify(
        failedNotifyData,
        mockHeaders,
      );

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          cancelledAt: expect.any(Date),
        },
      });
      expect(cacheService.incrby).toHaveBeenCalledWith('product:stock:10', 1);
    });

    it('should return SUCCESS for idempotent notification (order already CANCELLED)', async () => {
      const failedNotifyData = {
        ...validNotifyData,
        event_type: 'TRANSACTION.CLOSED',
      };

      const failedDecryptedData = {
        ...decryptedData,
        trade_state: 'CLOSED',
      };

      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue(failedDecryptedData);
      // Order already CANCELLED
      mockPrismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.CANCELLED,
      });

      const result = await controller.handlePaymentNotify(
        failedNotifyData,
        mockHeaders,
      );

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      // Should not update order or release stock again
      expect(prismaService.order.update).not.toHaveBeenCalled();
      expect(cacheService.incrby).not.toHaveBeenCalled();
    });

    it('should throw HttpException when signature verification fails', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(false);

      await expect(
        controller.handlePaymentNotify(validNotifyData, mockHeaders),
      ).rejects.toThrow(HttpException);
    });

    it('should throw HttpException (500) when order not found', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue(decryptedData);
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        controller.handlePaymentNotify(validNotifyData, mockHeaders),
      ).rejects.toThrow(HttpException);
    });

    it('should throw HttpException (500) when amount mismatch', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue({
        ...decryptedData,
        amount: {
          ...decryptedData.amount,
          total: 10000, // Different amount
        },
      });
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        controller.handlePaymentNotify(validNotifyData, mockHeaders),
      ).rejects.toThrow(HttpException);
    });

    it('should throw HttpException when required headers are missing', async () => {
      const incompleteHeaders = {
        'wechatpay-timestamp': '1645123456',
        // Missing other required headers
      };

      await expect(
        controller.handlePaymentNotify(
          validNotifyData,
          incompleteHeaders as any,
        ),
      ).rejects.toThrow(HttpException);
    });
  });
});
