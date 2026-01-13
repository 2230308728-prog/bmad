import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 令牌对 DTO
 *
 * 包含访问令牌和刷新令牌的响应结构
 */
export class TokensDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
