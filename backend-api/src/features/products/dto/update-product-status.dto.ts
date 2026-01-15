import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

/**
 * 更新产品状态的 DTO
 * 用于 PATCH /api/v1/admin/products/:id/status 端点
 */
export class UpdateProductStatusDto {
  @ApiProperty({
    example: 'PUBLISHED',
    description: '产品状态',
    enum: ProductStatus,
    enumName: 'ProductStatus',
  })
  @IsNotEmpty({ message: '产品状态不能为空' })
  @IsEnum(ProductStatus, { message: '产品状态必须是有效的枚举值 (DRAFT | PUBLISHED | UNPUBLISHED)' })
  status: ProductStatus;
}
