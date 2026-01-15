import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminRefundsController } from './admin-refunds.controller';
import { AdminRefundsService } from './admin-refunds.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RefundStatus } from '@prisma/client';
import { AdminQueryRefundsDto, ApproveRefundDto, RejectRefundDto } from './dto/admin';

describe('AdminRefundsController', () => {
  let controller: AdminRefundsController;
  let service: AdminRefundsService;

  const mockAdminUser = {
    id: 1,
    name: '管理员',
    role: 'ADMIN',
  };

  const mockRefundList = {
    data: [
      {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.PENDING,
        refundAmount: '299.00',
        reason: '行程有变',
        appliedAt: '2024-01-14T12:00:00Z',
        user: {
          id: 2,
          name: '张三',
          phone: '13800138000',
        },
        order: {
          orderNo: 'ORD20240114123456789',
          productName: '上海科技馆探索之旅',
        },
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  };

  const mockRefundDetail = {
    id: 1,
    refundNo: 'REF20240114123456789',
    status: RefundStatus.PENDING,
    refundAmount: '299.00',
    reason: '行程有变',
    description: '由于孩子临时生病',
    images: ['https://oss.example.com/proof.jpg'],
    appliedAt: '2024-01-14T12:00:00Z',
    approvedAt: null,
    adminNote: null,
    rejectedReason: null,
    rejectedAt: null,
    refundedAt: null,
    wechatRefundId: null,
    user: {
      id: 2,
      name: '张三',
      phone: '13800138000',
      role: 'PARENT',
    },
    order: {
      id: 1,
      orderNo: 'ORD20240114123456789',
      status: 'PAID',
      totalAmount: '299.00',
      actualAmount: '299.00',
      paymentStatus: 'PAID',
      bookingDate: '2024-02-15',
      items: [
        {
          id: 1,
          productId: 1,
          productName: '上海科技馆探索之旅',
          productPrice: '299.00',
          quantity: 1,
          subtotal: '299.00',
        },
      ],
    },
    payments: [
      {
        id: 1,
        transactionId: 'WX1234567890',
        channel: 'WECHAT',
        amount: '299.00',
        status: 'SUCCESS',
        createdAt: '2024-01-14T10:00:00Z',
      },
    ],
    product: {
      id: 1,
      title: '上海科技馆探索之旅',
      images: ['https://oss.example.com/products/1/image1.jpg'],
    },
  };

  const mockStats = {
    total: 100,
    pending: 10,
    approved: 50,
    rejected: 20,
    processing: 5,
    completed: 10,
    failed: 5,
    totalAmount: '10000.00',
    pendingAmount: '1000.00',
  };

  const mockAdminRefundsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminRefundsController],
      providers: [
        {
          provide: AdminRefundsService,
          useValue: mockAdminRefundsService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<AdminRefundsController>(AdminRefundsController);
    service = module.get<AdminRefundsService>(AdminRefundsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated refund list', async () => {
      mockAdminRefundsService.findAll.mockResolvedValue(mockRefundList);

      const queryDto = new AdminQueryRefundsDto();
      const result = await controller.findAll(queryDto);

      expect(result).toEqual(mockRefundList);
      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should pass query parameters to service', async () => {
      mockAdminRefundsService.findAll.mockResolvedValue(mockRefundList);

      const queryDto = new AdminQueryRefundsDto();
      queryDto.status = RefundStatus.PENDING;
      queryDto.page = 2;
      queryDto.pageSize = 30;

      await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('findOne', () => {
    it('should return refund detail', async () => {
      mockAdminRefundsService.findOne.mockResolvedValue(mockRefundDetail);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockRefundDetail);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should call service with correct id', async () => {
      mockAdminRefundsService.findOne.mockResolvedValue(mockRefundDetail);

      await controller.findOne(123);

      expect(service.findOne).toHaveBeenCalledWith(123);
    });
  });

  describe('approve', () => {
    it('should approve refund successfully', async () => {
      const approvedRefund = {
        ...mockRefundDetail,
        status: RefundStatus.APPROVED,
        approvedAt: '2024-01-14T14:00:00Z',
        adminNote: '已核实用户凭证',
      };
      mockAdminRefundsService.approve.mockResolvedValue(approvedRefund);

      const approveDto: ApproveRefundDto = {
        adminNote: '已核实用户凭证',
      };

      const result = await controller.approve(1, approveDto, mockAdminUser);

      expect(result).toEqual(approvedRefund);
      expect(service.approve).toHaveBeenCalledWith(1, '已核实用户凭证', mockAdminUser.id);
    });

    it('should approve refund without adminNote', async () => {
      const approvedRefund = {
        ...mockRefundDetail,
        status: RefundStatus.APPROVED,
        approvedAt: '2024-01-14T14:00:00Z',
      };
      mockAdminRefundsService.approve.mockResolvedValue(approvedRefund);

      const approveDto: ApproveRefundDto = {};

      const result = await controller.approve(1, approveDto, mockAdminUser);

      expect(result).toEqual(approvedRefund);
      expect(service.approve).toHaveBeenCalledWith(1, undefined, mockAdminUser.id);
    });
  });

  describe('reject', () => {
    it('should reject refund successfully', async () => {
      const rejectedRefund = {
        ...mockRefundDetail,
        status: RefundStatus.REJECTED,
        rejectedReason: '不符合退款条件',
        rejectedAt: '2024-01-14T13:00:00Z',
      };
      mockAdminRefundsService.reject.mockResolvedValue(rejectedRefund);

      const rejectDto: RejectRefundDto = {
        rejectedReason: '不符合退款条件',
      };

      const result = await controller.reject(1, rejectDto, mockAdminUser);

      expect(result).toEqual(rejectedRefund);
      expect(service.reject).toHaveBeenCalledWith(1, '不符合退款条件', mockAdminUser.id);
    });

    it('should pass rejectedReason to service', async () => {
      mockAdminRefundsService.reject.mockResolvedValue(mockRefundDetail);

      const rejectDto: RejectRefundDto = {
        rejectedReason: '活动开始前 48 小时内不可退款',
      };

      await controller.reject(1, rejectDto, mockAdminUser);

      expect(service.reject).toHaveBeenCalledWith(1, '活动开始前 48 小时内不可退款', mockAdminUser.id);
    });
  });

  describe('getStats', () => {
    it('should return refund statistics', async () => {
      mockAdminRefundsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });
});
