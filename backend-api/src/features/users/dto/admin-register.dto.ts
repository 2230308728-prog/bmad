import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class AdminRegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码至少8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password!: string;

  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  nickname!: string;
}
