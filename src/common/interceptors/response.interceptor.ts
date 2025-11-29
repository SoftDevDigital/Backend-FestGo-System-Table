import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const startTime = Date.now();

    return next.handle().pipe(
      map(data => ({
        success: true,
        statusCode: response.statusCode,
        message: this.getSuccessMessage(request.method, response.statusCode),
        data,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV !== 'production' && {
          executionTime: `${Date.now() - startTime}ms`,
        }),
      })),
      tap(() => {
        const executionTime = Date.now() - startTime;
        this.logger.log(
          `${request.method} ${request.url} - ${response.statusCode} - ${executionTime}ms`,
        );
      }),
    );
  }

  private getSuccessMessage(method: string, statusCode: number): string {
    switch (method) {
      case 'POST':
        return statusCode === 201 ? 'Recurso creado exitosamente' : 'Operación completada';
      case 'PUT':
      case 'PATCH':
        return 'Recurso actualizado exitosamente';
      case 'DELETE':
        return 'Recurso eliminado exitosamente';
      case 'GET':
      default:
        return 'Operación completada exitosamente';
    }
  }
}