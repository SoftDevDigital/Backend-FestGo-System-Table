import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const CACHE_INVALIDATE = 'cache:invalidate';

/**
 * Decorador para cachear el resultado de un método
 * 
 * @param key - Clave del caché (puede usar :paramName para parámetros del método)
 * @param ttlSeconds - Tiempo de vida en segundos (opcional, usa el default si no se especifica)
 * 
 * @example
 * ```typescript
 * @Cacheable('user:{{id}}', 600)
 * async findById(id: string) {
 *   return this.repository.findOne(id);
 * }
 * ```
 */
export const Cacheable = (key: string, ttlSeconds?: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, key)(target, propertyKey, descriptor);
    if (ttlSeconds !== undefined) {
      SetMetadata(CACHE_TTL, ttlSeconds)(target, propertyKey, descriptor);
    }
  };
};

/**
 * Decorador para invalidar caché después de una operación
 * 
 * @param patterns - Patrones de claves a invalidar (puede usar :paramName)
 * 
 * @example
 * ```typescript
 * @CacheInvalidate(['user:{{id}}', 'users:list'])
 * async update(id: string, data: UpdateDto) {
 *   return this.repository.update(id, data);
 * }
 * ```
 */
export const CacheInvalidate = (...patterns: string[]) => {
  return SetMetadata(CACHE_INVALIDATE, patterns);
};







