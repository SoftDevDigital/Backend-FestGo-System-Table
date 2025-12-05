import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, CategoriesService],
  exports: [ProductsService, CategoriesService], // Exportar para que OrdersModule pueda usarlo
})
export class ProductsModule {}