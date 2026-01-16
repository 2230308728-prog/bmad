import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';

/**
 * Admin Categories Service
 * 处理管理员产品分类管理的业务逻辑
 */
@Injectable()
export class AdminCategoriesService {
  private readonly logger = new Logger(AdminCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取所有产品分类
   */
  async findAll() {
    this.logger.log('Fetching all product categories');

    const categories = await this.prisma.productCategory.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    this.logger.log(`Found ${categories.length} categories`);

    return categories;
  }

  /**
   * 根据 ID 获取分类
   */
  async findOne(id: number) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`分类 ID ${id} 不存在`);
    }

    return category;
  }

  /**
   * 创建分类
   */
  async create(name: string, description?: string) {
    this.logger.log(`Creating category: ${name}`);

    // 检查名称是否已存在
    const existing = await this.prisma.productCategory.findFirst({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException(`分类名称 "${name}" 已存在`);
    }

    const category = await this.prisma.productCategory.create({
      data: {
        name,
        description,
      },
    });

    this.logger.log(`Category created successfully: ${category.id}`);

    return category;
  }

  /**
   * 更新分类
   */
  async update(id: number, name: string, description?: string) {
    this.logger.log(`Updating category ${id}: ${name}`);

    // 验证分类存在
    await this.findOne(id);

    // 检查名称是否被其他分类使用
    const existing = await this.prisma.productCategory.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });

    if (existing) {
      throw new BadRequestException(`分类名称 "${name}" 已被使用`);
    }

    const category = await this.prisma.productCategory.update({
      where: { id },
      data: {
        name,
        description,
      },
    });

    this.logger.log(`Category updated successfully: ${category.id}`);

    return category;
  }

  /**
   * 删除分类
   */
  async remove(id: number) {
    this.logger.log(`Deleting category ${id}`);

    // 验证分类存在
    await this.findOne(id);

    // 检查是否有关联的产品
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `无法删除该分类，因为还有 ${productCount} 个产品关联到此分类。请先移动或删除这些产品。`,
      );
    }

    await this.prisma.productCategory.delete({
      where: { id },
    });

    this.logger.log(`Category deleted successfully: ${id}`);
  }
}
