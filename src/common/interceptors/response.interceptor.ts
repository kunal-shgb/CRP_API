import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  meta: any;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(res => {
        // If the service already returns an object with `data` or `meta`, we extract them.
        // Otherwise, the entire response is considered `data`.
        const isObjectWithData = typeof res === 'object' && res !== null && !Array.isArray(res) && ('data' in res || 'meta' in res);
        
        const data = isObjectWithData && 'data' in res ? res.data : (isObjectWithData ? null : res);
        const meta = isObjectWithData && 'meta' in res ? res.meta : null;
        const message = isObjectWithData && 'message' in res ? res.message : 'Request successful';

        // Check if the response matches our standard structure already (to prevent double-wrapping)
        if (isObjectWithData && 'success' in res && 'timestamp' in res) {
          return res as Response<T>;
        }

        return {
          success: true,
          message,
          data: data !== undefined ? data : null,
          meta: meta || null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
