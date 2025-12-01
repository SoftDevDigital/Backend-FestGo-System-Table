import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '🔐 Iniciar sesión', 
    description: 'Autentica un usuario con email y contraseña. Retorna un token JWT que debe usarse en el header Authorization: Bearer <token> para acceder a endpoints protegidos.' 
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Login exitoso',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Login exitoso',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            email: 'admin@restaurant.com',
            role: 'admin'
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: '❌ Datos inválidos',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'Error de validación',
        validationErrors: {
          email: 'Debe ser un email válido',
          password: 'La contraseña es requerida'
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Credenciales inválidas',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        message: 'Email o contraseña incorrectos'
      }
    }
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: '📝 Registrar nuevo usuario', 
    description: 'Crea una nueva cuenta de usuario. Todos los usuarios registrados tendrán el rol "customer" por defecto. Solo un administrador puede cambiar el rol después del registro.' 
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ 
    description: '✅ Usuario registrado exitosamente',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@restaurant.com',
            role: 'customer'
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: '❌ Datos inválidos o email ya registrado',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'El email ya está registrado',
        validationErrors: {
          email: 'El email ya está en uso'
        }
      }
    }
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}