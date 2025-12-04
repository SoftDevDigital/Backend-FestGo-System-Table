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
      map(data => {
        try {
          // Si la respuesta ya tiene la estructura { success, message, data }, no envolverla de nuevo
          if (data && typeof data === 'object' && 'success' in data && 'message' in data && 'data' in data) {
            // Solo agregar metadata adicional sin duplicar la estructura
            const metadata = {
              statusCode: response.statusCode,
              timestamp: new Date().toISOString(),
            };
            
            if (process.env.NODE_ENV !== 'production') {
              (metadata as any).executionTime = `${Date.now() - startTime}ms`;
            }
            
            return {
              ...data,
              ...metadata,
            };
          }
          
          // Si no tiene la estructura, envolverla normalmente
          const wrapped = {
            success: true,
            statusCode: response.statusCode,
            message: this.getSuccessMessage(request.method, response.statusCode),
            data,
            timestamp: new Date().toISOString(),
          };
          
          if (process.env.NODE_ENV !== 'production') {
            (wrapped as any).executionTime = `${Date.now() - startTime}ms`;
          }
          
          return wrapped;
        } catch (error) {
          this.logger.error(`Error en ResponseInterceptor: ${error.message}`, error.stack);
          // Si hay error al procesar, retornar respuesta básica
          return {
            success: false,
            statusCode: 500,
            message: 'Error al procesar la respuesta',
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
      }),
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