import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: '🔐 Iniciar sesión', description: 'Autentica un usuario y retorna un token JWT' })
  login(@Body() credentials: any) {
    return this.authService.login(credentials);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: '📝 Registrar nuevo usuario', description: 'Crea una nueva cuenta de usuario' })
  register(@Body() userData: any) {
    return this.authService.register(userData);
  }
}