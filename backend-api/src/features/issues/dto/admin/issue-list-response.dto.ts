import { ApiProperty } from '@nestjs/swagger';
import { IssueResponseDto } from './issue-response.dto';

/**
 * 问题列表响应 DTO
 * 返回分页的问题列表
 */
export class IssueListResponseDto {
  @ApiProperty({
    description: '问题列表',
    type: [IssueResponseDto],
  })
  data: IssueResponseDto[];

  @ApiProperty({
    description: '总数',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 20,
  })
  pageSize: number;
}
