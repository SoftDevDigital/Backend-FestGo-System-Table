import { Controller, Get, Query, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiUnauthorizedResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('stock-movements')
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📊 Obtener todos los movimientos de stock 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene todos los movimientos de stock del inventario.`
  })
  @ApiResponse({ status: 200, description: '✅ Lista de movimientos de stock obtenida exitosamente' })
  @ApiUnauthorizedResponse({ description: '❌ No autenticado - Token JWT requerido' })
  async findAll() {
    return this.stockMovementsService.findAll();
  }

  @Get('by-item/:itemId')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📦 Obtener movimientos por artículo de inventario 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene todos los movimientos de stock de un artículo específico.
    
    **Parámetros:**
    - itemId: Debe ser un UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)`
  })
  @ApiParam({ 
    name: 'itemId', 
    description: 'ID del artículo de inventario (UUID válido)',
    example: 'fcee5510-4fb4-4d0c-aa25-13e5cf2b140b',
    type: String
  })
  @ApiResponse({ status: 200, description: '✅ Lista de movimientos del artículo obtenida exitosamente' })
  @ApiBadRequestResponse({ 
    description: '❌ ID de artículo inválido - Debe ser un UUID válido',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'El ID del artículo debe ser un UUID válido',
        errorCode: 'VALIDATION_ERROR'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ No autenticado - Token JWT requerido' })
  async findByInventoryItem(@Param('itemId') itemId: string) {
    // Validar que itemId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      throw new BadRequestException('El ID del artículo debe ser un UUID válido');
    }
    
    try {
      return await this.stockMovementsService.findByInventoryItem(itemId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener movimientos del artículo. Verifica que el ID sea válido.');
    }
  }

  @Get('by-type/:type')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🏷️ Obtener movimientos por tipo 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene movimientos de stock filtrados por tipo (sale, purchase, adjustment, etc.).`
  })
  @ApiParam({ name: 'type', description: 'Tipo de movimiento' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos del tipo especificado' })
  async findByType(@Param('type') type: string) {
    return this.stockMovementsService.findByType(type);
  }

  @Get('by-date-range')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📅 Obtener movimientos por rango de fechas 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene movimientos de stock dentro de un rango de fechas específico.`
  })
  @ApiQuery({ name: 'startDate', description: 'Fecha de inicio (ISO string)' })
  @ApiQuery({ name: 'endDate', description: 'Fecha de fin (ISO string)' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos en el rango de fechas' })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.stockMovementsService.findByDateRange(startDate, endDate);
  }

  @Get('summary')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📊 Obtener resumen de movimientos 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene un resumen estadístico de los movimientos de stock en un período.`
  })
  @ApiQuery({ name: 'startDate', description: 'Fecha de inicio (ISO string)' })
  @ApiQuery({ name: 'endDate', description: 'Fecha de fin (ISO string)' })
  @ApiResponse({ status: 200, description: 'Resumen de movimientos' })
  async getMovementsSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.stockMovementsService.getMovementsSummary(startDate, endDate);
  }

  @Get('history/:itemId')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📜 Obtener historial de movimientos de un artículo 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene el historial completo de movimientos de un artículo específico, ordenado por fecha descendente.
    
    **Parámetros:**
    - itemId: Debe ser un UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    - limit: Número máximo de movimientos a retornar (1-100, default: 50)`
  })
  @ApiParam({ 
    name: 'itemId', 
    description: 'ID del artículo de inventario (UUID válido)',
    example: 'fcee5510-4fb4-4d0c-aa25-13e5cf2b140b',
    type: String
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Número máximo de movimientos a retornar (1-100, default: 50)', 
    type: Number, 
    example: 50
  })
  @ApiResponse({ status: 200, description: '✅ Historial de movimientos del artículo obtenido exitosamente' })
  @ApiBadRequestResponse({ 
    description: '❌ Error de validación - ID inválido o limit fuera de rango',
    schema: {
      examples: {
        invalidId: {
          summary: 'ID inválido',
          value: {
            success: false,
            statusCode: 400,
            message: 'El ID del artículo debe ser un UUID válido',
            errorCode: 'VALIDATION_ERROR'
          }
        },
        invalidLimit: {
          summary: 'Limit inválido',
          value: {
            success: false,
            statusCode: 400,
            message: 'El parámetro limit debe ser un número entre 1 y 100',
            errorCode: 'VALIDATION_ERROR'
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ No autenticado - Token JWT requerido' })
  async getInventoryItemHistory(
    @Param('itemId') itemId: string,
    @Query('limit') limit?: string
  ) {
    // Validar que itemId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      throw new BadRequestException('El ID del artículo debe ser un UUID válido');
    }
    
    // Validar y parsear limit
    let limitNum = 50; // Default
    if (limit) {
      limitNum = Number.parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('El parámetro limit debe ser un número entre 1 y 100');
      }
    }
    
    try {
      return await this.stockMovementsService.getInventoryItemHistory(itemId, limitNum);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener historial del artículo. Verifica que el ID sea válido.');
    }
  }

  @Get('top-moving-items')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🔥 Obtener artículos con más movimiento 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene los artículos con mayor cantidad de movimientos en un período.`
  })
  @ApiQuery({ name: 'days', required: false, description: 'Número de días a considerar' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número de artículos a retornar' })
  @ApiResponse({ status: 200, description: 'Artículos con más movimiento' })
  async getTopMovingItems(
    @Query('days') days?: string,
    @Query('limit') limit?: string
  ) {
    const daysNum = days ? Number.parseInt(days, 10) : 30;
    const limitNum = limit ? Number.parseInt(limit, 10) : 10;
    return this.stockMovementsService.getTopMovingItems(daysNum, limitNum);
  }
}