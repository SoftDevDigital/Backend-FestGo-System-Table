import { SetMetadata } from '@nestjs/common';

/**
 * Clave para identificar endpoints públicos
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorador para marcar endpoints como públicos (sin autenticación requerida)
 * 
 * @example
 * ```typescript
 * @Public()
 * @Get('products')
 * findAll() {
 *   return this.productsService.findAll();
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

