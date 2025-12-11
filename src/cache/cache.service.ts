import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis;
  private readonly keyPrefix: string;
  private readonly defaultTtl: number;
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    this.keyPrefix = this.configService.get<string>('cache.keyPrefix', 'festgo:');
    this.defaultTtl = this.configService.get<number>('cache.defaultTtl', 300);
    this.enabled = this.configService.get<boolean>('cache.enabled', true);
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('⚠️  Caché deshabilitado. Las consultas no se cachearán.');
      return;
    }

    try {
      const redisConfig = this.configService.get('cache.redis');
      
      this.client = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        tls: redisConfig.tls,
        connectTimeout: redisConfig.connectTimeout,
        retryStrategy: redisConfig.retryStrategy,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
        enableReadyCheck: redisConfig.enableReadyCheck,
        enableOfflineQueue: redisConfig.enableOfflineQueue,
        lazyConnect: true,
      });

      // Event listeners
      this.client.on('connect', () => {
        this.logger.log('✅ Conectado a Redis');
      });

      this.client.on('ready', () => {
        this.logger.log('✅ Redis listo para recibir comandos');
      });

      this.client.on('error', (error) => {
        this.logger.error(`❌ Error en Redis: ${error.message}`, error.stack);
      });

      this.client.on('close', () => {
        this.logger.warn('⚠️  Conexión a Redis cerrada');
      });

      this.client.on('reconnecting', () => {
        this.logger.log('🔄 Reconectando a Redis...');
      });

      await this.client.connect();
      this.logger.log('🚀 Servicio de caché inicializado correctamente');
    } catch (error) {
      this.logger.error(`❌ Error inicializando Redis: ${error.message}`, error.stack);
      // No lanzar error para que la app pueda funcionar sin caché
      this.enabled = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('🔌 Desconectado de Redis');
    }
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Obtiene un valor del caché
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(this.getKey(key));
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error obteniendo del caché [${key}]: ${error.message}`);
      return null;
    }
  }

  /**
   * Guarda un valor en el caché con TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      const ttl = ttlSeconds ?? this.defaultTtl;
      const serialized = JSON.stringify(value);
      await this.client.setex(this.getKey(key), ttl, serialized);
      return true;
    } catch (error) {
      this.logger.error(`Error guardando en caché [${key}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Elimina una clave del caché
   */
  async del(key: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      await this.client.del(this.getKey(key));
      return true;
    } catch (error) {
      this.logger.error(`Error eliminando del caché [${key}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Elimina múltiples claves que coincidan con un patrón
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(this.getKey(pattern));
      if (keys.length === 0) {
        return 0;
      }
      return await this.client.del(...keys);
    } catch (error) {
      this.logger.error(`Error eliminando patrón del caché [${pattern}]: ${error.message}`);
      return 0;
    }
  }

  /**
   * Verifica si una clave existe
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      this.logger.error(`Error verificando existencia [${key}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene o establece un valor (patrón cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // Intentar obtener del caché
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Si no está en caché, obtener de la fuente original
    const value = await fetcher();
    
    // Guardar en caché (no esperar para no bloquear)
    this.set(key, value, ttlSeconds).catch((error) => {
      this.logger.warn(`Error guardando en caché después de fetch [${key}]: ${error.message}`);
    });

    return value;
  }

  /**
   * Incrementa un contador
   */
  async increment(key: string, by: number = 1): Promise<number> {
    if (!this.enabled || !this.client) {
      return 0;
    }

    try {
      return await this.client.incrby(this.getKey(key), by);
    } catch (error) {
      this.logger.error(`Error incrementando [${key}]: ${error.message}`);
      return 0;
    }
  }

  /**
   * Establece TTL a una clave existente
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      await this.client.expire(this.getKey(key), ttlSeconds);
      return true;
    } catch (error) {
      this.logger.error(`Error estableciendo TTL [${key}]: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene el TTL restante de una clave
   */
  async getTtl(key: string): Promise<number> {
    if (!this.enabled || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(this.getKey(key));
    } catch (error) {
      this.logger.error(`Error obteniendo TTL [${key}]: ${error.message}`);
      return -1;
    }
  }

  /**
   * Limpia todo el caché (solo para desarrollo/testing)
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.flushdb();
      this.logger.warn('🗑️  Caché limpiado completamente');
    } catch (error) {
      this.logger.error(`Error limpiando caché: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  async getStats(): Promise<{
    connected: boolean;
    enabled: boolean;
    keyCount?: number;
    memory?: string;
  }> {
    const stats: any = {
      connected: this.enabled && this.client?.status === 'ready',
      enabled: this.enabled,
    };

    if (this.enabled && this.client) {
      try {
        const info = await this.client.info('stats');
        const keyspace = await this.client.info('keyspace');
        
        // Parsear información básica
        const dbMatch = keyspace.match(/db\d+:keys=(\d+)/);
        if (dbMatch) {
          stats.keyCount = parseInt(dbMatch[1], 10);
        }
      } catch (error) {
        this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      }
    }

    return stats;
  }
}

