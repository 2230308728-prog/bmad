import { ApiProperty } from '@nestjs/swagger';

/**
 * 分类收入统计
 */
export class CategoryRevenueDto {
  @ApiProperty({ description: '分类名称', example: '自然科学' })
  category: string;

  @ApiProperty({ description: '订单数', example: 80 })
  orders: number;

  @ApiProperty({ description: '金额（元）', example: '24000.00' })
  amount: string;

  @ApiProperty({ description: '占比（%）', example: 53.33 })
  percentage: number;
}

/**
 * 支付方式收入统计
 */
export class PaymentMethodRevenueDto {
  @ApiProperty({ description: '支付方式', example: 'WECHAT' })
  method: string;

  @ApiProperty({ description: '金额（元）', example: '45000.00' })
  amount: string;

  @ApiProperty({ description: '占比（%）', example: 100 })
  percentage: number;
}

/**
 * 收入构成分析响应
 */
export class RevenueBreakdownResponseDto {
  @ApiProperty({
    description: '按分类统计',
    type: [CategoryRevenueDto],
  })
  byCategory: CategoryRevenueDto[];

  @ApiProperty({
    description: '按支付方式统计',
    type: [PaymentMethodRevenueDto],
  })
  byPaymentMethod: PaymentMethodRevenueDto[];
}
