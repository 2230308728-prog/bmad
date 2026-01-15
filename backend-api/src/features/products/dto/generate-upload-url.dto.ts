import { IsNotEmpty, IsString, registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 自定义验证器：验证文件类型是否为允许的图片类型
 */
@ValidatorConstraint({ name: 'isValidImageFileType', async: false })
export class IsValidImageFileTypeConstraint implements ValidatorConstraintInterface {
  private readonly allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

  validate(fileName: string, args: ValidationArguments) {
    if (!fileName) return false;

    const ext = fileName.split('.').pop()?.toLowerCase();
    return this.allowedExtensions.includes(ext || '');
  }

  defaultMessage(args: ValidationArguments) {
    return `文件类型必须是以下之一: ${this.allowedExtensions.join(', ')}`;
  }
}

/**
 * 自定义装饰器函数
 */
export function IsValidImageFileType(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidImageFileTypeConstraint,
    });
  };
}

/**
 * 生成图片上传签名 URL 的 DTO
 * 用于 POST /api/v1/admin/products/images/upload 端点
 */
export class GenerateUploadUrlDto {
  @ApiProperty({
    example: 'example.jpg',
    description: '文件名（含扩展名）',
  })
  @IsNotEmpty({ message: '文件名不能为空' })
  @IsString({ message: '文件名必须是字符串' })
  @IsValidImageFileType({
    message: '文件类型必须是以下之一: jpg, jpeg, png, webp',
  })
  fileName: string;
}
