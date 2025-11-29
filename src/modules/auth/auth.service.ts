import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(credentials: any) {
    // Implementar lógica de autenticación
    return { access_token: 'sample_token' };
  }

  async register(userData: any) {
    // Implementar lógica de registro
    return { message: 'Usuario registrado' };
  }
}