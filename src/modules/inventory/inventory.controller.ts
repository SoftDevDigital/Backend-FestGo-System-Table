import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory.dto';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @AdminOrEmployee()
  @ApiOperation({ summary: 'Obtener todos los artículos de inventario' })
  @ApiQuery({ name: 'lowStock', required: false, description: 'Filtrar solo artículos con stock bajo' })
  @ApiResponse({ status: 200, description: 'Lista de artículos de inventario' })
  async findAll(@Query('lowStock') lowStock?: string) {
    const lowStockOnly = lowStock === 'true';
    return this.inventoryService.findAll(lowStockOnly);
  }

  @Get('low-stock')
  @AdminOrEmployee()
  @ApiOperation({ summary: 'Obtener artículos con stock bajo' })
  @ApiResponse({ status: 200, description: 'Lista de artículos con stock bajo' })
  async getLowStockItems() {
    return this.inventoryService.getLowStockItems();
  }

  @Get('value')
  @AdminOnly()
  @ApiOperation({ summary: 'Obtener valor total del inventario' })
  @ApiResponse({ status: 200, description: 'Valor total del inventario' })
  async getInventoryValue() {
    const totalValue = await this.inventoryService.getInventoryValue();
    return { totalValue, currency: 'USD' };
  }

  @Get('movements')
  @AdminOrEmployee()
  @ApiOperation({ summary: 'Obtener movimientos de stock' })
  @ApiQuery({ name: 'itemId', required: false, description: 'ID del artículo específico' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos de stock' })
  async getStockMovements(@Query('itemId') itemId?: string) {
    return this.inventoryService.getStockMovements(itemId);
  }

  @Get(':id')
  @AdminOrEmployee()
  @ApiOperation({ summary: 'Obtener artículo de inventario por ID' })
  @ApiParam({ name: 'id', description: 'ID del artículo' })
  @ApiResponse({ status: 200, description: 'Artículo de inventario encontrado' })
  @ApiResponse({ status: 404, description: 'Artículo no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Crear nuevo artículo de inventario' })
  @ApiResponse({ status: 201, description: 'Artículo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.create(createInventoryItemDto);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Actualizar artículo de inventario' })
  @ApiParam({ name: 'id', description: 'ID del artículo' })
  @ApiResponse({ status: 200, description: 'Artículo actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Artículo no encontrado' })
  async update(@Param('id') id: string, @Body() updateInventoryItemDto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, updateInventoryItemDto);
  }

  @Post(':id/adjust-stock')
  @AdminOnly()
  @ApiOperation({ summary: 'Ajustar stock de un artículo' })
  @ApiParam({ name: 'id', description: 'ID del artículo' })
  @ApiResponse({ status: 200, description: 'Stock ajustado exitosamente' })
  @ApiResponse({ status: 404, description: 'Artículo no encontrado' })
  async adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: { quantity: number; reason: string; notes?: string }
  ) {
    return this.inventoryService.adjustStock(
      id,
      adjustStockDto.quantity,
      adjustStockDto.reason,
      adjustStockDto.notes
    );
  }

  @Post(':id/consume')
  @AdminOrEmployee()
  @ApiOperation({ summary: 'Consumir stock de un artículo' })
  @ApiParam({ name: 'id', description: 'ID del artículo' })
  @ApiResponse({ status: 200, description: 'Stock consumido exitosamente' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 404, description: 'Artículo no encontrado' })
  async consumeStock(
    @Param('id') id: string,
    @Body() consumeStockDto: { quantity: number; reference?: string }
  ) {
    return this.inventoryService.consumeStock(
      id,
      consumeStockDto.quantity,
      consumeStockDto.reference
    );
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar artículo de inventario' })
  @ApiParam({ name: 'id', description: 'ID del artículo' })
  @ApiResponse({ status: 204, description: 'Artículo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Artículo no encontrado' })
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}