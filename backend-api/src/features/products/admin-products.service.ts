import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ProductsService } from './products.service';
import { OssService } from '../../oss/oss.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { ProductStatus, Prisma, Product } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * 产品类型定义 - 用于方法返回值
 */
type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

/**
 * 带 lowStock 标志的产品类型
 */
export type ProductWithLowStock = ProductWithCategory & {
  price: string;
  originalPrice: string | null;
  lowStock: boolean;
};

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
    private readonly ossService: OssService,
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
        duration: createProductDto.duration ?? '待定',
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

    // 验证图片数量（最多 10 张）
    if (updateProductDto.images !== undefined && updateProductDto.images.length > 10) {
      throw new BadRequestException('产品最多支持 10 张图片');
    }

    // 构建更新数据（只包含提供的字段，防止清空非空字段）
    const updateData: Prisma.ProductUpdateInput = {};
    if (updateProductDto.title !== undefined) updateData.title = updateProductDto.title;
    if (updateProductDto.description !== undefined) updateData.description = updateProductDto.description;
    if (updateProductDto.categoryId !== undefined) {
      updateData.category = { connect: { id: updateProductDto.categoryId } };
    }
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

  /**
   * 更新产品状态
   * @param id 产品 ID
   * @param updateStatusDto 更新状态 DTO
   * @returns 更新后的产品
   */
  async updateStatus(id: number, updateStatusDto: UpdateProductStatusDto) {
    this.logger.log(`Updating product status: ${id} -> ${updateStatusDto.status}`);

    // 验证产品存在
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`产品 ID ${id} 不存在`);
    }

    // 验证状态转换合法性：不允许从 PUBLISHED 直接变为 DRAFT
    if (product.status === ProductStatus.PUBLISHED && updateStatusDto.status === ProductStatus.DRAFT) {
      throw new BadRequestException('不允许从已发布状态直接变为草稿状态');
    }

    // 更新产品状态
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        status: updateStatusDto.status,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(`Product status updated successfully: ${id} -> ${updateStatusDto.status}`);

    // 清除产品缓存
    await this.productsService.clearProductsCache();

    // 转换 Decimal 为字符串
    return {
      ...updatedProduct,
      price: updatedProduct.price.toString(),
      originalPrice: updatedProduct.originalPrice?.toString(),
    };
  }

  /**
   * 更新产品库存
   * @param id 产品 ID
   * @param updateStockDto 更新库存 DTO
   * @returns 更新后的产品（含 lowStock 标志）
   */
  async updateStock(id: number, updateStockDto: UpdateProductStockDto): Promise<ProductWithLowStock> {
    this.logger.log(`Updating product stock: ${id} -> ${updateStockDto.stock} (reason: ${updateStockDto.reason || 'N/A'})`);

    // 验证产品存在
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`产品 ID ${id} 不存在`);
    }

    // 验证库存 >= 0
    if (updateStockDto.stock < 0) {
      throw new BadRequestException('库存数量不能小于 0');
    }

    const oldStock = product.stock;

    // 使用 Prisma 事务：更新库存 + 创建历史记录
    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      // 更新库存
      const updated = await tx.product.update({
        where: { id },
        data: {
          stock: updateStockDto.stock,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });

      // 创建库存变更历史记录
      await tx.productStockHistory.create({
        data: {
          productId: id,
          oldStock: oldStock,
          newStock: updateStockDto.stock,
          reason: updateStockDto.reason,
        },
      });

      return updated;
    });

    // 检查库存是否 < 10，记录警告日志
    const lowStock = updatedProduct.stock < 10;
    if (lowStock) {
      this.logger.warn(`⚠️ Low stock warning: Product ${id} (${updatedProduct.title}) has ${updatedProduct.stock} units left`);
    }

    this.logger.log(`Product stock updated successfully: ${id} (${oldStock} -> ${updateStockDto.stock})`);

    // 清除产品缓存
    await this.productsService.clearProductsCache();

    // 转换 Decimal 为字符串，并添加 lowStock 标志
    return {
      ...updatedProduct,
      price: updatedProduct.price.toFixed(2),
      originalPrice: updatedProduct.originalPrice?.toFixed(2) ?? null,
      lowStock,
    } as ProductWithLowStock;
  }

  /**
   * 获取低库存产品列表
   * @returns 低库存产品列表（stock < 10，按库存升序排序）
   */
  async getLowStockProducts() {
    this.logger.log('Fetching low stock products (stock < 10)');

    const products = await this.prisma.product.findMany({
      where: {
        stock: {
          lt: 10,
        },
      },
      orderBy: {
        stock: 'asc', // 按库存数量升序排序
      },
      select: {
        id: true,
        title: true,
        stock: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Found ${products.length} low stock products`);

    return products;
  }

  /**
   * 生成图片上传签名 URL
   * @param fileName 文件名
   * @returns 上传 URL、文件名和文件路径
   */
  generateUploadUrl(fileName: string) {
    this.logger.log(`Generating upload URL for file: ${fileName}`);

    // 验证文件类型（已通过 DTO 验证，这里额外确保）
    if (!this.ossService.validateFileType(fileName)) {
      throw new BadRequestException('文件类型必须是以下之一: jpg, jpeg, png, webp');
    }

    // 生成唯一文件名（使用 UUID + 日期路径）
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const ext = fileName.split('.').pop();
    // 防御性检查：确保文件扩展名存在
    if (!ext || ext === fileName) {
      throw new BadRequestException('文件名必须包含有效的扩展名（如 .jpg, .png）');
    }
    const uniqueFileName = `products/${year}/${month}/${day}/${uuidv4()}.${ext}`;

    // 生成 OSS 直传签名 URL（15 分钟有效）
    const signedUrl = this.ossService.generateSignedUrl(uniqueFileName);

    this.logger.log(`Upload URL generated successfully for: ${uniqueFileName}`);

    return {
      uploadUrl: signedUrl,
      fileName: fileName,
      fileKey: uniqueFileName,
    };
  }
}
