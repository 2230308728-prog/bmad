import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { WechatPayService } from './wechat-pay.service';
import { PrismaService } from '../../lib/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let wechatPayService: WechatPayService;
  let prismaService: PrismaService;

  const mockWechatPayService = {
    isAvailable: jest.fn(),
    createJsapiOrder: jest.fn(),
    generateJsapiParams: jest.fn(),
  };

  const mockPrismaService = {
    order: {
      findFirst: jest.fn(),
    },
  };

  const mockUser: CurrentUserType = {
    id: 1,
    role: 'PARENT',
  };

  const mockOrder = {
    id: 1,
    orderNo: 'ORD20240114123456789',
    userId: 1,
    totalAmount: new Prisma.Decimal(299),
    actualAmount: new Prisma.Decimal(299),
    status: OrderStatus.PENDING,
    items: [
      {
        productName: '上海科技馆探索之旅',
        productPrice: new Prisma.Decimal(299),
        quantity: 1,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: WechatPayService,
          useValue: mockWechatPayService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    wechatPayService = module.get<WechatPayService>(WechatPayService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPayment', () => {
    const validOpenid = 'oXYZ_abcdefg1234567890hijklmnop'; // 32 chars, valid format
    const createPaymentDto: CreatePaymentDto = {
      openid: validOpenid,
    };

    it('should create payment successfully', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockWechatPayService.isAvailable.mockReturnValue(true);
      mockWechatPayService.createJsapiOrder.mockResolvedValue('wx1234567890');
      mockWechatPayService.generateJsapiParams.mockReturnValue({
        timeStamp: '1645123456',
        nonceStr: 'abc123',
        package: 'prepay_id=wx1234567890',
        signType: 'RSA',
        paySign: 'signature...',
      });

      const result = await controller.createPayment(mockUser, 1, createPaymentDto);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('timeStamp');
      expect(result.data).toHaveProperty('nonceStr');
      expect(result.data).toHaveProperty('package');
      expect(result.data).toHaveProperty('signType');
      expect(result.data).toHaveProperty('paySign');
      expect(mockWechatPayService.createJsapiOrder).toHaveBeenCalledWith(
        '上海科技馆探索之旅',
        'ORD20240114123456789',
        29900, // 299 * 100
        validOpenid,
      );
    });

    it('should throw BadRequestException when order does not exist', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(controller.createPayment(mockUser, 1, createPaymentDto)).rejects.toThrow(
        new BadRequestException('订单不存在或不属于当前用户'),
      );
      expect(mockWechatPayService.createJsapiOrder).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when order status is not PENDING', async () => {
      const paidOrder = { ...mockOrder, status: OrderStatus.PAID };
      mockPrismaService.order.findFirst.mockResolvedValue(paidOrder);

      await expect(controller.createPayment(mockUser, 1, createPaymentDto)).rejects.toThrow(
        new BadRequestException('订单状态不正确，无法支付'),
      );
      expect(mockWechatPayService.createJsapiOrder).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when WeChat Pay service is unavailable', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockWechatPayService.isAvailable.mockReturnValue(false);

      await expect(controller.createPayment(mockUser, 1, createPaymentDto)).rejects.toThrow(
        new BadRequestException('支付服务暂时不可用，请稍后重试'),
      );
      expect(mockWechatPayService.createJsapiOrder).not.toHaveBeenCalled();
    });

    it('should use correct description for multiple products', async () => {
      const multiItemOrder = {
        ...mockOrder,
        totalAmount: new Prisma.Decimal(300),
        items: [
          { productName: '产品1', productPrice: new Prisma.Decimal(100), quantity: 1 },
          { productName: '产品2', productPrice: new Prisma.Decimal(200), quantity: 1 },
        ],
      };
      mockPrismaService.order.findFirst.mockResolvedValue(multiItemOrder);
      mockWechatPayService.isAvailable.mockReturnValue(true);
      mockWechatPayService.createJsapiOrder.mockResolvedValue('wx1234567890');
      mockWechatPayService.generateJsapiParams.mockReturnValue({
        timeStamp: '1645123456',
        nonceStr: 'abc123',
        package: 'prepay_id=wx1234567890',
        signType: 'RSA',
        paySign: 'signature...',
      });

      await controller.createPayment(mockUser, 1, createPaymentDto);

      expect(mockWechatPayService.createJsapiOrder).toHaveBeenCalledWith(
        '2个产品',
        'ORD20240114123456789',
        30000,
        validOpenid,
      );
    });
  });
});
