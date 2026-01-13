import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  Min,
  Max,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 自定义验证器装饰器工厂函数
 */
export function MaxPriceGreaterThanMin(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxPriceGreaterThanMin',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const minPrice = obj.minPrice;
          const maxPrice = value;

          // 如果只有一个值存在，验证通过
          if (minPrice === undefined || maxPrice === undefined) {
            return true;
          }

          // 两个值都存在时，maxPrice 必须 >= minPrice
          return maxPrice >= minPrice;
        },
        defaultMessage(args: ValidationArguments) {
          return 'maxPrice must be greater than or equal to minPrice';
        },
      },
    });
  };
}

/**
 * 自定义验证器装饰器工厂函数
 */
export function MaxAgeGreaterThanMin(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxAgeGreaterThanMin',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const minAge = obj.minAge;
          const maxAge = value;

          // 如果只有一个值存在，验证通过
          if (minAge === undefined || maxAge === undefined) {
            return true;
          }

          // 两个值都存在时，maxAge 必须 >= minAge
          return maxAge >= minAge;
        },
        defaultMessage(args: ValidationArguments) {
          return 'maxAge must be greater than or equal to minAge';
        },
      },
    });
  };
}

/**
 * 产品搜索和筛选 DTO
 * 用于 GET /api/v1/products/search 端点
 */
export class SearchProductsDto {
  @IsString()
  @IsNotEmpty()
  keyword!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsPositive()
  minPrice?: number;

  @IsOptional()
  @IsPositive()
  @MaxPriceGreaterThanMin({
    message: 'maxPrice must be greater than or equal to minPrice',
  })
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @MaxAgeGreaterThanMin({
    message: 'maxAge must be greater than or equal to minAge',
  })
  maxAge?: number;

  @IsOptional()
  @IsString()
  location?: string;

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
}
