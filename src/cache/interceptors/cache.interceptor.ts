import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHE_KEY, CACHE_TTL } from '../decorators/cache.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const handler = context.getHandler();
    const cacheKey = this.reflector.get<string>(CACHE_KEY, handler);
    const cacheTtl = this.reflector.get<number>(CACHE_TTL, handler);

    // Si no hay decorador @Cacheable, continuar sin caché
    if (!cacheKey) {
      return next.handle();
    }

    // Generar la clave del caché reemplazando parámetros
    const request = context.switchToHttp().getRequest();
    const resolvedKey = this.resolveKey(cacheKey, request);

    // Intentar obtener del caché
    const cached = await this.cacheService.get(resolvedKey);
    if (cached !== null) {
      this.logger.debug(`✅ Cache HIT: ${resolvedKey}`);
      return of(cached);
    }

    // Si no está en caché, ejecutar el método y guardar resultado
    this.logger.debug(`❌ Cache MISS: ${resolvedKey}`);
    return next.handle().pipe(
      tap(async (data) => {
        // Guardar en caché de forma asíncrona
        await this.cacheService.set(resolvedKey, data, cacheTtl);
      }),
    );
  }

  private resolveKey(key: string, request: any): string {
    // Reemplazar :paramName con valores del request
    let resolved = key;

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

    // Body (para métodos POST/PUT)
    if (request.body) {
      Object.keys(request.body).forEach((param) => {
        const value = request.body[param];
        if (typeof value === 'string' || typeof value === 'number') {
          resolved = resolved.replace(`:${param}`, String(value));
          resolved = resolved.replace(`{{${param}}}`, String(value));
        }
      });
    }

    // User del JWT (si está autenticado)
    if (request.user) {
      resolved = resolved.replace(':userId', request.user.userId || '');
      resolved = resolved.replace('{{userId}}', request.user.userId || '');
    }

    return resolved;
  }
}







