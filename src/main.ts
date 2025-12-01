import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  logger.log('🚀 Iniciando creación de la aplicación Nest...');
  const app = await NestFactory.create(AppModule);
  logger.log('✅ Aplicación Nest creada');

  const configService = app.get(ConfigService);
  logger.log('✅ ConfigService obtenido');

  // Prefijo global de la API
  app.setGlobalPrefix(configService.get('API_PREFIX', 'api/v1'));
  logger.log('✅ Prefijo global configurado');

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  logger.log('✅ ValidationPipe global configurado');

  // CORS
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:3005');
  const isProduction = configService.get('NODE_ENV') === 'production';
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Swagger UI desde el mismo dominio, Postman, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // En producción, permitir el mismo dominio (para Swagger UI)
      if (isProduction && origin.includes('api.festgo-bar.com')) {
        callback(null, true);
        return;
      }
      
      // Lista de orígenes permitidos
      const allowedOrigins = [
        corsOrigin,
        'http://localhost:3004',
        'https://api.festgo-bar.com',
        'http://localhost:3005',
        'http://localhost:3000',
      ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // En desarrollo, permitir todos para facilitar testing
        // En producción, solo permitir orígenes conocidos
        callback(null, !isProduction);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  logger.log('✅ CORS habilitado');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Fest-Go System Table - API de Gestión de Restaurantes')
    .setDescription(
      `API completa para la gestión integral de restaurantes Grove System Table.
      
      ## Características principales:
      - 🔐 Sistema de autenticación JWT
      - 🍽️ Gestión completa de mesas y pedidos
      - 📋 Sistema de inventario avanzado con proveedores
      - 📅 Sistema de reservas con CRM integrado
      - 👥 Gestión de empleados y roles
      - 💰 Facturación y múltiples métodos de pago
      - 📊 Dashboard en tiempo real y reportes
      - 🔍 Sistema de auditoría completo

      ## Base URL de desarrollo:
      \`http://localhost:3004/api/v1\`
      
      ## Autenticación:
      Utiliza Bearer Token (JWT) para endpoints protegidos.
      
      ## Códigos de estado HTTP:
      - 200: OK - Operación exitosa
      - 201: Created - Recurso creado exitosamente
      - 400: Bad Request - Error de validación
      - 401: Unauthorized - Token requerido o inválido
      - 403: Forbidden - Sin permisos suficientes
      - 404: Not Found - Recurso no encontrado
      - 409: Conflict - Conflicto de datos
      - 500: Internal Server Error - Error del servidor
      
      ## Paginación:
      Los endpoints que retornan listas utilizan paginación estándar:
      - \`page\`: Número de página (por defecto: 1)
      - \`limit\`: Elementos por página (por defecto: 10, máximo: 100)
      `,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Introduce el token JWT obtenido del endpoint de login',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3004/api/v1', 'Servidor de Desarrollo')
    .addServer('https://api.festgo-bar.com/api/v1', 'Servidor de Producción')
    .addTag('auth', '🔐 Autenticación')
    .addTag('users', '👤 Usuarios')
    .addTag('tables', '🍽️ Mesas')
    .addTag('products', '🥘 Productos')
    .addTag('orders', '📝 Pedidos')
    .addTag('bills', '🧾 Facturación')
    .addTag('inventory', '📦 Inventario')
    .addTag('suppliers', '🚚 Proveedores')
    .addTag('reservations', '📅 Reservas')
    .addTag('customers', '👥 Clientes')
    .addTag('waitlist', '⏳ Lista de Espera')
    .addTag('employees', '👨‍💼 Empleados')
    .addTag('reports', '📊 Reportes')
    .addTag('admin', '⚙️ Administración')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('✅ Swagger configurado en /api/docs');

  const port = configService.get('PORT', 3004);
  logger.log(`🟡 Llamando a app.listen(${port})...`);
  await app.listen(port);
  logger.log(`🚀 Grove System API running on: http://localhost:${port}`);
  logger.log(`📚 Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('❌ Error al iniciar la aplicación NestJS:', err);
  process.exit(1);
});