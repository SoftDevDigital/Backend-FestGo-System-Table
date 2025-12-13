import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHE_INVALIDATE } from '../decorators/cache.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidateInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const patterns = this.reflector.get<string[]>(CACHE_INVALIDATE, handler);

    // Si no hay decorador @CacheInvalidate, continuar sin invalidar
    if (!patterns || patterns.length === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        // Invalidar caché después de que la operación sea exitosa
        const request = context.switchToHttp().getRequest();
        
        for (const pattern of patterns) {
          const resolvedPattern = this.resolvePattern(pattern, request);
          const deleted = await this.cacheService.delPattern(resolvedPattern);
          if (deleted > 0) {
            this.logger.debug(`🗑️  Invalidado: ${resolvedPattern} (${deleted} claves)`);
          }
        }
      }),
    );
  }

  private resolvePattern(pattern: string, request: any): string {
    // Similar a resolveKey pero para patrones (puede usar wildcards)
    let resolved = pattern;

    // Parámetros de ruta
    if (request.params) {
      Object.keys(request.params).forEach((param) => {
        resolved = resolved.replace(`:${param}`, request.params[param]);
        resolved = resolved.replace(`{{${param}}}`, request.params[param]);
      });
    }

    // Parámetros de query
    if (request.query) {
      Object.keys(request.query).forEach((param) => {
        resolved = resolved.replace(`:${param}`, request.query[param]);
        resolved = resolved.replace(`{{${param}}}`, request.query[param]);
      });
    }

    // Body
    if (request.body) {
      Object.keys(request.body).forEach((param) => {
        const value = request.body[param];
        if (typeof value === 'string' || typeof value === 'number') {
          resolved = resolved.replace(`:${param}`, String(value));
          resolved = resolved.replace(`{{${param}}}`, String(value));
        }
      });
    }

    // User del JWT
    if (request.user) {
      resolved = resolved.replace(':userId', request.user.userId || '');
      resolved = resolved.replace('{{userId}}', request.user.userId || '');
    }

    // Convertir a patrón Redis (reemplazar * con *)
    return resolved.replace(/\*/g, '*');
  }
}








