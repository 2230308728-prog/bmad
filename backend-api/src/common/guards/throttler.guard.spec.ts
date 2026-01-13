import { CustomThrottlerGuard } from './throttler.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;

  beforeEach(() => {
    guard = new CustomThrottlerGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return IP address as tracker', () => {
    const mockRequest = {
      ip: '127.0.0.1',
    };

    const tracker = guard.getTracker(mockRequest as Record<string, unknown>);
    expect(tracker).toBe('127.0.0.1');
  });

  it('should have custom error message', () => {
    expect(guard['errorMessage']).toBe(
      'Too many requests, please try again later',
    );
  });
});
