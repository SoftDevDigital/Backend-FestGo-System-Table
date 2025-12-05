import { Controller, Get, Post, Param, Query, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiParam, ApiBody, ApiCreatedResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { CreateProductDto } from './dto/product.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
import { Product } from '../../common/entities/product.entity';

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
  findAll(
    @Query('category') category?: string,
    @Query('available') available?: string
  ) {
    const availableOnly = available !== 'false'; // Por defecto true
    return this.productsService.findAll(category, availableOnly);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: '🥘 Obtener producto por ID 🔓', 
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Obtiene los detalles completos de un producto específico del menú.` 
  })
  @ApiParam({ name: 'id', description: 'ID del producto', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ 
    description: '✅ Producto obtenido exitosamente'
  })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ 
    summary: '➕ Crear nuevo producto 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Crea un nuevo producto en el menú del restaurante.`
  })
  @ApiBody({ type: CreateProductDto })
  @ApiCreatedResponse({ 
    description: '✅ Producto creado exitosamente'
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación o categoría no encontrada' })
  async create(@Body() createProductDto: CreateProductDto): Promise<SuccessResponse<Product>> {
    try {
      const product = await this.productsService.create(createProductDto);
      return { success: true, message: 'Producto creado exitosamente', data: product };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el producto. Verifica que todos los datos sean correctos.');
    }
  }
}