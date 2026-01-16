import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  Min,
  IsArray,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

/**
 * 更新产品的 DTO
 * 用于 PATCH /api/v1/admin/products/:id 端点
 * 所有字段都是可选的
 */
export class UpdateProductDto {
  @ApiProperty({
    example: '上海科技馆探索之旅（更新版）',
    description: '产品标题',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '产品标题必须是字符串' })
  title?: string;

  @ApiProperty({
    example: '<p>更新后的产品描述...</p>',
    description: '产品详细描述',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '产品描述必须是字符串' })
  description?: string;

  @ApiProperty({ example: 2, description: '产品分类 ID', required: false })
  @IsOptional()
  @IsInt({ message: '产品分类 ID 必须是整数' })
  @IsPositive({ message: '产品分类 ID 必须是正整数' })
  @Type(() => Number)
  categoryId?: number;

  @ApiProperty({ example: 399.0, description: '产品价格', required: false })
  @IsOptional()
  @IsPositive({ message: '产品价格必须大于 0' })
  @Type(() => Number)
  price?: number;

  @ApiProperty({
    example: 499.0,
    description: '原价（用于展示优惠）',
    required: false,
  })
  @IsOptional()
  @IsPositive({ message: '原价必须大于 0' })
  @Type(() => Number)
  originalPrice?: number;

  @ApiProperty({ example: 30, description: '库存数量', required: false })
  @IsOptional()
  @Min(0, { message: '库存数量不能小于 0' })
  @IsInt({ message: '库存数量必须是整数' })
  @Type(() => Number)
  stock?: number;

  @ApiProperty({ example: 8, description: '最小适用年龄', required: false })
  @IsOptional()
  @Min(0, { message: '最小年龄不能小于 0' })
  @IsInt({ message: '最小年龄必须是整数' })
  @Type(() => Number)
  minAge?: number;

  @ApiProperty({ example: 14, description: '最大适用年龄', required: false })
  @IsOptional()
  @Min(0, { message: '最大年龄不能小于 0' })
  @IsInt({ message: '最大年龄必须是整数' })
  @Type(() => Number)
  maxAge?: number;

  @ApiProperty({ example: '4天3夜', description: '活动时长', required: false })
  @IsOptional()
  @IsString({ message: '活动时长必须是字符串' })
  duration?: string;

  @ApiProperty({
    example: '北京海淀区',
    description: '活动地点',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '活动地点必须是字符串' })
  location?: string;

  @ApiProperty({
    example: ['https://oss.example.com/products/1/image2.jpg'],
    description: '产品图片 URL 数组',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: '产品图片必须是数组' })
  @IsString({ each: true, message: '每个图片 URL 必须是字符串' })
  images?: string[];

  @ApiProperty({ example: true, description: '是否推荐', required: false })
  @IsOptional()
  @IsBoolean({ message: '是否推荐必须是布尔值' })
  featured?: boolean;

  @ApiProperty({
    example: 'PUBLISHED',
    description: '产品状态',
    enum: ProductStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductStatus, { message: '产品状态必须是有效的枚举值' })
  status?: ProductStatus;
}
