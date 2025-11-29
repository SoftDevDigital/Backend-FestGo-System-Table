import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, headers } = request;
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `Incoming Request: ${method} ${url}`,
      {
        body: this.sanitizeData(body),
        userAgent: headers['user-agent'],
        ip: request.ip,
        timestamp: new Date().toISOString(),
      },
    );

    return next.handle().pipe(
      tap({
        next: (response) => {
          const executionTime = Date.now() - startTime;
          this.logger.log(
            `Response: ${method} ${url} - ${executionTime}ms`,
            {
              executionTime,
              responseSize: JSON.stringify(response).length,
            },
          );
        },
        error: (error) => {
          const executionTime = Date.now() - startTime;
          this.logger.error(
            `Error Response: ${method} ${url} - ${executionTime}ms`,
            {
              error: error.message,
              stack: error.stack,
              executionTime,
            },
          );
        },
      }),
    );
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'authorization', 'secret'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}