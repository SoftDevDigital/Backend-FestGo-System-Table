import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  redis: {
    host: process.env.REDIS_HOST || process.env.ELASTICACHE_ENDPOINT || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
    retryStrategy: (times: number) => {
      // Después de 5 intentos, dejar de intentar reconectar
      if (times > 5) {
        return null; // null detiene los reintentos
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
  },
  defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300, // 5 minutos por defecto
  enabled: process.env.CACHE_ENABLED !== 'false', // Habilitado por defecto
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'festgo:',
}));








