import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    InventoryController,
    SuppliersController,
    StockMovementsController,
  ],
  providers: [
    InventoryService,
    SuppliersService,
    StockMovementsService,
  ],
  exports: [
    InventoryService,
    SuppliersService,
    StockMovementsService,
  ],
})
export class InventoryModule {}