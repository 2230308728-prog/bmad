import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { JwtPayload, RefreshTokenPayload } from './dto/jwt-payload.interface';

/**
 * 令牌对接口
 */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT 认证服务
 *
 * 提供令牌生成、验证和用户信息提取功能
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 生成访问令牌和刷新令牌
   *
   * @param userId 用户ID
   * @param role 用户角色
   * @returns 令牌对（访问令牌 + 刷新令牌）
   */
  async generateTokens(userId: number, role: Role): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: userId,
      role,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      type: 'refresh',
    };

    const accessTokenExpiration = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION') || '15m';
    const refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION') || '7d';

    // Type assertion required: jsonwebtoken's StringValue type doesn't accept plain string
    // from ConfigService. This is a known type definition mismatch between @nestjs/jwt and jsonwebtoken.
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: accessTokenExpiration as any,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshTokenExpiration as any,
    });

    return { accessToken, refreshToken };
  }

  /**
   * 验证访问令牌
   *
   * @param token JWT 访问令牌
   * @returns 解码后的 payload
   * @throws UnauthorizedException 如果令牌无效或类型错误
   */
  async validateAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * 验证刷新令牌
   *
   * @param token JWT 刷新令牌
   * @returns 解码后的 payload
   * @throws UnauthorizedException 如果令牌无效或类型错误
   */
  async validateRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * 从令牌中提取用户ID
   *
   * @param token JWT 令牌
   * @returns 用户ID
   * @throws Error 如果令牌无效或无法解码
   */
  extractUserIdFromToken(token: string): number {
    const payload = this.jwtService.decode(token) as JwtPayload;

    if (!payload || typeof payload.sub !== 'number') {
      throw new Error('Invalid token: unable to extract user ID');
    }

    return payload.sub;
  }
}
