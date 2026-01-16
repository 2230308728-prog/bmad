import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AdminCategoriesService } from './admin-categories.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  type CurrentUserType,
} from '../../common/decorators/current-user.decorator';

/**
 * Admin Categories Controller
 * 处理管理员产品分类管理的 HTTP 请求
 */
@ApiTags('admin-categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  private readonly logger = new Logger(AdminCategoriesController.name);

  constructor(
    private readonly adminCategoriesService: AdminCategoriesService,
  ) {}

  /**
   * 获取所有产品分类
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取所有产品分类（管理员）',
    description: '获取系统中所有的产品分类列表，按 ID 升序排列',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: '自然科学',
            description: '包括科技馆、博物馆、自然探索等科学类研学活动',
            createdAt: '2024-01-14T12:00:00Z',
          },
          {
            id: 2,
            name: '历史文化',
            description: '包括博物馆、古迹、传统文化体验等历史文化类研学活动',
            createdAt: '2024-01-14T12:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  async findAll(@CurrentUser() user: CurrentUserType) {
    try {
      this.logger.log(`Admin ${user.id} fetching all categories`);
      const categories = await this.adminCategoriesService.findAll();
      return { data: categories };
    } catch (error) {
      this.logger.error('Failed to fetch categories:', error);
      throw error;
    }
  }

  /**
   * 获取单个分类详情
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取分类详情（管理员）',
    description: '根据 ID 查询单个产品分类的详细信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '分类 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 404,
    description: '分类不存在',
  })
  async findOne(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      this.logger.log(`Admin ${user.id} fetching category ${id}`);
      const category = await this.adminCategoriesService.findOne(id);
      return { data: category };
    } catch (error) {
      this.logger.error(`Failed to fetch category ${id}:`, error);
      throw error;
    }
  }

  /**
   * 创建产品分类
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建产品分类（管理员）',
    description: `创建新的产品分类。

**验证规则：**
- 分类名称必须唯一（不能与现有分类重名）
- 分类名称不能为空

**业务逻辑：**
- 检查名称是否已存在
- 创建新分类记录`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          example: '体育运动',
          description: '分类名称',
        },
        description: {
          type: 'string',
          example: '包括运动训练、户外拓展等体育类研学活动',
          description: '分类描述（可选）',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '创建成功',
  })
  @ApiResponse({
    status: 400,
    description: '分类名称已存在',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body(ValidationPipe) body: { name: string; description?: string },
  ) {
    try {
      this.logger.log(`Admin ${user.id} creating category: ${body.name}`);
      const category = await this.adminCategoriesService.create(
        body.name,
        body.description,
      );
      return { data: category };
    } catch (error) {
      this.logger.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * 更新产品分类
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新产品分类（管理员）',
    description: `更新现有产品分类的名称和描述。

**验证规则：**
- 分类名称必须唯一
- 不能与其他分类重名

**业务逻辑：**
- 验证分类存在
- 检查名称冲突
- 更新分类信息`,
  })
  @ApiParam({ name: 'id', type: Number, description: '分类 ID', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          example: '自然与科学',
          description: '分类名称',
        },
        description: {
          type: 'string',
          example: '更新后的描述',
          description: '分类描述（可选）',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  @ApiResponse({
    status: 400,
    description: '分类名称已被使用',
  })
  @ApiResponse({
    status: 404,
    description: '分类不存在',
  })
  async update(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: { name: string; description?: string },
  ) {
    try {
      this.logger.log(`Admin ${user.id} updating category ${id}: ${body.name}`);
      const category = await this.adminCategoriesService.update(
        id,
        body.name,
        body.description,
      );
      return { data: category };
    } catch (error) {
      this.logger.error(`Failed to update category ${id}:`, error);
      throw error;
    }
  }

  /**
   * 删除产品分类
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除产品分类（管理员）',
    description: `删除指定的产品分类。

**业务规则：**
- 如果有关联的产品，则不允许删除
- 必须先移动或删除该分类下的所有产品

**错误消息：**
- 404: 分类不存在
- 400: 分类下还有产品关联`,
  })
  @ApiParam({ name: 'id', type: Number, description: '分类 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  @ApiResponse({
    status: 400,
    description: '分类下还有产品，无法删除',
  })
  @ApiResponse({
    status: 404,
    description: '分类不存在',
  })
  async remove(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      this.logger.log(`Admin ${user.id} deleting category ${id}`);
      await this.adminCategoriesService.remove(id);
      return {
        data: {
          message: `分类 ID ${id} 已成功删除`,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to delete category ${id}:`, error);
      throw error;
    }
  }
}
