import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiParam, ApiBody, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiExtraModels, ApiNoContentResponse, getSchemaPath } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto/product.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
import { Category } from '../../common/entities/product.entity';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiExtraModels(SuccessResponse, CategoryResponseDto)
  @ApiOperation({ 
    summary: '📂 Obtener todas las categorías 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Retorna todas las categorías de productos del restaurante, ordenadas por sortOrder.`
  })
  @ApiOkResponse({ 
    description: '✅ Lista de categorías obtenida exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(CategoryResponseDto) },
            },
          },
        },
      ],
    },
  })
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { success: true, message: 'Categorías obtenidas exitosamente', data: categories };
  }

  @Get(':id')
  @Public()
  @ApiExtraModels(SuccessResponse, CategoryResponseDto)
  @ApiOperation({ 
    summary: '📂 Obtener categoría por ID 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Obtiene los detalles de una categoría específica.`
  })
  @ApiParam({ name: 'id', description: 'ID de la categoría (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ 
    description: '✅ Categoría obtenida exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(CategoryResponseDto),
            },
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: '❌ Categoría no encontrada' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Category>> {
    const category = await this.categoriesService.findOne(id);
    return { success: true, message: 'Categoría obtenida exitosamente', data: category };
  }

  @Post()
  @AdminOnly()
  @ApiExtraModels(SuccessResponse, CategoryResponseDto)
  @ApiOperation({ 
    summary: '➕ Crear nueva categoría 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Crea una nueva categoría de productos. Las categorías se usan para organizar el menú.`
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({ 
    description: '✅ Categoría creada exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(CategoryResponseDto),
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación o categoría padre no encontrada' })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<SuccessResponse<Category>> {
    try {
      const category = await this.categoriesService.create(createCategoryDto);
      return { success: true, message: 'Categoría creada exitosamente', data: category };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la categoría. Verifica que todos los datos sean correctos.');
    }
  }

  @Put(':id')
  @AdminOnly()
  @ApiExtraModels(SuccessResponse, CategoryResponseDto)
  @ApiOperation({ 
    summary: '✏️ Actualizar categoría 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Actualiza una categoría existente. Puedes actualizar cualquier campo de la categoría. Los campos no incluidos en el body mantendrán sus valores actuales.`
  })
  @ApiParam({ name: 'id', description: 'ID de la categoría a actualizar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({ 
    description: '✅ Categoría actualizada exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(CategoryResponseDto),
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación o categoría no encontrada' })
  @ApiNotFoundResponse({ description: '❌ Categoría no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto
  ): Promise<SuccessResponse<Category>> {
    try {
      const category = await this.categoriesService.update(id, updateCategoryDto);
      return { success: true, message: 'Categoría actualizada exitosamente', data: category };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al actualizar la categoría: ${error.message}`);
    }
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ 
    summary: '🗑️ Eliminar categoría 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Elimina permanentemente una categoría del sistema. **IMPORTANTE:** No se puede eliminar una categoría si hay productos asociados a ella. Primero debes eliminar o cambiar la categoría de los productos que la usan.`
  })
  @ApiParam({ name: 'id', description: 'ID de la categoría a eliminar (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiNoContentResponse({ description: '✅ Categoría eliminada exitosamente' })
  @ApiBadRequestResponse({ description: '❌ No se puede eliminar: hay productos asociados a esta categoría' })
  @ApiNotFoundResponse({ description: '❌ Categoría no encontrada' })
  async remove(@Param('id') id: string): Promise<SuccessResponse<null>> {
    try {
      await this.categoriesService.delete(id);
      return { success: true, message: 'Categoría eliminada exitosamente', data: null };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al eliminar la categoría: ${error.message}`);
    }
  }
}




