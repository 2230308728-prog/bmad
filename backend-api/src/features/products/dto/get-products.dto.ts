import { IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询产品列表的 DTO
 */
export class GetProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'created', 'popular'])
  sortBy: string = 'created';
}
