import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    mockCallHandler = {
      handle: () => of({ test: 'data' }),
    };
  });

  it('should wrap response in data and meta', (done) => {
    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toEqual({ test: 'data' });
      done();
    });
  });

  it('should include timestamp in meta', (done) => {
    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      done();
    });
  });

  it('should include version in meta', (done) => {
    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.meta).toHaveProperty('version');
      expect(result.meta.version).toBe('1.0');
      done();
    });
  });
});
