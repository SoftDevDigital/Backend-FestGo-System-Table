import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums';

/**
 * Clave para identificar los roles requeridos
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador para especificar qué roles pueden acceder a un endpoint
 * 
 * @param roles - Array de roles permitidos (admin, employee, customer)
 * 
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN)
 * @Get('dashboard')
 * getDashboard() {
 *   return this.adminService.getDashboard();
 * }
 * ```
 * 
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
 * @Get('inventory')
 * findAll() {
 *   return this.inventoryService.findAll();
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

