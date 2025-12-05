import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '../src/common/enums/index';

async function testLoginRoles() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  const testCredentials = [
    {
      email: 'admin@test.com',
      password: '123456',
      role: UserRole.ADMIN,
      expectedRole: 'admin',
    },
    {
      email: 'employee@test.com',
      password: '123456',
      role: UserRole.EMPLOYEE,
      expectedRole: 'employee',
    },
    {
      email: 'customer@test.com',
      password: '123456',
      role: UserRole.CUSTOMER,
      expectedRole: 'customer',
    },
  ];

  console.log('🧪 Probando login para los 3 roles...\n');
  console.log('='.repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const creds of testCredentials) {
    try {
      console.log(`\n📋 Probando login para rol: ${creds.expectedRole.toUpperCase()}`);
      console.log(`   Email: ${creds.email}`);

      const result = await authService.login({
        email: creds.email,
        password: creds.password,
      });

      // Verificar que el resultado tenga la estructura correcta
      if (!result.access_token) {
        throw new Error('No se recibió access_token');
      }

      if (!result.user) {
        throw new Error('No se recibió información del usuario');
      }

      if (result.user.role !== creds.expectedRole) {
        throw new Error(
          `Rol incorrecto. Esperado: ${creds.expectedRole}, Obtenido: ${result.user.role}`
        );
      }

      // Verificar que el token no esté vacío
      if (result.access_token.length < 10) {
        throw new Error('Token JWT parece inválido (muy corto)');
      }

      console.log(`   ✅ Login exitoso`);
      console.log(`   ✅ Token generado: ${result.access_token.substring(0, 20)}...`);
      console.log(`   ✅ Usuario ID: ${result.user.userId}`);
      console.log(`   ✅ Email: ${result.user.email}`);
      console.log(`   ✅ Rol: ${result.user.role}`);

      successCount++;
    } catch (error) {
      console.log(`   ❌ Error en login: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumen de pruebas:');
  console.log(`   ✅ Exitosos: ${successCount}/3`);
  console.log(`   ❌ Fallidos: ${failCount}/3`);

  if (failCount === 0) {
    console.log('\n🎉 ¡Todos los logins funcionan correctamente para los 3 roles!');
  } else {
    console.log('\n⚠️  Algunos logins fallaron. Revisa los errores arriba.');
  }

  await app.close();
  process.exit(failCount > 0 ? 1 : 0);
}

testLoginRoles();

