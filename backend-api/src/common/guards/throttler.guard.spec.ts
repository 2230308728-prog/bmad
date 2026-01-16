import { CustomThrottlerGuard } from './throttler.guard';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;
  let mockConfigService: Partial<ConfigService>;
  let mockReflector: Partial<Reflector>;
  let mockStorageService: Partial<ThrottlerStorage>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue([]),
    };

    mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
    };

    mockStorageService = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as Partial<ThrottlerStorage>;

    guard = new CustomThrottlerGuard(
      mockStorageService as ThrottlerStorage,
      mockReflector as Reflector,
      mockConfigService as ConfigService,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return IP address as tracker', async () => {
    const mockRequest = {
      ip: '127.0.0.1',
    };

    const tracker = await guard.getTracker(
      mockRequest as Record<string, unknown>,
    );
    expect(tracker).toBe('127.0.0.1');
  });

  it('should have custom error message', () => {
    expect(guard['errorMessage']).toBe(
      'Too many requests, please try again later',
    );
  });
});
