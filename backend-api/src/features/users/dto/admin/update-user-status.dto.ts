import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

/**
 * 用户状态更新 DTO
 */
export class UpdateUserStatusDto {
  @ApiProperty({
    description: '新的用户状态',
    enum: UserStatus,
    example: UserStatus.BANNED,
  })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({
    description: '状态变更原因',
    example: '违反平台规定',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
