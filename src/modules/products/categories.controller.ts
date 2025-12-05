import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiParam, ApiBody, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateCategoryDto } from './dto/product.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
import { Category } from '../../common/entities/product.entity';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ 
    summary: '📂 Obtener todas las categorías 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Retorna todas las categorías de productos del restaurante, ordenadas por sortOrder.`
  })
  @ApiOkResponse({ 
    description: '✅ Lista de categorías obtenida exitosamente'
  })
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { success: true, message: 'Categorías obtenidas exitosamente', data: categories };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: '📂 Obtener categoría por ID 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Obtiene los detalles de una categoría específica.`
  })
  @ApiParam({ name: 'id', description: 'ID de la categoría', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ 
    description: '✅ Categoría obtenida exitosamente'
  })
  @ApiNotFoundResponse({ description: '❌ Categoría no encontrada' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Category>> {
    const category = await this.categoriesService.findOne(id);
    return { success: true, message: 'Categoría obtenida exitosamente', data: category };
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ 
    summary: '➕ Crear nueva categoría 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Crea una nueva categoría de productos. Las categorías se usan para organizar el menú.`
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({ 
    description: '✅ Categoría creada exitosamente'
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
}


