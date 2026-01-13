import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '获取应用信息', description: '返回应用的基本信息' })
  @ApiResponse({ status: 200, description: '成功返回应用信息' })
  getHello(): string {
    return this.appService.getHello();
  }
}
