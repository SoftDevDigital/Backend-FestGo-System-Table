import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductsModule } from '../products/products.module';
import { TablesModule } from '../tables/tables.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [DatabaseModule, ProductsModule, TablesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}