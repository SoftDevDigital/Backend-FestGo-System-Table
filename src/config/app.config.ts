import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    rateLimitLimit: parseInt(process.env.RATE_LIMIT_LIMIT, 10) || 100,
  },
  swagger: {
    title: process.env.SWAGGER_TITLE || 'Grove System API',
    description: process.env.SWAGGER_DESCRIPTION || 'Restaurant Management System API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
  },
  admin: {
    defaultEmail: process.env.ADMIN_DEFAULT_EMAIL || 'admin@grovesystem.com',
    defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!',
  },
  thermalPrinter: {
    ip: process.env.THERMAL_PRINTER_IP || '192.168.1.100',
    port: parseInt(process.env.THERMAL_PRINTER_PORT, 10) || 9100,
  },
}));