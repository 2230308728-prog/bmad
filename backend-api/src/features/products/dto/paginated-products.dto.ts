import { ApiProperty } from '@nestjs/swagger';
import { ProductListItemDto } from './product-list-item.dto';

/**
 * 分页产品列表响应 DTO
 */
export class PaginatedProductsDto {
  @ApiProperty({ type: [ProductListItemDto], description: '产品列表' })
  data!: ProductListItemDto[];

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      pageSize: 20,
      totalPages: 5,
    },
    description: '分页元数据',
  })
  meta!: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
