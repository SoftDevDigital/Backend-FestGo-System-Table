import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/auth/users.service';
import { UserRole } from '../src/common/enums/index';

async function createTestUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const testUsers = [
    {
      email: 'admin@test.com',
      password: '123456',
      name: 'Admin Test',
      role: UserRole.ADMIN,
    },
    {
      email: 'employee@test.com',
      password: '123456',
      name: 'Employee Test',
      role: UserRole.EMPLOYEE,
    },
    {
      email: 'customer@test.com',
      password: '123456',
      name: 'Customer Test',
      role: UserRole.CUSTOMER,
    },
  ];

  console.log('🔧 Creando usuarios de prueba para los 3 roles...\n');

  for (const userData of testUsers) {
    try {
      // Verificar si ya existe
      const existing = await usersService.findByEmail(userData.email);
      if (existing) {
        console.log(`✅ Usuario ${userData.role} ya existe: ${userData.email}`);
        console.log(`   ID: ${existing.id}`);
        console.log(`   Rol: ${existing.role}`);
        console.log(`   Activo: ${existing.isActive}\n`);
        continue;
      }

      // Crear usuario
      const user = await usersService.create({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
      });

      console.log(`✅ Usuario ${userData.role} creado exitosamente:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Password: ${userData.password}\n`);
    } catch (error) {
      console.error(`❌ Error creando usuario ${userData.role}: ${error.message}\n`);
    }
  }

  await app.close();
}

createTestUsers();


