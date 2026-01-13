import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { SearchProductsDto } from './dto/search-products.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: Partial<jest.Mocked<ProductsService>>;

  beforeEach(async () => {
    productsService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const mockResponse = {
      data: [
        {
          id: 1,
          title: '上海科技馆探索之旅',
          price: '299.00',
          originalPrice: '399.00',
          images: ['https://example.com/image.jpg'],
          location: '上海',
          duration: '1天',
          stock: 50,
          featured: true,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    };

    it('should return products list with default parameters', async () => {
      productsService.findAll!.mockResolvedValue(mockResponse);

      const result = await controller.findAll({} as GetProductsDto);

      expect(result).toEqual(mockResponse);
      expect(productsService.findAll).toHaveBeenCalledWith({});
    });

    it('should accept and pass query parameters', async () => {
      const mockResponse2 = {
        data: [],
        meta: { total: 0, page: 2, pageSize: 10, totalPages: 0 },
      };

      productsService.findAll!.mockResolvedValue(mockResponse2);

      const queryDto: GetProductsDto = {
        page: 2,
        pageSize: 10,
        categoryId: 5,
        sortBy: 'price_asc',
      };

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(mockResponse2);
      expect(productsService.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should return empty list when no products match', async () => {
      const mockEmptyResponse = {
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      };

      productsService.findAll!.mockResolvedValue(mockEmptyResponse);

      const result = await controller.findAll({ categoryId: 999 } as GetProductsDto);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle service errors gracefully', async () => {
      productsService.findAll!.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.findAll({} as GetProductsDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should pass sortBy parameter correctly', async () => {
      productsService.findAll!.mockResolvedValue(mockResponse);

      const validSortValues = ['price_asc', 'price_desc', 'created', 'popular'];

      for (const sortBy of validSortValues) {
        await controller.findAll({ sortBy } as GetProductsDto);

        expect(productsService.findAll).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy }),
        );
      }
    });

    it('should handle page parameter correctly', async () => {
      const mockPaginatedResponse = {
        data: [],
        meta: { total: 0, page: 3, pageSize: 20, totalPages: 0 },
      };

      productsService.findAll!.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll({ page: 3 } as GetProductsDto);

      expect(productsService.findAll).toHaveBeenCalledWith({ page: 3 });
    });

    it('should handle pageSize parameter correctly', async () => {
      productsService.findAll!.mockResolvedValue(mockResponse);

      await controller.findAll({ pageSize: 50 } as GetProductsDto);

      expect(productsService.findAll).toHaveBeenCalledWith({ pageSize: 50 });
    });

    it('should handle categoryId parameter correctly', async () => {
      productsService.findAll!.mockResolvedValue(mockResponse);

      await controller.findAll({ categoryId: 10 } as GetProductsDto);

      expect(productsService.findAll).toHaveBeenCalledWith({ categoryId: 10 });
    });

    it('should use default values when parameters are missing', async () => {
      productsService.findAll!.mockResolvedValue(mockResponse);

      await controller.findAll({} as GetProductsDto);

      expect(productsService.findAll).toHaveBeenCalledWith({});
    });

    it('should handle all parameters together', async () => {
      const mockComplexResponse = {
        data: [
          {
            id: 2,
            title: '北京博物馆研学',
            price: '399.00',
            originalPrice: undefined,
            images: ['https://example.com/image2.jpg'],
            location: '北京',
            duration: '2天',
            stock: 30,
            featured: false,
          },
        ],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      };

      productsService.findAll!.mockResolvedValue(mockComplexResponse as any);

      const queryDto: GetProductsDto = {
        page: 1,
        pageSize: 10,
        categoryId: 5,
        sortBy: 'popular',
      };

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(mockComplexResponse);
      expect(productsService.findAll).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('search', () => {
    const mockSearchResponse = {
      data: [
        {
          id: 1,
          title: '上海科技馆探索之旅',
          price: '299.00',
          originalPrice: '399.00',
          images: ['https://example.com/image.jpg'],
          location: '上海',
          duration: '1天',
          stock: 50,
          featured: true,
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    };

    it('should return search results with keyword', async () => {
      productsService.search = jest.fn().mockResolvedValue(mockSearchResponse);

      const result = await controller.search({ keyword: '科技馆' } as SearchProductsDto);

      expect(result).toEqual(mockSearchResponse);
      expect(productsService.search).toHaveBeenCalledWith({ keyword: '科技馆' });
    });

    it('should accept and pass search parameters', async () => {
      productsService.search = jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      });

      const searchDto: SearchProductsDto = {
        keyword: '科技',
        categoryId: 1,
        minPrice: 100,
        maxPrice: 500,
        minAge: 6,
        maxAge: 12,
        location: '上海',
        page: 1,
        pageSize: 10,
      };

      const result = await controller.search(searchDto);

      expect(productsService.search).toHaveBeenCalledWith(searchDto);
    });

    it('should return empty array when no products match', async () => {
      productsService.search = jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      });

      const result = await controller.search({ keyword: '不存在' } as SearchProductsDto);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle service errors gracefully', async () => {
      productsService.search = jest.fn().mockRejectedValue(
        new Error('Database query failed'),
      );

      await expect(controller.search({ keyword: 'test' } as SearchProductsDto)).rejects.toThrow(
        'Database query failed',
      );
    });

    it('should handle page parameter correctly', async () => {
      productsService.search = jest.fn().mockResolvedValue(mockSearchResponse);

      await controller.search({ keyword: 'test', page: 2, pageSize: 20 } as SearchProductsDto);

      expect(productsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });

    it('should handle pageSize parameter correctly', async () => {
      productsService.search = jest.fn().mockResolvedValue(mockSearchResponse);

      await controller.search({ keyword: 'test', page: 1, pageSize: 50 } as SearchProductsDto);

      expect(productsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 50 }),
      );
    });

    it('should handle all search filters together', async () => {
      productsService.search = jest.fn().mockResolvedValue(mockSearchResponse);

      const searchDto: SearchProductsDto = {
        keyword: '科技馆',
        categoryId: 1,
        minPrice: 200,
        maxPrice: 400,
        minAge: 6,
        maxAge: 12,
        location: '上海',
        page: 1,
        pageSize: 20,
      };

      await controller.search(searchDto);

      expect(productsService.search).toHaveBeenCalledWith(searchDto);
    });
  });
});
