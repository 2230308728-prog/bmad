import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../dto/jwt-payload.interface';

/**
 * Passport JWT 策略
 *
 * 用于验证 JWT 令牌并提取用户信息
 * 配合 @UseGuards(AuthGuard('jwt')) 使用
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required for JwtStrategy');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * 验证令牌后的回调方法
   *
   * Passport 自动调用此方法，将 JWT payload 作为参数
   * 返回值会被附加到 request.user
   *
   * @param payload JWT 解码后的 payload
   * @returns 用户信息对象，会被附加到 request.user
   */
  async validate(payload: JwtPayload) {
    // 验证令牌类型
    if (payload.type !== 'access') {
      throw new UnauthorizedException('无效的令牌类型');
    }

    // 返回用户信息，将被附加到 request.user
    // 使用 id 而不是 userId，与 RolesGuard 期望的字段名一致
    return { id: payload.sub, role: payload.role };
  }
}
