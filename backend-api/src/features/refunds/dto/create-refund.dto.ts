import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsArray,
  IsOptional,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 创建退款申请的 DTO
 * 用于 POST /api/v1/refunds 端点
 */
export class CreateRefundDto {
  @ApiProperty({ example: 1, description: '订单 ID' })
  @IsNotEmpty({ message: '订单 ID 不能为空' })
  @IsInt({ message: '订单 ID 必须是整数' })
  @Type(() => Number)
  orderId!: number;

  @ApiProperty({
    example: '行程有变，无法参加',
    description: '退款原因（简述）',
  })
  @IsNotEmpty({ message: '退款原因不能为空' })
  @IsString({ message: '退款原因必须是字符串' })
  @MaxLength(200, { message: '退款原因不能超过 200 个字符' })
  reason!: string;

  @ApiProperty({
    example: '由于孩子临时生病，需要请假复诊，无法参加预订的活动',
    description: '退款详细说明',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '退款详细说明必须是字符串' })
  @MaxLength(1000, { message: '退款详细说明不能超过 1000 个字符' })
  description?: string;

  @ApiProperty({
    example: ['https://oss.example.com/refunds/proof1.jpg'],
    description: '凭证图片 URL 数组（如病历、通知等）',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: '凭证图片必须是数组' })
  @IsString({ each: true, message: '每个图片 URL 必须是字符串' })
  @IsUrl({}, { each: true, message: '每个图片 URL 格式无效' })
  images?: string[];
}
