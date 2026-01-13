import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Role {
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

export class CreateUserDto {
  @ApiProperty({ description: '用户昵称', example: '张三' })
  @IsString()
  nickname!: string;

  @ApiPropertyOptional({ description: '用户邮箱', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '用户角色', enum: Role, example: Role.PARENT })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ description: '用户状态', enum: UserStatus, example: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
