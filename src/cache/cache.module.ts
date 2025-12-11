import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { CacheInvalidateInterceptor } from './interceptors/cache-invalidate.interceptor';
import cacheConfig from '../config/cache.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(cacheConfig)],
  providers: [CacheService, CacheInterceptor, CacheInvalidateInterceptor],
  exports: [CacheService, CacheInterceptor, CacheInvalidateInterceptor],
})
export class CacheModule {}




