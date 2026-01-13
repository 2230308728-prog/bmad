import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles required', () => {
      const mockRequest = { user: null };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when no roles required (empty array)', () => {
      const mockRequest = { user: null };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const mockRequest = { user: { id: 1, role: Role.ADMIN } };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const mockRequest = { user: { id: 1, role: Role.PARENT } };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.PARENT]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user has no required role', () => {
      const mockRequest = { user: { id: 1, role: Role.PARENT } };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('权限不足');
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      const mockRequest = { user: null };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('用户未认证');
    });

    it('should throw ForbiddenException when user is undefined', () => {
      const mockRequest = { user: undefined };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('用户未认证');
    });

    it('should throw ForbiddenException when user.role is undefined', () => {
      const mockRequest = { user: { id: 1, role: undefined } };
      const context = createMockContext(mockRequest);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('用户角色信息缺失');
    });
  });

  function createMockContext(mockRequest?: any): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => mockRequest || { user: null },
      }),
    } as unknown as ExecutionContext;
  }
});
