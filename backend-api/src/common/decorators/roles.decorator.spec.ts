import { Roles, ROLES_KEY } from './roles.decorator';
import { Role } from '@prisma/client';

describe('Roles Decorator', () => {
  it('should define roles metadata correctly', () => {
    // 测试装饰器定义元数据
    class TestClass {
      @Roles(Role.ADMIN)
      testMethod() {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, 'testMethod');
    expect(descriptor).toBeDefined();
  });

  it('should store single role in metadata', () => {
    // 使用 Reflector 测试
    const { Reflector } = require('@nestjs/core');
    const reflector = new Reflector();

    class TestClass {
      @Roles(Role.ADMIN)
      testMethod() {}
    }

    const roles = reflector.get(ROLES_KEY, TestClass.prototype.testMethod);
    expect(roles).toEqual([Role.ADMIN]);
  });

  it('should store multiple roles in metadata', () => {
    const { Reflector } = require('@nestjs/core');
    const reflector = new Reflector();

    class TestClass {
      @Roles(Role.ADMIN, Role.PARENT)
      testMethod() {}
    }

    const roles = reflector.get(ROLES_KEY, TestClass.prototype.testMethod);
    expect(roles).toEqual([Role.ADMIN, Role.PARENT]);
  });

  it('should define ROLES_KEY constant', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
