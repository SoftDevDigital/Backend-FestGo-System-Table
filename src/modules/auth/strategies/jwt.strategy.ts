import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.secret'),
    });
  }

  async validate(payload: any) {
    // El payload del JWT debe incluir: sub (userId), email, role
    return { 
      userId: payload.sub, 
      email: payload.email,
      role: payload.role || 'customer' // Por defecto 'customer' si no viene en el token
    };
  }
}