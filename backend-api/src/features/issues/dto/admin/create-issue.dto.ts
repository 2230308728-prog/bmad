import {
  IsInt,
  IsEnum,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueType, IssuePriority } from '@prisma/client';

/**
 * 创建问题 DTO
 * 管理员创建问题记录的请求参数
 */
export class CreateIssueDto {
  @ApiProperty({
    description: '用户 ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  userId: number;

  @ApiPropertyOptional({
    description: '关联的订单 ID（可选）',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  orderId?: number;

  @ApiProperty({
    description: '问题类型',
    enum: IssueType,
    example: IssueType.COMPLAINT,
  })
  @IsEnum(IssueType)
  @IsNotEmpty()
  type: IssueType;

  @ApiProperty({
    description: '问题标题',
    example: '活动时间变更问题',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: '问题详细描述',
    example: '用户反映活动时间临时变更，与预订时间不符...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  description: string;

  @ApiPropertyOptional({
    description: '优先级',
    enum: IssuePriority,
    example: IssuePriority.HIGH,
    default: IssuePriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority = IssuePriority.MEDIUM;
}
