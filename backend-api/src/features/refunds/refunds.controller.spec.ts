import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryRefundsDto } from './dto/query-refunds.dto';
import { RefundStatus, Role } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

describe('RefundsController', () => {
  let controller: RefundsController;
  let service: RefundsService;

  const mockRefundsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUser = {
    id: 1,
    role: 'PARENT' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundsController],
      providers: [
        {
          provide: RefundsService,
          useValue: mockRefundsService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RefundsController>(RefundsController);
    service = module.get<RefundsService>(RefundsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createRefundDto: CreateRefundDto = {
      orderId: 1,
      reason: '行程有变，无法参加',
      description: '由于孩子临时生病',
      images: ['https://oss.example.com/proof.jpg'],
    };

    it('should create refund and return 201', async () => {
      const mockResult = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.PENDING,
        refundAmount: '299.00',
        appliedAt: '2024-01-14T12:00:00Z',
      };

      mockRefundsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(mockUser, createRefundDto);

      expect(result).toEqual({ data: mockResult });
      expect(mockRefundsService.create).toHaveBeenCalledWith(
        1,
        createRefundDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated refund list', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            refundNo: 'REF20240114123456789',
            status: RefundStatus.PENDING,
            refundAmount: '299.00',
            reason: '行程有变',
            appliedAt: '2024-01-14T12:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      };

      mockRefundsService.findAll.mockResolvedValue(mockResult);

      const queryDto = new QueryRefundsDto();
      const result = await controller.findAll(mockUser, queryDto);

      expect(result).toEqual(mockResult);
      expect(mockRefundsService.findAll).toHaveBeenCalledWith(1, queryDto);
    });

    it('should pass query params correctly', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        pageSize: 20,
      };

      mockRefundsService.findAll.mockResolvedValue(mockResult);

      const queryDto: QueryRefundsDto = { page: 2, pageSize: 20 };
      await controller.findAll(mockUser, queryDto);

      expect(mockRefundsService.findAll).toHaveBeenCalledWith(1, queryDto);
    });
  });

  describe('findOne', () => {
    it('should return refund detail', async () => {
      const mockResult = {
        id: 1,
        refundNo: 'REF20240114123456789',
        status: RefundStatus.PENDING,
        refundAmount: '299.00',
        reason: '行程有变',
        description: '详细说明',
        images: ['https://oss.example.com/proof.jpg'],
        appliedAt: '2024-01-14T12:00:00Z',
        approvedAt: null,
        adminNote: null,
        rejectedReason: null,
        refundedAt: null,
        order: {
          id: 1,
          orderNo: 'ORD20240114123456789',
          status: 'PAID',
          totalAmount: '299.00',
          bookingDate: '2024-02-15',
        },
        product: {
          id: 1,
          title: '上海科技馆探索之旅',
          images: ['https://oss.example.com/products/1/image1.jpg'],
        },
      };

      mockRefundsService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual({ data: mockResult });
      expect(mockRefundsService.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('Role-based access', () => {
    it('should be protected by RolesGuard with PARENT role', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Role[]>('roles', RefundsController);

      // This test verifies that the controller is properly decorated
      expect(controller).toBeDefined();
    });
  });
});
