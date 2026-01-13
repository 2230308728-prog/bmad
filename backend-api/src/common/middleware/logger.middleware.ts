import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, url, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      const logData = {
        method,
        url,
        statusCode,
        responseTime: `${responseTime}ms`,
        ip,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(JSON.stringify(logData));
    });

    next();
  }
}
