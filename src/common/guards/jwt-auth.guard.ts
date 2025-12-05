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

    if (isPublic) {
      // Si es público, intentar validar el token si está presente (opcional)
      // Esto permite que req.user esté disponible para validaciones condicionales
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Hay token, intentar validarlo (pero no fallar si es inválido)
        try {
          return super.canActivate(context);
        } catch {
          // Si el token es inválido pero el endpoint es público, permitir acceso sin user
          return true;
        }
      }
      
      // No hay token, permitir acceso (es público)
      return true;
    }

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
      throw err || new UnauthorizedException('Token inválido o expirado');
    }
    return user;
  }
}

