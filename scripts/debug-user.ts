import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/auth/users.service';

async function debugUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = 'admin@test.com';

  try {
    console.log(`🔍 Buscando usuario: ${email}\n`);
    
    const user = await usersService.findByEmail(email);
    
    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Activo: ${user.isActive}`);
      console.log(`   Tiene password: ${!!user.password}`);
      console.log(`   Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'NO'}`);
    } else {
      console.log('❌ Usuario NO encontrado');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

debugUser();

