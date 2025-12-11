import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TablesModule } from './modules/tables/tables.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BillsModule } from './modules/bills/bills.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PrinterModule } from './modules/printer/printer.module';
import { S3Module } from './modules/s3/s3.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { DocumentationModule } from './modules/documentation/documentation.module';
import { FinancialModule } from './modules/financial/financial.module';
import { CacheModule } from './cache/cache.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import appConfig from './config/app.config';
import awsConfig from './config/aws.config';
import databaseConfig from './config/database.config';
import cacheConfig from './config/cache.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, awsConfig, databaseConfig, cacheConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    CacheModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // limit each IP to 100 requests per ttl
      },
    ]),
    DatabaseModule,
    AuthModule,
    TablesModule,
    ProductsModule,
    OrdersModule,
    BillsModule,
    AdminModule,
    ReportsModule,
    PrinterModule,
    S3Module,
    InventoryModule,
    ReservationsModule,
    FinancialModule,
    DocumentationModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}