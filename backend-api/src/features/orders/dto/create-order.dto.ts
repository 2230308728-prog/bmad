import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 创建订单的 DTO
 * 用于 POST /api/v1/orders 端点
 */
export class CreateOrderDto {
  @ApiProperty({ example: 1, description: '产品 ID' })
  @IsNotEmpty({ message: '产品 ID 不能为空' })
  @IsInt({ message: '产品 ID 必须是整数' })
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ example: '2024-02-15', description: '预订日期（YYYY-MM-DD 格式）' })
  @IsNotEmpty({ message: '预订日期不能为空' })
  @IsDateString({}, { message: '预订日期格式无效' })
  bookingDate!: string;

  @ApiProperty({ example: '张小明', description: '孩子姓名' })
  @IsNotEmpty({ message: '孩子姓名不能为空' })
  @IsString({ message: '孩子姓名必须是字符串' })
  @MaxLength(50, { message: '孩子姓名不能超过 50 个字符' })
  childName!: string;

  @ApiProperty({ example: 8, description: '孩子年龄' })
  @IsNotEmpty({ message: '孩子年龄不能为空' })
  @IsInt({ message: '孩子年龄必须是整数' })
  @Min(1, { message: '孩子年龄不能小于 1' })
  @Max(18, { message: '孩子年龄不能大于 18' })
  @Type(() => Number)
  childAge!: number;

  @ApiProperty({ example: '张爸爸', description: '联系人姓名' })
  @IsNotEmpty({ message: '联系人姓名不能为空' })
  @IsString({ message: '联系人姓名必须是字符串' })
  @MaxLength(50, { message: '联系人姓名不能超过 50 个字符' })
  contactName!: string;

  @ApiProperty({ example: '13800138000', description: '联系人手机号（中国手机号）' })
  @IsNotEmpty({ message: '联系人手机号不能为空' })
  @IsPhoneNumber('CN', { message: '联系人手机号格式无效' })
  contactPhone!: string;

  @ApiProperty({ example: 1, description: '参与人数' })
  @IsNotEmpty({ message: '参与人数不能为空' })
  @IsInt({ message: '参与人数必须是整数' })
  @Min(1, { message: '参与人数不能小于 1' })
  @Max(20, { message: '参与人数不能大于 20' })
  @Type(() => Number)
  participantCount!: number;

  @ApiProperty({
    example: '如有食物过敏请提前告知',
    description: '备注信息',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '备注信息必须是字符串' })
  @MaxLength(500, { message: '备注信息不能超过 500 个字符' })
  remark?: string;
}
