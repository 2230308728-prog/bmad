import { Controller, Get, Query, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { PaginatedProductsDto } from './dto/paginated-products.dto';

/**
 * Products Controller
 * 处理产品相关的 HTTP 请求
 */
@ApiTags('products')
@Controller('v1/products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  /**
   * 获取产品列表
   * @param query 查询参数
   * @returns 分页产品列表
   */
  @Get()
  @ApiOperation({
    summary: '获取产品列表',
    description: '查询已发布的产品列表，支持分页、分类筛选和多种排序方式'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price_asc', 'price_desc', 'created', 'popular'],
    example: 'created'
  })
  @ApiResponse({
    status: 200,
    description: '成功返回产品列表',
    type: PaginatedProductsDto
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败'
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误'
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() query: GetProductsDto) {
    try {
      return await this.productsService.findAll(query);
    } catch (error) {
      // 记录错误详情
      this.logger.error(
        `Failed to fetch products with query ${JSON.stringify(query)}:`,
        error,
      );

      // NestJS 会自动将未捕获的异常转换为适当的 HTTP 响应
      // 这里我们重新抛出，让全局异常过滤器处理
      throw error;
    }
  }

  /**
   * 搜索和筛选产品
   * @param query 搜索和筛选参数
   * @returns 分页产品列表
   */
  @Get('search')
  @ApiOperation({
    summary: '搜索和筛选产品',
    description: '使用关键词搜索产品，支持价格、年龄、地点等多条件筛选'
  })
  @ApiQuery({ name: 'keyword', required: true, type: String, example: '科技馆' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 500 })
  @ApiQuery({ name: 'minAge', required: false, type: Number, example: 6 })
  @ApiQuery({ name: 'maxAge', required: false, type: Number, example: 12 })
  @ApiQuery({ name: 'location', required: false, type: String, example: '上海' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: '成功返回搜索结果',
    type: PaginatedProductsDto
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败'
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误'
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async search(@Query() query: SearchProductsDto) {
    try {
      return await this.productsService.search(query);
    } catch (error) {
      // 记录错误详情
      this.logger.error(
        `Failed to search products with query ${JSON.stringify(query)}:`,
        error,
      );

      // 重新抛出，让全局异常过滤器处理
      throw error;
    }
  }
}
