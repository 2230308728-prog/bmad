import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../dto/jwt-payload.interface';
import { TokenBlacklistService } from '@/features/users/token-blacklist.service';

/**
 * Passport JWT 策略
 *
 * 用于验证 JWT 令牌并提取用户信息
 * 配合 @UseGuards(AuthGuard('jwt')) 使用
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required for JwtStrategy');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true, // 启用请求传递以获取原始令牌
    });
  }

  /**
   * 验证令牌后的回调方法
   *
   * Passport 自动调用此方法，将 request 和 JWT payload 作为参数
   * 返回值会被附加到 request.user
   *
   * @param req Express 请求对象
   * @param payload JWT 解码后的 payload
   * @returns 用户信息对象，会被附加到 request.user
   */
  async validate(req: any, payload: JwtPayload) {
    // 验证令牌类型
    if (payload.type !== 'access') {
      throw new UnauthorizedException('无效的令牌类型');
    }

    // 从请求头中提取原始令牌
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('缺少认证令牌');
    }

    const token = authHeader.replace('Bearer ', '');

    // 检查令牌是否在黑名单中
    const isBlacklisted = await this.tokenBlacklistService.isAccessBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('令牌已失效');
    }

    // 返回用户信息，将被附加到 request.user
    // 使用 id 而不是 userId，与 RolesGuard 期望的字段名一致
    return { id: payload.sub, role: payload.role };
  }
}
