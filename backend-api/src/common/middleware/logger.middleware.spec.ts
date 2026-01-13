import { LoggerMiddleware } from './logger.middleware';
import { Request, Response, NextFunction } from 'express';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new LoggerMiddleware();

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
    };

    mockResponse = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          callback();
        }
      }),
    };

    mockNext = jest.fn();

    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log request information on finish', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should include all required fields in log', () => {
    const logSpy = jest.spyOn(middleware['logger'], 'log');

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(logSpy).toHaveBeenCalled();
    const loggedData = JSON.parse(logSpy.mock.calls[0][0]);

    expect(loggedData).toHaveProperty('method');
    expect(loggedData).toHaveProperty('url');
    expect(loggedData).toHaveProperty('statusCode');
    expect(loggedData).toHaveProperty('responseTime');
    expect(loggedData).toHaveProperty('ip');
    expect(loggedData).toHaveProperty('timestamp');
  });

  it('should measure response time', () => {
    const logSpy = jest.spyOn(middleware['logger'], 'log');

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    const loggedData = JSON.parse(logSpy.mock.calls[0][0]);
    expect(loggedData.responseTime).toMatch(/\d+ms/);
  });
});
