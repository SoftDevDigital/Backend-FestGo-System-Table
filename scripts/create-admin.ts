import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/auth/users.service';
import { UserRole } from '../src/common/enums/index';

async function createAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = process.env.ADMIN_EMAIL || 'estanislaovaldez78@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || '123456';
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  try {
    // Verificar si ya existe
    const existing = await usersService.findByEmail(adminEmail);
    if (existing) {
      console.log(`✅ Usuario admin ya existe: ${adminEmail}`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Rol: ${existing.role}`);
      await app.close();
      return;
    }

    // Crear admin
    const admin = await usersService.create({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: UserRole.ADMIN,
    });

    console.log(`✅ Usuario admin creado exitosamente:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Rol: ${admin.role}`);
    console.log(`   Password: ${adminPassword}`);
  } catch (error) {
    console.error(`❌ Error creando admin: ${error.message}`);
    process.exit(1);
  } finally {
    await app.close();
  }
}

createAdmin();

