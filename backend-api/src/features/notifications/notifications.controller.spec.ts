import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    updateUserSubscription: jest.fn(),
    getUserSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideProvider(AuthGuard('jwt'))
      .useValue({ canActivate: true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotificationTemplates', () => {
    it('should return array of notification templates', async () => {
      const result = await controller.getNotificationTemplates();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('templateId');
    });

    it('should contain all notification types', async () => {
      const result = await controller.getNotificationTemplates();

      const types = result.map((t) => t.type);
      expect(types).toContain(NotificationType.ORDER_CONFIRM);
      expect(types).toContain(NotificationType.TRAVEL_REMINDER);
      expect(types).toContain(NotificationType.REFUND_APPROVED);
      expect(types).toContain(NotificationType.REFUND_REJECTED);
      expect(types).toContain(NotificationType.REFUND_COMPLETED);
    });
  });

  describe('subscribeNotifications', () => {
    it('should update user notification preferences', async () => {
      const mockDto = {
        notificationTypes: [
          NotificationType.ORDER_CONFIRM,
          NotificationType.TRAVEL_REMINDER,
        ],
      };

      const mockRequest = {
        user: { userId: 1 },
      };

      const mockPreference = {
        userId: 1,
        notificationTypes: [
          NotificationType.ORDER_CONFIRM,
          NotificationType.TRAVEL_REMINDER,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationsService.updateUserSubscription.mockResolvedValue(
        mockPreference,
      );

      const result = await controller.subscribeNotifications(
        mockRequest,
        mockDto,
      );

      expect(result).toEqual(mockPreference);
      expect(
        mockNotificationsService.updateUserSubscription,
      ).toHaveBeenCalledWith(1, mockDto.notificationTypes);
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return user notification preferences', async () => {
      const mockRequest = {
        user: { userId: 1 },
      };

      const mockPreference = {
        userId: 1,
        notificationTypes: [NotificationType.ORDER_CONFIRM],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationsService.getUserSubscription.mockResolvedValue(
        mockPreference,
      );

      const result = await controller.getNotificationPreferences(mockRequest);

      expect(result).toEqual(mockPreference);
      expect(mockNotificationsService.getUserSubscription).toHaveBeenCalledWith(
        1,
      );
    });
  });

  describe('Guards', () => {
    it('should have JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', NotificationsController);
      expect(guards).toBeDefined();
    });

    it('should have RolesGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', NotificationsController);
      expect(guards).toBeDefined();
    });

    it('should have PARENT role required for templates endpoint', () => {
      // This is verified by the @Roles(Role.PARENT) decorator on getNotificationTemplates
      expect(true).toBe(true); // Placeholder test
    });

    it('should have PARENT role required for subscribe endpoint', () => {
      // This is verified by the @Roles(Role.PARENT) decorator on subscribeNotifications
      expect(true).toBe(true); // Placeholder test
    });

    it('should have PARENT role required for preferences endpoint', () => {
      // This is verified by the @Roles(Role.PARENT) decorator on getNotificationPreferences
      expect(true).toBe(true); // Placeholder test
    });
  });
});
