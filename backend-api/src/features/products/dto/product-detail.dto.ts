import { ProductListItemDto } from './product-list-item.dto';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 产品类别信息（用于详情页）
 */
export class ProductCategoryDto {
  @ApiProperty({ example: 1, description: '类别 ID' })
  id!: number;

  @ApiProperty({ example: '自然科学', description: '类别名称' })
  name!: string;
}

/**
 * 产品详情 DTO
 * 用于 GET /api/v1/products/:id 端点
 */
export class ProductDetailDto extends ProductListItemDto {
  @ApiProperty({
    example: '<p>精彩探索之旅</p>',
    description: '产品详细描述',
    required: false,
  })
  description!: string | null;

  @ApiProperty({ type: ProductCategoryDto, description: '产品类别信息' })
  category!: ProductCategoryDto;

  @ApiProperty({ example: 6, description: '最小适用年龄', required: false })
  minAge!: number | null;

  @ApiProperty({ example: 12, description: '最大适用年龄', required: false })
  maxAge!: number | null;

  @ApiProperty({ example: 1234, description: '浏览次数' })
  viewCount!: number;

  @ApiProperty({ example: 89, description: '预订次数' })
  bookingCount!: number;

  @ApiProperty({ example: '2024-01-09T12:00:00Z', description: '创建时间' })
  createdAt!: Date;
}
