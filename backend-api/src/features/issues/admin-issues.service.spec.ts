import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminIssuesService } from './admin-issues.service';
import { PrismaService } from '@/lib/prisma.service';
import { CacheService } from '@/redis/cache.service';
import { QueryIssuesDto } from './dto/admin/query-issues.dto';
import { CreateIssueDto } from './dto/admin/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/admin/update-issue-status.dto';
import { IssueType, IssueStatus, IssuePriority, Role } from '@prisma/client';

describe('AdminIssuesService', () => {
  let service: AdminIssuesService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    userIssue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockUser = {
    id: 1,
    nickname: '张小明',
    phone: '13800138000',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const mockOrder = {
    id: 5,
    orderNo: 'ORD20240114123456789',
  };

  const mockIssue = {
    id: 1,
    userId: 1,
    orderId: 5,
    type: IssueType.COMPLAINT,
    title: '活动时间变更问题',
    description: '用户反映活动时间临时变更...',
    status: IssueStatus.OPEN,
    priority: IssuePriority.HIGH,
    assignedTo: null,
    resolution: null,
    resolvedAt: null,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
    user: mockUser,
    order: mockOrder,
    assignee: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminIssuesService,
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

    service = module.get<AdminIssuesService>(AdminIssuesService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findIssues', () => {
    it('should return paginated issue list', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
      };

      mockPrismaService.userIssue.findMany.mockResolvedValue([mockIssue]);
      mockPrismaService.userIssue.count.mockResolvedValue(1);

      const result = await service.findIssues(queryDto);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by status', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        status: IssueStatus.OPEN,
      };

      mockPrismaService.userIssue.findMany.mockResolvedValue([mockIssue]);
      mockPrismaService.userIssue.count.mockResolvedValue(1);

      await service.findIssues(queryDto);

      expect(mockPrismaService.userIssue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: IssueStatus.OPEN,
          }),
        }),
      );
    });

    it('should filter by type', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        type: IssueType.COMPLAINT,
      };

      mockPrismaService.userIssue.findMany.mockResolvedValue([mockIssue]);
      mockPrismaService.userIssue.count.mockResolvedValue(1);

      await service.findIssues(queryDto);

      expect(mockPrismaService.userIssue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: IssueType.COMPLAINT,
          }),
        }),
      );
    });

    it('should filter by priority', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        priority: IssuePriority.HIGH,
      };

      mockPrismaService.userIssue.findMany.mockResolvedValue([mockIssue]);
      mockPrismaService.userIssue.count.mockResolvedValue(1);

      await service.findIssues(queryDto);

      expect(mockPrismaService.userIssue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: IssuePriority.HIGH,
          }),
        }),
      );
    });

    it('should filter by userId', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        userId: 1,
      };

      mockPrismaService.userIssue.findMany.mockResolvedValue([mockIssue]);
      mockPrismaService.userIssue.count.mockResolvedValue(1);

      await service.findIssues(queryDto);

      expect(mockPrismaService.userIssue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
          }),
        }),
      );
    });

    it('should filter by assignedTo', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        assignedTo: 2,
      };

      mockPrismaService.userIssue.findMany.mockResolvedValue([mockIssue]);
      mockPrismaService.userIssue.count.mockResolvedValue(1);

      await service.findIssues(queryDto);

      expect(mockPrismaService.userIssue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedTo: 2,
          }),
        }),
      );
    });

    it('should sort by priority correctly (URGENT > HIGH > MEDIUM > LOW)', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
      };

      const mockIssues = [
        { ...mockIssue, id: 1, priority: IssuePriority.LOW, createdAt: new Date('2024-01-14') },
        { ...mockIssue, id: 2, priority: IssuePriority.URGENT, createdAt: new Date('2024-01-14') },
        { ...mockIssue, id: 3, priority: IssuePriority.MEDIUM, createdAt: new Date('2024-01-14') },
        { ...mockIssue, id: 4, priority: IssuePriority.HIGH, createdAt: new Date('2024-01-14') },
      ];

      mockPrismaService.userIssue.findMany.mockResolvedValue(mockIssues);
      mockPrismaService.userIssue.count.mockResolvedValue(4);

      const result = await service.findIssues(queryDto);

      expect(result.data[0].priority).toBe(IssuePriority.URGENT);
      expect(result.data[1].priority).toBe(IssuePriority.HIGH);
      expect(result.data[2].priority).toBe(IssuePriority.MEDIUM);
      expect(result.data[3].priority).toBe(IssuePriority.LOW);
    });

    it('should sort by same priority then by created_at DESC', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
      };

      const mockIssues = [
        { ...mockIssue, id: 1, priority: IssuePriority.HIGH, createdAt: new Date('2024-01-10') },
        { ...mockIssue, id: 2, priority: IssuePriority.HIGH, createdAt: new Date('2024-01-15') },
        { ...mockIssue, id: 3, priority: IssuePriority.HIGH, createdAt: new Date('2024-01-12') },
      ];

      mockPrismaService.userIssue.findMany.mockResolvedValue(mockIssues);
      mockPrismaService.userIssue.count.mockResolvedValue(3);

      const result = await service.findIssues(queryDto);

      expect(result.data[0].id).toBe(2); // Latest
      expect(result.data[1].id).toBe(3);
      expect(result.data[2].id).toBe(1); // Oldest
    });

    it('should mask user phone numbers', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
      };

      mockPrismaService.userIssue.findMany.mockResolvedValue([mockIssue]);
      mockPrismaService.userIssue.count.mockResolvedValue(1);

      const result = await service.findIssues(queryDto);

      expect(result.data[0].userPhone).toBe('138****8000');
    });
  });

  describe('createIssue', () => {
    const createDto: CreateIssueDto = {
      userId: 1,
      orderId: 5,
      type: IssueType.COMPLAINT,
      title: '活动时间变更问题',
      description: '用户反映活动时间临时变更...',
      priority: IssuePriority.HIGH,
    };

    it('should create issue successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.userIssue.create.mockResolvedValue(mockIssue);

      const result = await service.createIssue(createDto);

      expect(result).toBeDefined();
      expect(result.userId).toBe(1);
      expect(result.type).toBe(IssueType.COMPLAINT);
      expect(mockPrismaService.userIssue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 1,
            orderId: 5,
            type: IssueType.COMPLAINT,
            status: IssueStatus.OPEN,
            priority: IssuePriority.HIGH,
          }),
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createIssue(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.createIssue(createDto)).rejects.toThrow('用户 1 不存在');
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.createIssue(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.createIssue(createDto)).rejects.toThrow('订单 5 不存在');
    });

    it('should create issue without order', async () => {
      const createDtoWithoutOrder: CreateIssueDto = {
        userId: 1,
        type: IssueType.QUESTION,
        title: '咨询问题',
        description: '用户咨询产品详情...',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userIssue.create.mockResolvedValue({
        ...mockIssue,
        orderId: null,
        order: null,
      });

      const result = await service.createIssue(createDtoWithoutOrder);

      expect(result.orderId).toBeNull();
      expect(result.orderNo).toBeNull();
    });

    it('should default priority to MEDIUM if not provided', async () => {
      const createDtoWithoutPriority: CreateIssueDto = {
        userId: 1,
        type: IssueType.SUGGESTION,
        title: '建议',
        description: '用户建议...',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userIssue.create.mockResolvedValue(mockIssue);

      await service.createIssue(createDtoWithoutPriority);

      expect(mockPrismaService.userIssue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: IssuePriority.MEDIUM,
          }),
        }),
      );
    });
  });

  describe('updateIssueStatus', () => {
    const updateDto: UpdateIssueStatusDto = {
      status: IssueStatus.IN_PROGRESS,
      assignedTo: 2,
    };

    it('should update issue status successfully', async () => {
      mockPrismaService.userIssue.findUnique.mockResolvedValue(mockIssue);
      mockPrismaService.userIssue.update.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.IN_PROGRESS,
        assignedTo: 2,
        assignee: { id: 2, nickname: '管理员A' },
      });

      const result = await service.updateIssueStatus(1, updateDto);

      expect(result.status).toBe(IssueStatus.IN_PROGRESS);
      expect(result.assignedTo).toBe(2);
    });

    it('should throw NotFoundException if issue does not exist', async () => {
      mockPrismaService.userIssue.findUnique.mockResolvedValue(null);

      await expect(service.updateIssueStatus(1, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.updateIssueStatus(1, updateDto)).rejects.toThrow('问题 1 不存在');
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      mockPrismaService.userIssue.findUnique.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.CLOSED,
      });

      const invalidUpdateDto: UpdateIssueStatusDto = {
        status: IssueStatus.IN_PROGRESS,
      };

      await expect(service.updateIssueStatus(1, invalidUpdateDto)).rejects.toThrow(BadRequestException);
      await expect(service.updateIssueStatus(1, invalidUpdateDto)).rejects.toThrow('非法的状态转换');
    });

    it('should throw BadRequestException when RESOLVED without resolution', async () => {
      const inProgressIssue = { ...mockIssue, status: IssueStatus.IN_PROGRESS };
      mockPrismaService.userIssue.findUnique.mockResolvedValue(inProgressIssue);

      const invalidUpdateDto: UpdateIssueStatusDto = {
        status: IssueStatus.RESOLVED,
      };

      await expect(service.updateIssueStatus(1, invalidUpdateDto)).rejects.toThrow(BadRequestException);
      await expect(service.updateIssueStatus(1, invalidUpdateDto)).rejects.toThrow('必须提供解决方案');
    });

    it('should throw BadRequestException when CLOSED without resolution', async () => {
      mockPrismaService.userIssue.findUnique.mockResolvedValue(mockIssue);

      const invalidUpdateDto: UpdateIssueStatusDto = {
        status: IssueStatus.CLOSED,
      };

      await expect(service.updateIssueStatus(1, invalidUpdateDto)).rejects.toThrow(BadRequestException);
      await expect(service.updateIssueStatus(1, invalidUpdateDto)).rejects.toThrow('必须提供解决方案');
    });

    it('should set resolvedAt when status becomes RESOLVED', async () => {
      const inProgressIssue = { ...mockIssue, status: IssueStatus.IN_PROGRESS };
      const resolvedUpdateDto: UpdateIssueStatusDto = {
        status: IssueStatus.RESOLVED,
        resolution: '已解决',
      };

      mockPrismaService.userIssue.findUnique.mockResolvedValue(inProgressIssue);
      mockPrismaService.userIssue.update.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.RESOLVED,
        resolution: '已解决',
        resolvedAt: new Date(),
      });

      await service.updateIssueStatus(1, resolvedUpdateDto);

      expect(mockPrismaService.userIssue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set resolvedAt when status becomes CLOSED', async () => {
      const closedUpdateDto: UpdateIssueStatusDto = {
        status: IssueStatus.CLOSED,
        resolution: '已关闭',
      };

      mockPrismaService.userIssue.findUnique.mockResolvedValue(mockIssue);
      mockPrismaService.userIssue.update.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.CLOSED,
        resolution: '已关闭',
        resolvedAt: new Date(),
      });

      await service.updateIssueStatus(1, closedUpdateDto);

      expect(mockPrismaService.userIssue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should clear stats cache when status is updated', async () => {
      mockPrismaService.userIssue.findUnique.mockResolvedValue(mockIssue);
      mockPrismaService.userIssue.update.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.IN_PROGRESS,
      });

      await service.updateIssueStatus(1, updateDto);

      expect(mockCacheService.del).toHaveBeenCalledWith('issue:stats');
    });

    it('should allow OPEN -> IN_PROGRESS transition', async () => {
      mockPrismaService.userIssue.findUnique.mockResolvedValue(mockIssue);
      mockPrismaService.userIssue.update.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.IN_PROGRESS,
      });

      const result = await service.updateIssueStatus(1, {
        status: IssueStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(IssueStatus.IN_PROGRESS);
    });

    it('should allow IN_PROGRESS -> RESOLVED transition with resolution', async () => {
      mockPrismaService.userIssue.findUnique.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.IN_PROGRESS,
      });

      mockPrismaService.userIssue.update.mockResolvedValue({
        ...mockIssue,
        status: IssueStatus.RESOLVED,
        resolution: '已解决',
        resolvedAt: new Date(),
      });

      const result = await service.updateIssueStatus(1, {
        status: IssueStatus.RESOLVED,
        resolution: '已解决',
      });

      expect(result.status).toBe(IssueStatus.RESOLVED);
      expect(result.resolution).toBe('已解决');
    });
  });

  describe('getIssueStats', () => {
    it('should return issue statistics', async () => {
      mockCacheService.get.mockResolvedValue(null);

      mockPrismaService.userIssue.groupBy
        .mockResolvedValueOnce([
          { status: IssueStatus.OPEN, _count: 10 },
          { status: IssueStatus.IN_PROGRESS, _count: 15 },
          { status: IssueStatus.RESOLVED, _count: 20 },
          { status: IssueStatus.CLOSED, _count: 5 },
        ])
        .mockResolvedValueOnce([
          { priority: IssuePriority.URGENT, _count: 2 },
          { priority: IssuePriority.HIGH, _count: 8 },
        ]);

      mockPrismaService.userIssue.findMany.mockResolvedValue([
        {
          createdAt: new Date('2024-01-14T10:00:00Z'),
          resolvedAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          createdAt: new Date('2024-01-14T10:00:00Z'),
          resolvedAt: new Date('2024-01-15T14:00:00Z'),
        },
      ]);

      mockPrismaService.userIssue.count
        .mockResolvedValueOnce(3)   // todayCreated (first count call)
        .mockResolvedValueOnce(50);  // total (second count call)

      const result = await service.getIssueStats();

      expect(result).toBeDefined();
      expect(result.total).toBe(50);
      expect(result.open).toBe(10);
      expect(result.inProgress).toBe(15);
      expect(result.resolved).toBe(20);
      expect(result.closed).toBe(5);
      expect(result.urgent).toBe(2);
      expect(result.high).toBe(8);
      expect(result.avgResolutionTime).toBe('26小时');
      expect(result.todayCreated).toBe(3);
    });

    it('should return cached stats if available', async () => {
      const cachedStats = {
        total: 100,
        open: 20,
        inProgress: 30,
        resolved: 40,
        closed: 10,
        urgent: 5,
        high: 15,
        avgResolutionTime: '12小时',
        todayCreated: 5,
      };

      mockCacheService.get.mockResolvedValue(cachedStats);

      const result = await service.getIssueStats();

      expect(result).toEqual(cachedStats);
      expect(mockCacheService.get).toHaveBeenCalledWith('issue:stats');
    });

    it('should calculate avg resolution time as 0 hours when no resolved issues', async () => {
      mockCacheService.get.mockResolvedValue(null);

      mockPrismaService.userIssue.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrismaService.userIssue.findMany.mockResolvedValue([]);
      mockPrismaService.userIssue.count.mockResolvedValue(0);

      const result = await service.getIssueStats();

      expect(result.avgResolutionTime).toBe('0小时');
    });

    it('should cache stats after calculation', async () => {
      mockCacheService.get.mockResolvedValue(null);

      mockPrismaService.userIssue.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrismaService.userIssue.findMany.mockResolvedValue([]);
      mockPrismaService.userIssue.count.mockResolvedValue(0);

      await service.getIssueStats();

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'issue:stats',
        expect.any(Object),
        300,
      );
    });
  });
});
