import {
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueStatus } from '@prisma/client';

/**
 * 更新问题状态 DTO
 * 管理员更新问题状态、分配管理员、添加解决方案的请求参数
 */
export class UpdateIssueStatusDto {
  @ApiPropertyOptional({
    description: '新状态',
    enum: IssueStatus,
    example: IssueStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @ApiPropertyOptional({
    description: '分配给的管理员 ID',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedTo?: number;

  @ApiPropertyOptional({
    description: '解决方案（状态为 RESOLVED 或 CLOSED 时必填）',
    example: '已联系用户协调，已达成一致',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  resolution?: string;
}
