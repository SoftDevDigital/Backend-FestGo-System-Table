import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard de autenticación JWT
 * 
 * Protege los endpoints verificando que el usuario tenga un token JWT válido.
 * Puede ser omitido usando el decorador @Public()
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar si el endpoint es público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si es público, permitir acceso sin validar token
    if (isPublic) {
      return true;
    }

    // Si no es público, validar token normalmente
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context?: ExecutionContext) {
    // Si el endpoint es público, nunca lanzar excepción aunque el token sea inválido
    if (context) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        // Permitir acceso siempre, aunque el token sea inválido
        return user || null;
      }
    }
    // Si no es público, aplicar lógica normal
    if (err || !user) {
      // Lanzar UnauthorizedException sin stack trace innecesario
      // El error será manejado por los filtros sin mostrar información técnica
      const errorMessage = err?.message || 'Token inválido o expirado';
      throw new UnauthorizedException(errorMessage);
    }
    return user;
  }
}

