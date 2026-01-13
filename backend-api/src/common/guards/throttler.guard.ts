import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Too many requests, please try again later';

  constructor(
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
    protected readonly configService: ConfigService,
  ) {
    super(
      {
        throttlers: configService.get('throttler.throttlers') || [],
      } as unknown as ThrottlerModuleOptions,
      storageService,
      reflector,
    );
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return (req.ip as string) ?? 'unknown'; // 使用 IP 地址作为限流标识
  }
}
