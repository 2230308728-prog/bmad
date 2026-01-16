import {
  IsOptional,
  IsInt,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueType, IssueStatus, IssuePriority } from '@prisma/client';

/**
 * 查询问题列表 DTO
 * 管理员查询问题列表的请求参数
 */
export class QueryIssuesDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量（1-50）',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '问题状态筛选',
    enum: IssueStatus,
    example: IssueStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @ApiPropertyOptional({
    description: '问题类型筛选',
    enum: IssueType,
    example: IssueType.COMPLAINT,
  })
  @IsOptional()
  @IsEnum(IssueType)
  type?: IssueType;

  @ApiPropertyOptional({
    description: '优先级筛选',
    enum: IssuePriority,
    example: IssuePriority.HIGH,
  })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @ApiPropertyOptional({
    description: '用户 ID 筛选',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: '分配给的管理员 ID 筛选',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedTo?: number;
}
