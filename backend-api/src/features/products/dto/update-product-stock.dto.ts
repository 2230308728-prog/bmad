import { IsNotEmpty, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新产品库存的 DTO
 * 用于 PATCH /api/v1/admin/products/:id/stock 端点
 */
export class UpdateProductStockDto {
  @ApiProperty({
    example: 50,
    description: '新的库存数量（必须 >= 0）',
  })
  @IsNotEmpty({ message: '库存数量不能为空' })
  @Min(0, { message: '库存数量不能小于 0' })
  @IsInt({ message: '库存数量必须是整数' })
  @Type(() => Number)
  stock: number;

  @ApiProperty({
    example: '补货入库',
    description: '库存变更原因（可选）',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '变更原因必须是字符串' })
  reason?: string;
}
