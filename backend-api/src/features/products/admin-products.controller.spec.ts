import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';

describe('AdminProductsController', () => {
  let controller: AdminProductsController;
  let service: AdminProductsService;

  const mockAdminProductsService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    updateStock: jest.fn(),
    getLowStockProducts: jest.fn(),
    generateUploadUrl: jest.fn(),
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
      price: 299.0,
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
      price: 399.0,
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
      await expect(controller.update(999, updateProductDto)).rejects.toThrow(
        error,
      );
      expect(service.update).toHaveBeenCalledWith(999, updateProductDto);
    });
  });

  describe('update parameter validation', () => {
    const updateProductDto: UpdateProductDto = {
      title: '上海科技馆探索之旅（更新版）',
      price: 399.0,
    };

    it('should reject invalid non-numeric id', async () => {
      // ParsePositiveIntPipe should reject 'abc'
      await expect(
        controller.update('abc', updateProductDto),
      ).rejects.toThrow();
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
      await expect(
        controller.update('1.5', updateProductDto),
      ).rejects.toThrow();
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

      await expect(
        controller.update(1, {} as UpdateProductDto),
      ).rejects.toThrow();

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

  describe('updateStatus', () => {
    const updateStatusDto: UpdateProductStatusDto = {
      status: 'PUBLISHED',
    };

    it('should successfully update product status', async () => {
      const mockProduct = {
        id: 1,
        title: '上海科技馆探索之旅',
        status: 'PUBLISHED',
        categoryId: 1,
        category: { id: 1, name: '自然科学' },
      };

      mockAdminProductsService.updateStatus.mockResolvedValue(mockProduct);

      const result = await controller.updateStatus(1, updateStatusDto);

      expect(result).toEqual(mockProduct);
      expect(service.updateStatus).toHaveBeenCalledWith(1, updateStatusDto);
      expect(service.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('should parse id parameter correctly', async () => {
      const mockProduct = {
        id: 42,
        title: 'Product 42',
        status: 'UNPUBLISHED',
      };

      mockAdminProductsService.updateStatus.mockResolvedValue(mockProduct);

      const result = await controller.updateStatus(42, {
        status: 'UNPUBLISHED',
      });

      expect(result).toEqual(mockProduct);
      expect(service.updateStatus).toHaveBeenCalledWith(42, {
        status: 'UNPUBLISHED',
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Product not found');
      mockAdminProductsService.updateStatus.mockRejectedValue(error);

      await expect(
        controller.updateStatus(999, updateStatusDto),
      ).rejects.toThrow(error);
      expect(service.updateStatus).toHaveBeenCalledWith(999, updateStatusDto);
    });

    it('should log errors when updateStatus fails', async () => {
      const errorLogger = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Database error');
      mockAdminProductsService.updateStatus.mockRejectedValue(error);

      await expect(
        controller.updateStatus(1, updateStatusDto),
      ).rejects.toThrow();

      expect(errorLogger).toHaveBeenCalled();
    });
  });

  describe('updateStatus parameter validation', () => {
    const updateStatusDto: UpdateProductStatusDto = {
      status: 'PUBLISHED',
    };

    it('should reject invalid non-numeric id', async () => {
      await expect(
        controller.updateStatus('abc', updateStatusDto),
      ).rejects.toThrow();
    });

    it('should reject negative id', async () => {
      await expect(
        controller.updateStatus('-1', updateStatusDto),
      ).rejects.toThrow();
    });

    it('should reject zero id', async () => {
      await expect(
        controller.updateStatus('0', updateStatusDto),
      ).rejects.toThrow();
    });

    it('should reject decimal id', async () => {
      await expect(
        controller.updateStatus('1.5', updateStatusDto),
      ).rejects.toThrow();
    });
  });

  describe('updateStock', () => {
    const updateStockDto: UpdateProductStockDto = {
      stock: 30,
      reason: '销售出库',
    };

    it('should successfully update product stock', async () => {
      const mockProduct = {
        id: 1,
        title: '上海科技馆探索之旅',
        stock: 30,
        lowStock: false,
        categoryId: 1,
        category: { id: 1, name: '自然科学' },
      };

      mockAdminProductsService.updateStock.mockResolvedValue(mockProduct);

      const result = await controller.updateStock(1, updateStockDto);

      expect(result).toEqual(mockProduct);
      expect(service.updateStock).toHaveBeenCalledWith(1, updateStockDto);
      expect(service.updateStock).toHaveBeenCalledTimes(1);
    });

    it('should handle updateStock without reason', async () => {
      const updateStockDtoWithoutReason: UpdateProductStockDto = {
        stock: 25,
      };

      const mockProduct = {
        id: 1,
        title: '上海科技馆探索之旅',
        stock: 25,
        lowStock: false,
      };

      mockAdminProductsService.updateStock.mockResolvedValue(mockProduct);

      const result = await controller.updateStock(
        1,
        updateStockDtoWithoutReason,
      );

      expect(result).toEqual(mockProduct);
      expect(service.updateStock).toHaveBeenCalledWith(
        1,
        updateStockDtoWithoutReason,
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Product not found');
      mockAdminProductsService.updateStock.mockRejectedValue(error);

      await expect(controller.updateStock(999, updateStockDto)).rejects.toThrow(
        error,
      );
      expect(service.updateStock).toHaveBeenCalledWith(999, updateStockDto);
    });

    it('should log errors when updateStock fails', async () => {
      const errorLogger = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Database error');
      mockAdminProductsService.updateStock.mockRejectedValue(error);

      await expect(controller.updateStock(1, updateStockDto)).rejects.toThrow();

      expect(errorLogger).toHaveBeenCalled();
    });
  });

  describe('updateStock parameter validation', () => {
    const updateStockDto: UpdateProductStockDto = {
      stock: 30,
    };

    it('should reject invalid non-numeric id', async () => {
      await expect(
        controller.updateStock('abc', updateStockDto),
      ).rejects.toThrow();
    });

    it('should reject negative id', async () => {
      await expect(
        controller.updateStock('-1', updateStockDto),
      ).rejects.toThrow();
    });

    it('should reject zero id', async () => {
      await expect(
        controller.updateStock('0', updateStockDto),
      ).rejects.toThrow();
    });

    it('should reject decimal id', async () => {
      await expect(
        controller.updateStock('1.5', updateStockDto),
      ).rejects.toThrow();
    });
  });

  describe('getLowStockProducts', () => {
    it('should successfully get low stock products', async () => {
      const mockProducts = [
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
      ];

      mockAdminProductsService.getLowStockProducts.mockResolvedValue(
        mockProducts,
      );

      const result = await controller.getLowStockProducts();

      expect(result).toEqual(mockProducts);
      expect(service.getLowStockProducts).toHaveBeenCalledWith();
      expect(service.getLowStockProducts).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no low stock products', async () => {
      mockAdminProductsService.getLowStockProducts.mockResolvedValue([]);

      const result = await controller.getLowStockProducts();

      expect(result).toEqual([]);
      expect(service.getLowStockProducts).toHaveBeenCalledWith();
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockAdminProductsService.getLowStockProducts.mockRejectedValue(error);

      await expect(controller.getLowStockProducts()).rejects.toThrow(error);
      expect(service.getLowStockProducts).toHaveBeenCalledWith();
    });

    it('should log errors when getLowStockProducts fails', async () => {
      const errorLogger = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Database error');
      mockAdminProductsService.getLowStockProducts.mockRejectedValue(error);

      await expect(controller.getLowStockProducts()).rejects.toThrow();

      expect(errorLogger).toHaveBeenCalled();
    });
  });

  describe('generateUploadUrl', () => {
    const generateUploadUrlDto = {
      fileName: 'example.jpg',
    };

    it('should successfully generate upload URL', async () => {
      const mockResponse = {
        uploadUrl:
          'https://bucket.oss-cn-shanghai.aliyuncs.com/products/2024/01/14/uuid.jpg?signature=...',
        fileName: 'example.jpg',
        fileKey: 'products/2024/01/14/uuid.jpg',
      };

      mockAdminProductsService.generateUploadUrl.mockReturnValue(mockResponse);

      const result = await controller.generateUploadUrl(generateUploadUrlDto);

      expect(result).toEqual(mockResponse);
      expect(service.generateUploadUrl).toHaveBeenCalledWith('example.jpg');
      expect(service.generateUploadUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid file type errors', async () => {
      const error = new Error('Invalid file type');
      mockAdminProductsService.generateUploadUrl.mockImplementation(() => {
        throw error;
      });

      await expect(
        controller.generateUploadUrl(generateUploadUrlDto),
      ).rejects.toThrow(error);
      expect(service.generateUploadUrl).toHaveBeenCalledWith('example.jpg');
    });

    it('should handle service errors', async () => {
      const error = new Error('OSS service error');
      mockAdminProductsService.generateUploadUrl.mockRejectedValue(error);

      await expect(
        controller.generateUploadUrl(generateUploadUrlDto),
      ).rejects.toThrow(error);
      expect(service.generateUploadUrl).toHaveBeenCalledWith('example.jpg');
    });

    it('should log errors when generateUploadUrl fails', async () => {
      const errorLogger = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('OSS service error');
      // Use mockImplementation because generateUploadUrl is a synchronous method
      mockAdminProductsService.generateUploadUrl.mockImplementation(() => {
        throw error;
      });

      await expect(
        controller.generateUploadUrl(generateUploadUrlDto),
      ).rejects.toThrow();

      expect(errorLogger).toHaveBeenCalled();
    });
  });
});
