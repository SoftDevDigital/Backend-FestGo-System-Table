import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums';

/**
 * Guard de autorización por roles
 * 
 * Verifica que el usuario tenga uno de los roles requeridos para acceder al endpoint.
 * Debe usarse junto con JwtAuthGuard para asegurar que el usuario esté autenticado.
 * 
 * El usuario debe tener el campo 'role' en el objeto user (proveniente del JWT).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos del decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener el usuario del request (debe estar autenticado)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Verificar si el usuario tiene uno de los roles requeridos
    const userRole = user.role as UserRole;
    
    if (!userRole) {
      throw new ForbiddenException('Usuario sin rol asignado');
    }

    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Roles requeridos: ${requiredRoles.join(', ')}. Tu rol: ${userRole}`
      );
    }

    return true;
  }
}

