import {
  IsNotEmpty,
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
 * 创建产品的 DTO
 * 用于 POST /api/v1/admin/products 端点
 */
export class CreateProductDto {
  // 必填字段

  @ApiProperty({ example: '上海科技馆探索之旅', description: '产品标题' })
  @IsNotEmpty({ message: '产品标题不能为空' })
  @IsString({ message: '产品标题必须是字符串' })
  title!: string;

  @ApiProperty({
    example: '<p>精彩的科技探索之旅...</p>',
    description: '产品详细描述',
  })
  @IsNotEmpty({ message: '产品描述不能为空' })
  @IsString({ message: '产品描述必须是字符串' })
  description!: string;

  @ApiProperty({ example: 1, description: '产品分类 ID' })
  @IsNotEmpty({ message: '产品分类不能为空' })
  @IsInt({ message: '产品分类 ID 必须是整数' })
  @IsPositive({ message: '产品分类 ID 必须是正整数' })
  @Type(() => Number)
  categoryId!: number;

  @ApiProperty({ example: 299.0, description: '产品价格' })
  @IsNotEmpty({ message: '产品价格不能为空' })
  @IsPositive({ message: '产品价格必须大于 0' })
  @Type(() => Number)
  price!: number;

  @ApiProperty({ example: 50, description: '库存数量' })
  @IsNotEmpty({ message: '库存数量不能为空' })
  @Min(0, { message: '库存数量不能小于 0' })
  @IsInt({ message: '库存数量必须是整数' })
  @Type(() => Number)
  stock!: number;

  @ApiProperty({ example: '上海浦东新区', description: '活动地点' })
  @IsNotEmpty({ message: '活动地点不能为空' })
  @IsString({ message: '活动地点必须是字符串' })
  location!: string;

  // 可选字段

  @ApiProperty({
    example: 399.0,
    description: '原价（用于展示优惠）',
    required: false,
  })
  @IsOptional()
  @IsPositive({ message: '原价必须大于 0' })
  @Type(() => Number)
  originalPrice?: number;

  @ApiProperty({ example: 6, description: '最小适用年龄', required: false })
  @IsOptional()
  @Min(0, { message: '最小年龄不能小于 0' })
  @IsInt({ message: '最小年龄必须是整数' })
  @Type(() => Number)
  minAge?: number;

  @ApiProperty({ example: 12, description: '最大适用年龄', required: false })
  @IsOptional()
  @Min(0, { message: '最大年龄不能小于 0' })
  @IsInt({ message: '最大年龄必须是整数' })
  @Type(() => Number)
  maxAge?: number;

  @ApiProperty({ example: '3天2夜', description: '活动时长', required: false })
  @IsOptional()
  @IsString({ message: '活动时长必须是字符串' })
  duration?: string;

  @ApiProperty({
    example: ['https://oss.example.com/products/1/image1.jpg'],
    description: '产品图片 URL 数组',
    required: false,
  })
  @IsArray({ message: '产品图片必须是数组' })
  @IsString({ each: true, message: '每个图片 URL 必须是字符串' })
  images!: string[];

  @ApiProperty({ example: false, description: '是否推荐', required: false })
  @IsOptional()
  @IsBoolean({ message: '是否推荐必须是布尔值' })
  featured?: boolean;

  @ApiProperty({
    example: 'DRAFT',
    description: '产品状态',
    enum: ProductStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductStatus, { message: '产品状态必须是有效的枚举值' })
  status?: ProductStatus;
}
