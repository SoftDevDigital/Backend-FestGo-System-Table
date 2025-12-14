import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { OrdersModule } from '../orders/orders.module';
import { FinancialModule } from '../financial/financial.module';
import { ProductsModule } from '../products/products.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [DatabaseModule, OrdersModule, FinancialModule, ProductsModule, TablesModule],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}