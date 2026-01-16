import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 查询退款列表的 DTO
 * 用于 GET /api/v1/refunds 端点
 */
export class QueryRefundsDto {
  @ApiProperty({
    example: 1,
    description: '页码（默认 1，最小 1，最大 10000）',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于 1' })
  @Max(10000, { message: '页码不能大于 10000' })
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: '每页数量（默认 10，范围 1-20）',
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(20, { message: '每页数量不能大于 20' })
  @Type(() => Number)
  pageSize?: number = 10;
}
