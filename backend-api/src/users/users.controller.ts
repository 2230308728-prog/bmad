import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: '获取用户列表', description: '获取所有用户的列表' })
  @ApiResponse({ status: 200, description: '成功获取用户列表' })
  findAll() {
    return [
      {
        id: '1',
        nickname: '张三',
        email: 'zhangsan@example.com',
        role: 'PARENT',
        status: 'ACTIVE',
      },
      {
        id: '2',
        nickname: '李四',
        email: 'lisi@example.com',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    ];
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个用户', description: '根据 ID 获取用户详细信息' })
  @ApiResponse({ status: 200, description: '成功获取用户信息' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  findOne(@Param('id') id: string) {
    const user = {
      id,
      nickname: '张三',
      email: 'zhangsan@example.com',
      role: 'PARENT',
      status: 'ACTIVE',
    };

    return user;
  }

  @Post()
  @ApiOperation({ summary: '创建用户', description: '创建新的用户' })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  create(@Body() createUserDto: CreateUserDto) {
    return {
      id: '3',
      ...createUserDto,
      createdAt: new Date().toISOString(),
    };
  }
}
