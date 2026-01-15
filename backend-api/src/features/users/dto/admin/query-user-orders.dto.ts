import { IsOptional, IsInt, IsDateString, IsEnum, Min, Max } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 查询用户订单列表查询参数 DTO
 */
export class QueryUserOrdersDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiProperty({
    description: '订单状态',
    enum: OrderStatus,
    example: OrderStatus.PAID,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({
    description: '开始日期 (ISO 8601 格式)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '结束日期 (ISO 8601 格式)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
