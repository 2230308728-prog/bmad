import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus, Prisma } from '@prisma/client';

/**
 * Admin Products Service
 * 处理管理员产品 CRUD 操作的业务逻辑
 */
@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * 创建产品
   * @param createProductDto 创建产品 DTO
   * @returns 创建的产品
   */
  async create(createProductDto: CreateProductDto) {
    this.logger.log(`Creating product: ${createProductDto.title}`);

    // 验证分类存在
    const category = await this.prisma.productCategory.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`分类 ID ${createProductDto.categoryId} 不存在`);
    }

    // 验证价格和库存
    if (createProductDto.price <= 0) {
      throw new BadRequestException('产品价格必须大于 0');
    }

    if (createProductDto.stock < 0) {
      throw new BadRequestException('库存数量不能小于 0');
    }

    // 验证原价大于现价
    if (createProductDto.originalPrice !== undefined && createProductDto.originalPrice < createProductDto.price) {
      throw new BadRequestException('原价必须大于等于现价');
    }

    // 验证年龄范围
    if (createProductDto.minAge !== undefined && createProductDto.maxAge !== undefined) {
      if (createProductDto.maxAge < createProductDto.minAge) {
        throw new BadRequestException('最大年龄不能小于最小年龄');
      }
    }

    // 创建产品
    const product = await this.prisma.product.create({
      data: {
        title: createProductDto.title,
        description: createProductDto.description,
        categoryId: createProductDto.categoryId,
        price: createProductDto.price,
        originalPrice: createProductDto.originalPrice,
        stock: createProductDto.stock,
        minAge: createProductDto.minAge,
        maxAge: createProductDto.maxAge,
        duration: createProductDto.duration,
        location: createProductDto.location,
        images: createProductDto.images || [],
        featured: createProductDto.featured ?? false,
        status: createProductDto.status ?? ProductStatus.DRAFT,
        viewCount: 0,
        bookingCount: 0,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(`Product created successfully: ${product.id}`);

    // 清除产品列表缓存
    await this.productsService.clearProductsCache();

    // 转换 Decimal 为字符串
    return {
      ...product,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString(),
    };
  }

  /**
   * 更新产品
   * @param id 产品 ID
   * @param updateProductDto 更新产品 DTO
   * @returns 更新后的产品
   */
  async update(id: number, updateProductDto: UpdateProductDto) {
    this.logger.log(`Updating product: ${id}`);

    // 验证产品存在
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`产品 ID ${id} 不存在`);
    }

    // 如果更新分类，验证新分类存在
    if (updateProductDto.categoryId !== undefined) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(`分类 ID ${updateProductDto.categoryId} 不存在`);
      }
    }

    // 如果更新价格，验证价格大于 0
    if (updateProductDto.price !== undefined && updateProductDto.price <= 0) {
      throw new BadRequestException('产品价格必须大于 0');
    }

    // 如果更新原价，验证原价大于现价
    const currentPrice = updateProductDto.price ?? existingProduct.price;
    if (updateProductDto.originalPrice !== undefined && updateProductDto.originalPrice < Number(currentPrice)) {
      throw new BadRequestException('原价必须大于等于现价');
    }

    // 如果更新库存，验证库存大于等于 0
    if (updateProductDto.stock !== undefined && updateProductDto.stock < 0) {
      throw new BadRequestException('库存数量不能小于 0');
    }

    // 验证年龄范围（考虑现有值和新值）
    const minAge = updateProductDto.minAge ?? existingProduct.minAge;
    const maxAge = updateProductDto.maxAge ?? existingProduct.maxAge;
    if (minAge !== undefined && maxAge !== undefined && maxAge < minAge) {
      throw new BadRequestException('最大年龄不能小于最小年龄');
    }

    // 构建更新数据（只包含提供的字段，防止清空非空字段）
    const updateData: Prisma.ProductUpdateInput = {};
    if (updateProductDto.title !== undefined) updateData.title = updateProductDto.title;
    if (updateProductDto.description !== undefined) updateData.description = updateProductDto.description;
    if (updateProductDto.categoryId !== undefined) updateData.categoryId = updateProductDto.categoryId;
    if (updateProductDto.price !== undefined) updateData.price = updateProductDto.price;
    if (updateProductDto.originalPrice !== undefined) updateData.originalPrice = updateProductDto.originalPrice;
    if (updateProductDto.stock !== undefined) updateData.stock = updateProductDto.stock;
    if (updateProductDto.minAge !== undefined) updateData.minAge = updateProductDto.minAge;
    if (updateProductDto.maxAge !== undefined) updateData.maxAge = updateProductDto.maxAge;
    if (updateProductDto.duration !== undefined) updateData.duration = updateProductDto.duration;
    if (updateProductDto.location !== undefined) updateData.location = updateProductDto.location;
    if (updateProductDto.images !== undefined) updateData.images = updateProductDto.images;
    if (updateProductDto.featured !== undefined) updateData.featured = updateProductDto.featured;
    if (updateProductDto.status !== undefined) updateData.status = updateProductDto.status;

    // 更新产品
    const product = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(`Product updated successfully: ${id}`);

    // 清除产品缓存
    await this.productsService.clearProductsCache();

    // 转换 Decimal 为字符串
    return {
      ...product,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString(),
    };
  }

  /**
   * 删除产品（软删除）
   * @param id 产品 ID
   * @throws NotFoundException 产品不存在
   * @throws BadRequestException 产品有订单无法删除
   */
  async remove(id: number) {
    this.logger.log(`Deleting product: ${id}`);

    // 验证产品存在
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`产品 ID ${id} 不存在`);
    }

    // 检查产品是否有订单
    // 注意：由于 orders 表尚未创建，我们检查错误消息来判断
    let hasOrders = false;
    try {
      const orderCount = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM orders WHERE product_id = ${id}
      `;
      hasOrders = (orderCount as any)[0]?.count > 0;
    } catch (error: any) {
      // 只在表不存在时继续执行，其他错误重新抛出
      if (error.message && error.message.includes('relation "orders" does not exist')) {
        this.logger.debug('Orders table does not exist yet, skipping order check');
      } else {
        this.logger.warn(`Unexpected error checking orders: ${error.message}`);
        throw error;
      }
    }

    if (hasOrders) {
      throw new BadRequestException('该产品已有订单，无法删除');
    }

    // 软删除：设置状态为 UNPUBLISHED
    // 由于 ProductStatus 枚举中没有 DELETED，我们使用 UNPUBLISHED 代替
    await this.prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.UNPUBLISHED,
      },
    });

    this.logger.log(`Product deleted successfully: ${id}`);

    // 清除产品缓存
    await this.productsService.clearProductsCache();
  }
}
