import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('stock-movements')
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los movimientos de stock' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos de stock' })
  async findAll() {
    return this.stockMovementsService.findAll();
  }

  @Get('by-item/:itemId')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener movimientos por artículo de inventario' })
  @ApiParam({ name: 'itemId', description: 'ID del artículo de inventario' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos del artículo' })
  async findByInventoryItem(@Param('itemId') itemId: string) {
    return this.stockMovementsService.findByInventoryItem(itemId);
  }

  @Get('by-type/:type')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener movimientos por tipo' })
  @ApiParam({ name: 'type', description: 'Tipo de movimiento' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos del tipo especificado' })
  async findByType(@Param('type') type: string) {
    return this.stockMovementsService.findByType(type);
  }

  @Get('by-date-range')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener movimientos por rango de fechas' })
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
  @ApiOperation({ summary: 'Obtener resumen de movimientos' })
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
  @ApiOperation({ summary: 'Obtener historial de movimientos de un artículo' })
  @ApiParam({ name: 'itemId', description: 'ID del artículo de inventario' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número máximo de movimientos a retornar' })
  @ApiResponse({ status: 200, description: 'Historial de movimientos del artículo' })
  async getInventoryItemHistory(
    @Param('itemId') itemId: string,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? Number.parseInt(limit, 10) : 50;
    return this.stockMovementsService.getInventoryItemHistory(itemId, limitNum);
  }

  @Get('top-moving-items')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener artículos con más movimiento' })
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