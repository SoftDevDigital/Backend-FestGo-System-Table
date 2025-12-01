import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { RegisterDto } from './dto/auth.dto';
import { UserRole } from '../../common/enums';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(credentials: { email: string; password: string }) {
    try {
      const user = await this.usersService.findByEmail(credentials.email);
      
      if (!user) {
        throw new UnauthorizedException('Email o contraseña incorrectos');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Usuario inactivo. Contacte al administrador');
      }

      const isPasswordValid = await this.usersService.validatePassword(
        credentials.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Email o contraseña incorrectos');
      }

      // Generar token JWT
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const access_token = this.jwtService.sign(payload);

      this.logger.log(`Usuario ${user.email} inició sesión exitosamente`);

      return {
        access_token,
        user: {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error en login: ${error.message}`, error.stack);
      throw new Error(`Error al iniciar sesión: ${error.message || 'Error desconocido'}`);
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      // Todos los usuarios registrados serán "customer" por defecto
      // Solo un administrador puede cambiar el rol después
      const user = await this.usersService.create({
        email: registerDto.email,
        password: registerDto.password,
        name: registerDto.name,
        role: UserRole.CUSTOMER, // Siempre customer al registrar
      });

      // Generar token JWT
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const access_token = this.jwtService.sign(payload);

      this.logger.log(`Usuario ${user.email} registrado exitosamente con rol ${user.role}`);

      return {
        access_token,
        user: {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error en registro: ${error.message}`, error.stack);
      throw new Error(`Error al registrar usuario: ${error.message || 'Error desconocido'}`);
    }
  }
}