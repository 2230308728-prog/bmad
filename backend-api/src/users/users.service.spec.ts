import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../features/users/users.service';
import { PrismaService } from '@/lib/prisma.service';
import { TokenBlacklistService } from '../features/users/token-blacklist.service';
import { UserSessionService } from '../features/users/user-session.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTokenBlacklistService = {
    isAccessBlacklisted: jest.fn(),
    isRefreshBlacklisted: jest.fn(),
    addToAccessBlacklist: jest.fn(),
    addToRefreshBlacklist: jest.fn(),
  };

  const mockUserSessionService = {
    saveRefreshToken: jest.fn(),
    getValidRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    deleteUserRefreshTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: UserSessionService,
          useValue: mockUserSessionService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
