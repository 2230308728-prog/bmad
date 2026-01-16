import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * 解析并验证正整数管道
 * 验证参数是否为正整数，用于路由参数验证
 */
@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    // 首先检查是否为有效数字格式（不接受小数点、负号、字母等）
    // 允许前导零（如 "001" 会被解析为 1）
    if (!/^[0-9]+$/.test(value)) {
      throw new BadRequestException(
        `Validation failed: "${value}" is not a valid integer`,
      );
    }

    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed: "${value}" is not a valid integer`,
      );
    }

    if (val <= 0) {
      throw new BadRequestException(
        `Validation failed: "${value}" must be a positive integer`,
      );
    }

    return val;
  }
}
