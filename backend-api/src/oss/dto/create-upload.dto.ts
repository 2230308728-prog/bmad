import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadDto {
  @ApiProperty({ description: '文件名', example: 'product.jpg' })
  @IsString()
  fileName!: string;

  @ApiProperty({ description: '文件大小（字节）', example: 1024000 })
  @IsNumber()
  fileSize?: number;
}
