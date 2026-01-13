import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ResponseMeta {
  timestamp: string;
  version: string;
}

interface ResponseData<T> {
  data: T;
  meta: ResponseMeta;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseData<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseData<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      })),
    );
  }
}
