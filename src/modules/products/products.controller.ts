import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener todos los productos (menú público)' })
  findAll() {
    return this.productsService.findAll();
  }
}