import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WechatUserInfoDto {
  @ApiProperty({ required: false, description: '用户昵称' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ required: false, description: '用户头像URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

export class WechatLoginDto {
  @ApiProperty({ description: '微信登录code' })
  @IsString()
  @IsNotEmpty({ message: 'code不能为空' })
  code!: string;

  @ApiProperty({
    required: false,
    type: WechatUserInfoDto,
    description: '微信用户信息',
  })
  @ValidateNested()
  @Type(() => WechatUserInfoDto)
  @IsOptional()
  userInfo?: WechatUserInfoDto;
}
