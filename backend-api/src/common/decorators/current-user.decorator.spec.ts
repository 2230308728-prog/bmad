import { CurrentUser, CurrentUserType } from './current-user.decorator';
import { Role } from '@prisma/client';

describe('CurrentUser Decorator', () => {
  it('should be defined', () => {
    expect(CurrentUser).toBeDefined();
  });

  it('should export CurrentUserType interface', () => {
    const user: CurrentUserType = { id: 1, role: Role.PARENT };
    expect(user.id).toBe(1);
    expect(user.role).toBe(Role.PARENT);
  });

  it('should create a parameter decorator', () => {
    // createParamDecorator 返回一个装饰器函数
    expect(typeof CurrentUser).toBe('function');
  });
});
