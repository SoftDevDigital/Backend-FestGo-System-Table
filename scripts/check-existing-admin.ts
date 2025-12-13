import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/auth/users.service';
import { AuthService } from '../src/modules/auth/auth.service';

async function checkExistingAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const authService = app.get(AuthService);

  const emails = [
    'estanislaovaldez78@gmail.com',
    'admin@test.com',
  ];

  console.log('🔍 Verificando usuarios admin existentes...\n');

  for (const email of emails) {
    try {
      const user = await usersService.findByEmail(email);
      
      if (user) {
        console.log(`✅ Usuario encontrado: ${email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Activo: ${user.isActive}`);
        
        // Probar login
        try {
          const result = await authService.login({ email, password: '123456' });
          console.log(`   ✅ Login exitoso - Token generado`);
          console.log(`   ✅ Rol en token: ${result.user.role}\n`);
        } catch (error) {
          console.log(`   ❌ Login falló: ${error.message}\n`);
        }
      } else {
        console.log(`❌ Usuario NO encontrado: ${email}\n`);
      }
    } catch (error) {
      console.error(`❌ Error verificando ${email}: ${error.message}\n`);
    }
  }

  await app.close();
}

checkExistingAdmin();


