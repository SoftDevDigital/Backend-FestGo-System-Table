import { Controller, Get, Post, Put, Delete, Param, Query, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiParam, ApiBody, ApiCreatedResponse, ApiBadRequestResponse, ApiExtraModels, ApiNoContentResponse, getSchemaPath } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/product.dto';
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
    
    Retorna el menú completo del restaurante con todos los productos disponibles. Incluye información de precios, descripciones, alérgenos, información nutricional, etc.
    
    **Filtros disponibles:**
    - \`category\`: Puede ser el nombre de la categoría (ej: "pizzas") o el UUID de la categoría. La búsqueda por nombre es case-insensitive.
    - \`available\`: Si es "true" o no se especifica, solo retorna productos disponibles. Si es "false", retorna todos los productos.` 
  })
  @ApiQuery({ 
    name: 'category', 
    required: false, 
    description: 'Filtrar por categoría (nombre o UUID). Ejemplos: "pizzas" o "42088847-c2a6-401f-854c-1e1a336626c5"',
    example: 'pizzas',
    type: String
  })
  @ApiQuery({ 
    name: 'available', 
    required: false, 
    description: 'Filtrar solo productos disponibles. Valores: "true" (por defecto) o "false"',
    example: 'true',
    type: String,
    enum: ['true', 'false']
  })
  @ApiOkResponse({ 
    description: '✅ Lista de productos obtenida exitosamente',
    type: [ProductResponseDto]
  })
  async findAll(
    @Query('category') category?: string,
    @Query('available') available?: string
  ) {
    try {
      // Convertir string a boolean: "true" -> true, "false" -> false, undefined -> true (por defecto)
      const availableOnly = available === undefined || available === 'true' || available === '';
      return await this.productsService.findAll(category, availableOnly);
    } catch (error) {
      throw new BadRequestException(`Error al obtener productos: ${error.message}`);
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: '🥘 Obtener producto por ID 🔓', 
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Obtiene los detalles completos de un producto específico del menú.` 
  })
  @ApiParam({ name: 'id', description: 'ID del producto (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ 
    description: '✅ Producto obtenido exitosamente',
    type: ProductResponseDto
  })
  @ApiBadRequestResponse({ description: '❌ Producto no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiExtraModels(SuccessResponse, ProductResponseDto)
  @ApiOperation({ 
    summary: '➕ Crear nuevo producto 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Crea un nuevo producto en el menú del restaurante. El código debe ser exactamente 3 letras mayúsculas (ej: "CCG").`
  })
  @ApiBody({ type: CreateProductDto })
  @ApiCreatedResponse({ 
    description: '✅ Producto creado exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(ProductResponseDto),
            },
          },
        },
      ],
    },
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

  @Put(':id')
  @AdminOnly()
  @ApiExtraModels(SuccessResponse, ProductResponseDto)
  @ApiOperation({ 
    summary: '✏️ Actualizar producto 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Actualiza un producto existente. Puedes actualizar cualquier campo del producto. Los campos no incluidos en el body mantendrán sus valores actuales.`
  })
  @ApiParam({ name: 'id', description: 'ID del producto a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({ 
    description: '✅ Producto actualizado exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(ProductResponseDto),
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación o producto no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto
  ): Promise<SuccessResponse<Product>> {
    try {
      const product = await this.productsService.update(id, updateProductDto);
      return { success: true, message: 'Producto actualizado exitosamente', data: product };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al actualizar el producto: ${error.message}`);
    }
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ 
    summary: '🗑️ Eliminar producto 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Elimina permanentemente un producto del menú. Esta acción no se puede deshacer.`
  })
  @ApiParam({ name: 'id', description: 'ID del producto a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiNoContentResponse({ description: '✅ Producto eliminado exitosamente' })
  @ApiBadRequestResponse({ description: '❌ Producto no encontrado' })
  async remove(@Param('id') id: string): Promise<SuccessResponse<null>> {
    try {
      await this.productsService.delete(id);
      return { success: true, message: 'Producto eliminado exitosamente', data: null };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al eliminar el producto: ${error.message}`);
    }
  }
}