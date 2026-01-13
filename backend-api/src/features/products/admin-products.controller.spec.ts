import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('AdminProductsController', () => {
  let controller: AdminProductsController;
  let service: AdminProductsService;

  const mockAdminProductsService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProductsController],
      providers: [
        {
          provide: AdminProductsService,
          useValue: mockAdminProductsService,
        },
      ],
    }).compile();

    controller = module.get<AdminProductsController>(AdminProductsController);
    service = module.get<AdminProductsService>(AdminProductsService);

    jest.clearAllMocks();
    // Disable logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      title: '上海科技馆探索之旅',
      description: '精彩的科技探索之旅',
      categoryId: 1,
      price: 299.00,
      stock: 50,
      location: '上海浦东新区',
      images: ['https://oss.example.com/products/1/image1.jpg'],
    };

    it('should successfully create a product', async () => {
      const mockProduct = {
        id: 1,
        ...createProductDto,
        price: '299.00',
        originalPrice: undefined,
        minAge: undefined,
        maxAge: undefined,
        duration: undefined,
        featured: false,
        status: 'DRAFT',
        viewCount: 0,
        bookingCount: 0,
        category: { id: 1, name: '自然科学' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAdminProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto);

      expect(result).toEqual(mockProduct);
      expect(service.create).toHaveBeenCalledWith(createProductDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const error = new Error('Category not found');
      mockAdminProductsService.create.mockRejectedValue(error);

      await expect(controller.create(createProductDto)).rejects.toThrow(error);
      expect(service.create).toHaveBeenCalledWith(createProductDto);
    });
  });

  describe('update', () => {
    const updateProductDto: UpdateProductDto = {
      title: '上海科技馆探索之旅（更新版）',
      price: 399.00,
    };

    it('should successfully update a product', async () => {
      const mockProduct = {
        id: 1,
        title: '上海科技馆探索之旅（更新版）',
        price: '399.00',
        categoryId: 1,
        category: { id: 1, name: '自然科学' },
      };

      mockAdminProductsService.update.mockResolvedValue(mockProduct);

      // ParsePositiveIntPipe would convert '1' to number 1 before controller method
      const result = await controller.update(1, updateProductDto);

      expect(result).toEqual(mockProduct);
      expect(service.update).toHaveBeenCalledWith(1, updateProductDto);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should parse id parameter correctly', async () => {
      const mockProduct = {
        id: 42,
        title: 'Updated Product',
      };

      mockAdminProductsService.update.mockResolvedValue(mockProduct);

      // ParsePositiveIntPipe would convert '42' to number 42
      const result = await controller.update(42, updateProductDto);

      expect(result).toEqual(mockProduct);
      expect(service.update).toHaveBeenCalledWith(42, updateProductDto);
    });

    it('should handle service errors', async () => {
      const error = new Error('Product not found');
      mockAdminProductsService.update.mockRejectedValue(error);

      // ParsePositiveIntPipe would convert '999' to number 999
      await expect(controller.update(999, updateProductDto)).rejects.toThrow(error);
      expect(service.update).toHaveBeenCalledWith(999, updateProductDto);
    });
  });

  describe('update parameter validation', () => {
    const updateProductDto: UpdateProductDto = {
      title: '上海科技馆探索之旅（更新版）',
      price: 399.00,
    };

    it('should reject invalid non-numeric id', async () => {
      // ParsePositiveIntPipe should reject 'abc'
      await expect(controller.update('abc', updateProductDto)).rejects.toThrow();
    });

    it('should reject negative id', async () => {
      // ParsePositiveIntPipe should reject '-1'
      await expect(controller.update('-1', updateProductDto)).rejects.toThrow();
    });

    it('should reject zero id', async () => {
      // ParsePositiveIntPipe should reject '0'
      await expect(controller.update('0', updateProductDto)).rejects.toThrow();
    });

    it('should reject decimal id', async () => {
      // ParsePositiveIntPipe should reject '1.5'
      await expect(controller.update('1.5', updateProductDto)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should successfully delete a product', async () => {
      mockAdminProductsService.remove.mockResolvedValue(undefined);

      // ParsePositiveIntPipe would convert '1' to number 1
      await expect(controller.remove(1)).resolves.not.toThrow();

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should parse id parameter correctly', async () => {
      mockAdminProductsService.remove.mockResolvedValue(undefined);

      // ParsePositiveIntPipe would convert '42' to number 42
      await expect(controller.remove(42)).resolves.not.toThrow();

      expect(service.remove).toHaveBeenCalledWith(42);
    });

    it('should handle service errors', async () => {
      const error = new Error('Product has orders, cannot delete');
      mockAdminProductsService.remove.mockRejectedValue(error);

      // ParsePositiveIntPipe would convert '1' to number 1
      await expect(controller.remove(1)).rejects.toThrow(error);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('remove parameter validation', () => {
    it('should reject invalid non-numeric id', async () => {
      await expect(controller.remove('abc')).rejects.toThrow();
    });

    it('should reject negative id', async () => {
      await expect(controller.remove('-1')).rejects.toThrow();
    });

    it('should reject zero id', async () => {
      await expect(controller.remove('0')).rejects.toThrow();
    });

    it('should reject decimal id', async () => {
      await expect(controller.remove('1.5')).rejects.toThrow();
    });
  });

  describe('error logging', () => {
    it('should log errors when create fails', async () => {
      const errorLogger = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Database error');
      mockAdminProductsService.create.mockRejectedValue(error);

      await expect(controller.create({} as CreateProductDto)).rejects.toThrow();

      expect(errorLogger).toHaveBeenCalled();
    });

    it('should log errors when update fails', async () => {
      const errorLogger = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Database error');
      mockAdminProductsService.update.mockRejectedValue(error);

      await expect(controller.update(1, {} as UpdateProductDto)).rejects.toThrow();

      expect(errorLogger).toHaveBeenCalled();
    });

    it('should log errors when remove fails', async () => {
      const errorLogger = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Database error');
      mockAdminProductsService.remove.mockRejectedValue(error);

      await expect(controller.remove(1)).rejects.toThrow();

      expect(errorLogger).toHaveBeenCalled();
    });
  });
});
