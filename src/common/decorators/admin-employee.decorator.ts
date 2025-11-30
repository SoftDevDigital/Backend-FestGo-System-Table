import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../enums';

/**
 * Decorador combinado para endpoints ADMIN + EMPLOYEE
 * 
 * Aplica automáticamente:
 * - Autenticación JWT requerida
 * - Roles ADMIN o EMPLOYEE permitidos
 * - Documentación Swagger con Bearer Auth
 * 
 * @example
 * ```typescript
 * @AdminOrEmployee()
 * @Get('inventory')
 * findAll() {
 *   return this.inventoryService.findAll();
 * }
 * ```
 */
export function AdminOrEmployee() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.ADMIN, UserRole.EMPLOYEE),
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: '❌ No autenticado - Token JWT requerido' }),
    ApiForbiddenResponse({ description: '🚫 Acceso denegado - Solo administradores o empleados' }),
  );
}

