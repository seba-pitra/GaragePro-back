import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Response<T> {
  data: T;
  ok: boolean;
  timestamps: string;
}

export class TransformResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        ok: true,
        timestamps: new Date().toISOString(),
        data,
      })),
    );
  }
}
