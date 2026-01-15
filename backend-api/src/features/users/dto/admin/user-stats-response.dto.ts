import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户统计响应 DTO
 * 平台用户统计数据
 */
export class UserStatsResponseDto {
  @ApiProperty({ description: '总用户数', example: 1000 })
  total: number;

  @ApiProperty({ description: '家长用户数', example: 850 })
  parents: number;

  @ApiProperty({ description: '管理员用户数', example: 150 })
  admins: number;

  @ApiProperty({ description: '活跃用户数', example: 900 })
  active: number;

  @ApiProperty({ description: '未激活用户数', example: 50 })
  inactive: number;

  @ApiProperty({ description: '已禁用用户数', example: 50 })
  banned: number;

  @ApiProperty({ description: '今日注册用户数', example: 25 })
  todayRegistered: number;

  @ApiProperty({ description: '本周注册用户数', example: 120 })
  weekRegistered: number;

  @ApiProperty({ description: '本月注册用户数', example: 450 })
  monthRegistered: number;
}
