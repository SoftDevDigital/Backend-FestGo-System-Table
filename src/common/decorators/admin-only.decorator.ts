import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../enums';

/**
 * Decorador combinado para endpoints SOLO ADMIN
 * 
 * Aplica automáticamente:
 * - Autenticación JWT requerida
 * - Solo rol ADMIN permitido
 * - Documentación Swagger con Bearer Auth
 * 
 * @example
 * ```typescript
 * @AdminOnly()
 * @Get('dashboard')
 * getDashboard() {
 *   return this.adminService.getDashboard();
 * }
 * ```
 */
export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.ADMIN),
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: '❌ No autenticado - Token JWT requerido' }),
    ApiForbiddenResponse({ description: '🚫 Acceso denegado - Solo administradores' }),
  );
}

