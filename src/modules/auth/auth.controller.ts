import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() credentials: any) {
    return this.authService.login(credentials);
  }

  @Post('register')
  register(@Body() userData: any) {
    return this.authService.register(userData);
  }
}