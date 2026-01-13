import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { CacheService } from '../redis/cache.service';

describe('HealthController', () => {
  let controller: HealthController;
  let cacheService: Partial<jest.Mocked<CacheService>>;

  beforeEach(async () => {
    cacheService = {
      getHealthStatus: jest.fn(),
      checkHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkRedis', () => {
    it('should return up status when Redis is available', async () => {
      (cacheService.checkHealth as jest.Mock).mockResolvedValue({
        available: true,
        responseTime: 5,
      });

      const result = await controller.checkRedis();

      expect(result.status).toBe('up');
      expect(result.responseTime).toBe('5ms');
      expect(result).toHaveProperty('timestamp');
      expect(cacheService.checkHealth).toHaveBeenCalled();
    });

    it('should return down status when Redis is not available', async () => {
      (cacheService.checkHealth as jest.Mock).mockResolvedValue({
        available: false,
        responseTime: 100,
      });

      const result = await controller.checkRedis();

      expect(result.status).toBe('down');
      expect(result.responseTime).toBe('100ms');
      expect(result).toHaveProperty('timestamp');
    });

    it('should include actual Redis response time from checkHealth', async () => {
      (cacheService.checkHealth as jest.Mock).mockResolvedValue({
        available: true,
        responseTime: 42,
      });

      const result = await controller.checkRedis();

      expect(result.responseTime).toBe('42ms');
    });

    it('should include ISO timestamp', async () => {
      (cacheService.checkHealth as jest.Mock).mockResolvedValue({
        available: true,
        responseTime: 10,
      });

      const result = await controller.checkRedis();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
