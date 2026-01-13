import { ApiProperty } from '@nestjs/swagger';

/**
 * 产品列表项 DTO
 */
export class ProductListItemDto {
  @ApiProperty({ example: 1, description: '产品 ID' })
  id!: number;

  @ApiProperty({ example: '上海科技馆探索之旅', description: '产品标题' })
  title!: string;

  @ApiProperty({ example: '299.00', description: '价格' })
  price!: string;

  @ApiProperty({ example: '399.00', required: false, description: '原价' })
  originalPrice?: string;

  @ApiProperty({
    example: ['https://oss.example.com/image.jpg'],
    type: [String],
    description: '产品图片列表'
  })
  images!: string[];

  @ApiProperty({ example: '上海', description: '活动地点' })
  location!: string;

  @ApiProperty({ example: '1天', description: '活动时长' })
  duration!: string;

  @ApiProperty({ example: 50, description: '库存数量' })
  stock!: number;

  @ApiProperty({ example: true, description: '是否推荐' })
  featured!: boolean;
}
