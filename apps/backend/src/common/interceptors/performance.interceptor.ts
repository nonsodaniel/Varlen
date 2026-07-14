import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const SLOW_THRESHOLD_MS = 1000;

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration >= SLOW_THRESHOLD_MS) {
          this.logger.warn(
            `SLOW REQUEST: ${method} ${url} took ${duration}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`,
          );
        }
      }),
    );
  }
}
