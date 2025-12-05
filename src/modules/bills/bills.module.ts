import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { OrdersModule } from '../orders/orders.module';
import { FinancialModule } from '../financial/financial.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [DatabaseModule, OrdersModule, FinancialModule, ProductsModule],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}