import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ 
    summary: '🥘 Obtener todos los productos (menú público) 🔓', 
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Retorna el menú completo del restaurante con todos los productos disponibles. Incluye información de precios, descripciones, alérgenos, información nutricional, etc.` 
  })
  @ApiQuery({ 
    name: 'category', 
    required: false, 
    description: 'Filtrar por categoría',
    example: 'pizzas'
  })
  @ApiQuery({ 
    name: 'available', 
    required: false, 
    description: 'Filtrar solo productos disponibles',
    example: true,
    type: Boolean
  })
  @ApiOkResponse({ 
    description: '✅ Menú obtenido exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Pizza Margherita',
            description: 'Pizza clásica con tomate, mozzarella y albahaca',
            price: 15.99,
            categoryId: 'cat-123',
            isAvailable: true,
            preparationTime: 15,
            allergens: ['gluten', 'lactose'],
            nutritionalInfo: {
              calories: 250,
              protein: 12,
              carbs: 30,
              fat: 8
            }
          }
        ]
      }
    }
  })
  findAll() {
    return this.productsService.findAll();
  }
}