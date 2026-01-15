import { Test, TestingModule } from '@nestjs/testing';
import { AdminIssuesController } from './admin-issues.controller';
import { AdminIssuesService } from './admin-issues.service';
import { QueryIssuesDto } from './dto/admin/query-issues.dto';
import { CreateIssueDto } from './dto/admin/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/admin/update-issue-status.dto';
import { IssueType, IssueStatus, IssuePriority, Role } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('AdminIssuesController', () => {
  let controller: AdminIssuesController;
  let service: AdminIssuesService;

  const mockAdminIssuesService = {
    findIssues: jest.fn(),
    createIssue: jest.fn(),
    updateIssueStatus: jest.fn(),
    getIssueStats: jest.fn(),
  };

  const mockUser = {
    id: 1,
    role: Role.ADMIN,
  };

  const mockIssue = {
    id: 1,
    userId: 1,
    orderId: 5,
    orderNo: 'ORD20240114123456789',
    type: IssueType.COMPLAINT,
    title: '活动时间变更问题',
    description: '用户反映活动时间临时变更...',
    status: IssueStatus.OPEN,
    priority: IssuePriority.HIGH,
    assignedTo: null,
    assignedToName: null,
    resolution: null,
    resolvedAt: null,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
    userName: '张小明',
    userPhone: '138****8000',
    userAvatarUrl: 'https://example.com/avatar.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminIssuesController],
      providers: [
        {
          provide: AdminIssuesService,
          useValue: mockAdminIssuesService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminIssuesController>(AdminIssuesController);
    service = module.get<AdminIssuesService>(AdminIssuesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated issue list', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
      };

      const mockResult = {
        data: [mockIssue],
        total: 50,
        page: 1,
        pageSize: 20,
      };

      mockAdminIssuesService.findIssues.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, queryDto);

      expect(result).toEqual(mockResult);
      expect(mockAdminIssuesService.findIssues).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by status', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        status: IssueStatus.OPEN,
      };

      mockAdminIssuesService.findIssues.mockResolvedValue({
        data: [mockIssue],
        total: 10,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminIssuesService.findIssues).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by type', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        type: IssueType.COMPLAINT,
      };

      mockAdminIssuesService.findIssues.mockResolvedValue({
        data: [mockIssue],
        total: 5,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminIssuesService.findIssues).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by priority', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        priority: IssuePriority.HIGH,
      };

      mockAdminIssuesService.findIssues.mockResolvedValue({
        data: [mockIssue],
        total: 8,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminIssuesService.findIssues).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by userId', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        userId: 1,
      };

      mockAdminIssuesService.findIssues.mockResolvedValue({
        data: [mockIssue],
        total: 3,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminIssuesService.findIssues).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by assignedTo', async () => {
      const queryDto: QueryIssuesDto = {
        page: 1,
        pageSize: 20,
        assignedTo: 2,
      };

      mockAdminIssuesService.findIssues.mockResolvedValue({
        data: [mockIssue],
        total: 5,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(mockUser, queryDto);

      expect(mockAdminIssuesService.findIssues).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('getStats', () => {
    it('should return issue statistics', async () => {
      const mockStats = {
        total: 50,
        open: 10,
        inProgress: 15,
        resolved: 20,
        closed: 5,
        urgent: 2,
        high: 8,
        avgResolutionTime: '24小时',
        todayCreated: 3,
      };

      mockAdminIssuesService.getIssueStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual({ data: mockStats });
      expect(mockAdminIssuesService.getIssueStats).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto: CreateIssueDto = {
      userId: 1,
      orderId: 5,
      type: IssueType.COMPLAINT,
      title: '活动时间变更问题',
      description: '用户反映活动时间临时变更...',
      priority: IssuePriority.HIGH,
    };

    it('should create issue successfully', async () => {
      mockAdminIssuesService.createIssue.mockResolvedValue(mockIssue);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual({ data: mockIssue });
      expect(mockAdminIssuesService.createIssue).toHaveBeenCalledWith(createDto);
    });

    it('should create issue without order', async () => {
      const createDtoWithoutOrder: CreateIssueDto = {
        userId: 1,
        type: IssueType.QUESTION,
        title: '咨询问题',
        description: '用户咨询产品详情...',
      };

      mockAdminIssuesService.createIssue.mockResolvedValue({
        ...mockIssue,
        orderId: null,
        orderNo: null,
      });

      const result = await controller.create(mockUser, createDtoWithoutOrder);

      expect(result.data.orderId).toBeNull();
      expect(result.data.orderNo).toBeNull();
      expect(mockAdminIssuesService.createIssue).toHaveBeenCalledWith(createDtoWithoutOrder);
    });
  });

  describe('updateStatus', () => {
    const updateDto: UpdateIssueStatusDto = {
      status: IssueStatus.IN_PROGRESS,
      assignedTo: 2,
    };

    it('should update issue status successfully', async () => {
      const updatedIssue = {
        ...mockIssue,
        status: IssueStatus.IN_PROGRESS,
        assignedTo: 2,
        assignedToName: '管理员A',
      };

      mockAdminIssuesService.updateIssueStatus.mockResolvedValue(updatedIssue);

      const result = await controller.updateStatus(mockUser, 1, updateDto);

      expect(result).toEqual({ data: updatedIssue });
      expect(mockAdminIssuesService.updateIssueStatus).toHaveBeenCalledWith(1, updateDto);
    });

    it('should update to RESOLVED with resolution', async () => {
      const resolvedUpdateDto: UpdateIssueStatusDto = {
        status: IssueStatus.RESOLVED,
        resolution: '已解决',
      };

      const resolvedIssue = {
        ...mockIssue,
        status: IssueStatus.RESOLVED,
        resolution: '已解决',
        resolvedAt: new Date(),
      };

      mockAdminIssuesService.updateIssueStatus.mockResolvedValue(resolvedIssue);

      const result = await controller.updateStatus(mockUser, 1, resolvedUpdateDto);

      expect(result.data.status).toBe(IssueStatus.RESOLVED);
      expect(result.data.resolution).toBe('已解决');
      expect(mockAdminIssuesService.updateIssueStatus).toHaveBeenCalledWith(1, resolvedUpdateDto);
    });

    it('should update to CLOSED with resolution', async () => {
      const closedUpdateDto: UpdateIssueStatusDto = {
        status: IssueStatus.CLOSED,
        resolution: '已关闭',
      };

      const closedIssue = {
        ...mockIssue,
        status: IssueStatus.CLOSED,
        resolution: '已关闭',
        resolvedAt: new Date(),
      };

      mockAdminIssuesService.updateIssueStatus.mockResolvedValue(closedIssue);

      const result = await controller.updateStatus(mockUser, 1, closedUpdateDto);

      expect(result.data.status).toBe(IssueStatus.CLOSED);
      expect(result.data.resolution).toBe('已关闭');
      expect(mockAdminIssuesService.updateIssueStatus).toHaveBeenCalledWith(1, closedUpdateDto);
    });

    it('should update assignedTo only', async () => {
      const assignUpdateDto: UpdateIssueStatusDto = {
        assignedTo: 3,
      };

      const assignedIssue = {
        ...mockIssue,
        assignedTo: 3,
        assignedToName: '管理员B',
      };

      mockAdminIssuesService.updateIssueStatus.mockResolvedValue(assignedIssue);

      const result = await controller.updateStatus(mockUser, 1, assignUpdateDto);

      expect(result.data.assignedTo).toBe(3);
      expect(result.data.assignedToName).toBe('管理员B');
      expect(mockAdminIssuesService.updateIssueStatus).toHaveBeenCalledWith(1, assignUpdateDto);
    });

    it('should parse issue ID correctly', async () => {
      mockAdminIssuesService.updateIssueStatus.mockResolvedValue(mockIssue);

      await controller.updateStatus(mockUser, 123, updateDto);

      expect(mockAdminIssuesService.updateIssueStatus).toHaveBeenCalledWith(123, updateDto);
    });
  });
});
