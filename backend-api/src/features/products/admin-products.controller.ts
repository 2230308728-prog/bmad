import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminProductsService } from './admin-products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParsePositiveIntPipe } from '../../common/pipes/parse-positive-int.pipe';

/**
 * Admin Products Controller
 * 处理管理员产品管理的 HTTP 请求
 * 所有端点都需要 ADMIN 角色权限
 */
@ApiTags('admin-products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('v1/admin/products')
export class AdminProductsController {
  private readonly logger = new Logger(AdminProductsController.name);

  constructor(private readonly adminProductsService: AdminProductsService) {}

  /**
   * 创建产品
   * @param createProductDto 创建产品 DTO
   * @returns 创建的产品
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建产品',
    description: '管理员创建新的研学产品，需要 ADMIN 角色权限',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: '产品创建成功',
    schema: {
      example: {
        id: 1,
        title: '上海科技馆探索之旅',
        description: '<p>精彩的科技探索之旅...</p>',
        categoryId: 1,
        category: { id: 1, name: '自然科学' },
        price: '299.00',
        originalPrice: '399.00',
        stock: 50,
        minAge: 6,
        maxAge: 12,
        duration: '3天2夜',
        location: '上海浦东新区',
        images: ['https://oss.example.com/products/1/image1.jpg'],
        featured: false,
        status: 'DRAFT',
        viewCount: 0,
        bookingCount: 0,
        createdAt: '2024-01-13T12:00:00Z',
        updatedAt: '2024-01-13T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败（分类不存在、价格/库存无效、年龄范围错误）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权（缺少或无效的 JWT 令牌）',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足（需要 ADMIN 角色）',
  })
  @ApiResponse({
    status: 404,
    description: '分类不存在',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      this.logger.log(`Creating product: ${createProductDto.title}`);
      return await this.adminProductsService.create(createProductDto);
    } catch (error) {
      this.logger.error(
        `Failed to create product "${createProductDto.title}":`,
        error,
      );
      throw error;
    }
  }

  /**
   * 更新产品
   * @param id 产品 ID
   * @param updateProductDto 更新产品 DTO
   * @returns 更新后的产品
   */
  @Patch(':id')
  @ApiOperation({
    summary: '更新产品',
    description: '管理员更新研学产品的部分或全部字段，需要 ADMIN 角色权限',
  })
  @ApiParam({ name: 'id', type: Number, description: '产品 ID', example: 1 })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: '产品更新成功',
    schema: {
      example: {
        id: 1,
        title: '上海科技馆探索之旅（更新版）',
        description: '<p>更新后的产品描述...</p>',
        categoryId: 2,
        category: { id: 2, name: '历史文化' },
        price: '399.00',
        originalPrice: '499.00',
        stock: 30,
        minAge: 8,
        maxAge: 14,
        duration: '4天3夜',
        location: '北京海淀区',
        images: ['https://oss.example.com/products/1/image2.jpg'],
        featured: true,
        status: 'PUBLISHED',
        viewCount: 100,
        bookingCount: 10,
        createdAt: '2024-01-13T12:00:00Z',
        updatedAt: '2024-01-13T14:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '产品不存在或分类不存在',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async update(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    try {
      this.logger.log(`Updating product: ${id}`);
      return await this.adminProductsService.update(id, updateProductDto);
    } catch (error) {
      this.logger.error(`Failed to update product ${id}:`, error);
      throw error;
    }
  }

  /**
   * 删除产品（软删除）
   * @param id 产品 ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除产品',
    description: '管理员删除研学产品（软删除，设置状态为 UNPUBLISHED），需要 ADMIN 角色权限。已有订单的产品不能删除。',
  })
  @ApiParam({ name: 'id', type: Number, description: '产品 ID', example: 1 })
  @ApiResponse({
    status: 204,
    description: '产品删除成功（无内容）',
  })
  @ApiResponse({
    status: 400,
    description: '产品已有订单，无法删除',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '产品不存在',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async remove(@Param('id', ParsePositiveIntPipe) id: number) {
    try {
      this.logger.log(`Deleting product: ${id}`);
      await this.adminProductsService.remove(id);
    } catch (error) {
      this.logger.error(`Failed to delete product ${id}:`, error);
      throw error;
    }
  }

  /**
   * 更新产品状态
   * @param id 产品 ID
   * @param updateStatusDto 更新状态 DTO
   * @returns 更新后的产品
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: '更新产品状态',
    description: '管理员更新产品状态（DRAFT | PUBLISHED | UNPUBLISHED），需要 ADMIN 角色权限。不允许从 PUBLISHED 直接变为 DRAFT。',
  })
  @ApiParam({ name: 'id', type: Number, description: '产品 ID', example: 1 })
  @ApiBody({ type: UpdateProductStatusDto })
  @ApiResponse({
    status: 200,
    description: '产品状态更新成功',
    schema: {
      example: {
        id: 1,
        title: '上海科技馆探索之旅',
        status: 'PUBLISHED',
        categoryId: 1,
        category: { id: 1, name: '自然科学' },
        // ... 其他产品字段
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '无效的状态转换（如从 PUBLISHED 到 DRAFT）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '产品不存在',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async updateStatus(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateStatusDto: UpdateProductStatusDto,
  ) {
    try {
      this.logger.log(`Updating product ${id} status to: ${updateStatusDto.status}`);
      return await this.adminProductsService.updateStatus(id, updateStatusDto);
    } catch (error) {
      this.logger.error(`Failed to update product ${id} status:`, error);
      throw error;
    }
  }

  /**
   * 更新产品库存
   * @param id 产品 ID
   * @param updateStockDto 更新库存 DTO
   * @returns 更新后的产品（含 lowStock 标志）
   */
  @Patch(':id/stock')
  @ApiOperation({
    summary: '更新产品库存',
    description: '管理员更新产品库存数量，需要 ADMIN 角色权限。会自动创建库存变更历史记录。库存 < 10 时会返回 lowStock: true 标志。',
  })
  @ApiParam({ name: 'id', type: Number, description: '产品 ID', example: 1 })
  @ApiBody({ type: UpdateProductStockDto })
  @ApiResponse({
    status: 200,
    description: '产品库存更新成功',
    schema: {
      example: {
        id: 1,
        title: '上海科技馆探索之旅',
        stock: 30,
        lowStock: false,
        // ... 其他产品字段
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '无效的库存值（stock < 0）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '产品不存在',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async updateStock(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateStockDto: UpdateProductStockDto,
  ) {
    try {
      this.logger.log(`Updating product ${id} stock to: ${updateStockDto.stock}`);
      return await this.adminProductsService.updateStock(id, updateStockDto);
    } catch (error) {
      this.logger.error(`Failed to update product ${id} stock:`, error);
      throw error;
    }
  }

  /**
   * 获取低库存产品列表
   * @returns 低库存产品列表（stock < 10，按库存升序排序）
   */
  @Get('low-stock')
  @ApiOperation({
    summary: '获取低库存产品列表',
    description: '管理员查询库存低于 10 的产品列表，按库存数量升序排序，需要 ADMIN 角色权限',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取低库存产品列表',
    schema: {
      example: [
        {
          id: 1,
          title: '产品A',
          stock: 2,
          categoryId: 1,
          category: { id: 1, name: '自然科学' },
        },
        {
          id: 2,
          title: '产品B',
          stock: 5,
          categoryId: 2,
          category: { id: 2, name: '历史文化' },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async getLowStockProducts() {
    try {
      this.logger.log('Fetching low stock products');
      return await this.adminProductsService.getLowStockProducts();
    } catch (error) {
      this.logger.error('Failed to fetch low stock products:', error);
      throw error;
    }
  }

  /**
   * 生成图片上传签名 URL
   * @param generateUploadUrlDto 生成上传 URL DTO
   * @returns 上传 URL、文件名和文件路径
   */
  @Post('images/upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '生成图片上传签名 URL',
    description: '管理员获取 OSS 直传签名 URL，用于前端直接上传图片到 OSS，需要 ADMIN 角色权限。签名 URL 15 分钟有效。',
  })
  @ApiBody({ type: GenerateUploadUrlDto })
  @ApiResponse({
    status: 200,
    description: '签名 URL 生成成功',
    schema: {
      example: {
        uploadUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/products/2024/01/14/uuid.jpg?signature=...',
        fileName: 'example.jpg',
        fileKey: 'products/2024/01/14/uuid.jpg',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '无效的文件类型（仅允许 jpg, jpeg, png, webp）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async generateUploadUrl(@Body() generateUploadUrlDto: GenerateUploadUrlDto) {
    try {
      this.logger.log(`Generating upload URL for: ${generateUploadUrlDto.fileName}`);
      return this.adminProductsService.generateUploadUrl(generateUploadUrlDto.fileName);
    } catch (error) {
      this.logger.error(`Failed to generate upload URL for "${generateUploadUrlDto.fileName}":`, error);
      throw error;
    }
  }
}
