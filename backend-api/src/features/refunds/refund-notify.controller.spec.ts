import { Test, TestingModule } from '@nestjs/testing';
import { RefundNotifyController } from './refund-notify.controller';
import { WechatPayService } from '../payments/wechat-pay.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RefundStatus } from '@prisma/client';
import { RefundNotifyRequestDto } from './dto/refund-notify.dto';

describe('RefundNotifyController', () => {
  let controller: RefundNotifyController;
  let wechatPayService: WechatPayService;
  let prismaService: PrismaService;

  const mockWechatPayService = {
    verifyNotify: jest.fn(),
    decipherNotify: jest.fn(),
  };

  const mockPrismaService = {
    refundRecord: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationsService = {
    sendRefundNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundNotifyController],
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
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<RefundNotifyController>(RefundNotifyController);
    wechatPayService = module.get<WechatPayService>(WechatPayService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleRefundNotify', () => {
    const mockNotifyDto: RefundNotifyRequestDto = {
      timestamp: '1234567890',
      nonce: 'abc123',
      signature: 'signature',
      serial: 'serial_no',
      resource: {
        ciphertext: 'encrypted_data',
        associated_data: 'REF20240114123456789',
        nonce: 'random_nonce',
      },
    };

    it('should return FAIL when signature verification fails', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(false);

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'FAIL',
        message: '签名验证失败',
      });
      expect(wechatPayService.verifyNotify).toHaveBeenCalledWith(
        '1234567890',
        'abc123',
        JSON.stringify(mockNotifyDto),
        'signature',
        'serial_no',
      );
    });

    it('should return FAIL when refund record not found', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue({
        out_refund_no: 'REF20240114123456789',
        refund_id: 'REFUND_WX_123',
        status: 'SUCCESS',
      });
      mockPrismaService.refundRecord.findUnique.mockResolvedValue(null);

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'FAIL',
        message: '退款记录不存在',
      });
    });

    it('should handle SUCCESS status and update refund to COMPLETED', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue({
        out_refund_no: 'REF20240114123456789',
        refund_id: 'REFUND_WX_123',
        status: 'SUCCESS',
      });

      const mockRefundRecord = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.PROCESSING,
        order: { id: 1 },
      };

      mockPrismaService.refundRecord.findUnique.mockResolvedValue(
        mockRefundRecord,
      );
      mockPrismaService.refundRecord.update.mockResolvedValue({
        id: 1,
        status: RefundStatus.COMPLETED,
        wechatRefundId: 'REFUND_WX_123',
        refundedAt: new Date(),
      });

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      expect(prismaService.refundRecord.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: RefundStatus.COMPLETED,
          wechatRefundId: 'REFUND_WX_123',
          refundedAt: expect.any(Date),
        },
      });
    });

    it('should handle ABNORMAL status and update refund to FAILED', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue({
        out_refund_no: 'REF20240114123456789',
        refund_id: 'REFUND_WX_123',
        status: 'ABNORMAL',
      });

      const mockRefundRecord = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.PROCESSING,
        order: { id: 1 },
      };

      mockPrismaService.refundRecord.findUnique.mockResolvedValue(
        mockRefundRecord,
      );
      mockPrismaService.refundRecord.update.mockResolvedValue({
        id: 1,
        status: RefundStatus.FAILED,
        wechatRefundId: 'REFUND_WX_123',
      });

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      expect(prismaService.refundRecord.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: RefundStatus.FAILED,
          wechatRefundId: 'REFUND_WX_123',
        },
      });
    });

    it('should handle PROCESSING status without updating', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue({
        out_refund_no: 'REF20240114123456789',
        refund_id: 'REFUND_WX_123',
        status: 'PROCESSING',
      });

      const mockRefundRecord = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.PROCESSING,
        order: { id: 1 },
      };

      mockPrismaService.refundRecord.findUnique.mockResolvedValue(
        mockRefundRecord,
      );

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      expect(prismaService.refundRecord.update).not.toHaveBeenCalled();
    });

    it('should handle idempotency - skip already COMPLETED refund', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue({
        out_refund_no: 'REF20240114123456789',
        refund_id: 'REFUND_WX_123',
        status: 'SUCCESS',
      });

      const mockRefundRecord = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.COMPLETED,
        order: { id: 1 },
      };

      mockPrismaService.refundRecord.findUnique.mockResolvedValue(
        mockRefundRecord,
      );

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      expect(prismaService.refundRecord.update).not.toHaveBeenCalled();
    });

    it('should handle idempotency - skip already FAILED refund', async () => {
      mockWechatPayService.verifyNotify.mockResolvedValue(true);
      mockWechatPayService.decipherNotify.mockReturnValue({
        out_refund_no: 'REF20240114123456789',
        refund_id: 'REFUND_WX_123',
        status: 'SUCCESS',
      });

      const mockRefundRecord = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.FAILED,
        order: { id: 1 },
      };

      mockPrismaService.refundRecord.findUnique.mockResolvedValue(
        mockRefundRecord,
      );

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'SUCCESS',
        message: '成功',
      });
      expect(prismaService.refundRecord.update).not.toHaveBeenCalled();
    });

    it('should handle errors and return FAIL', async () => {
      mockWechatPayService.verifyNotify.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await controller.handleRefundNotify(mockNotifyDto);

      expect(result).toEqual({
        code: 'FAIL',
        message: '处理失败',
      });
    });
  });
});
