import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Too many requests, please try again later';

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(reflector, configService);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip; // 使用 IP 地址作为限流标识
  }
}
