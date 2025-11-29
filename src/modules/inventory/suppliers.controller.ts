import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/inventory.dto';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los proveedores' })
  @ApiQuery({ name: 'active', required: false, description: 'Filtrar solo proveedores activos' })
  @ApiResponse({ status: 200, description: 'Lista de proveedores' })
  async findAll(@Query('active') active?: string) {
    if (active === 'true') {
      return this.suppliersService.findActive();
    }
    return this.suppliersService.findAll();
  }

  @Get('top-by-volume')
  @ApiOperation({ summary: 'Obtener top proveedores por volumen' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número de proveedores a retornar' })
  @ApiResponse({ status: 200, description: 'Top proveedores por volumen' })
  async getTopSuppliersByVolume(@Query('limit') limit?: string) {
    const limitNum = limit ? Number.parseInt(limit, 10) : 10;
    return this.suppliersService.getTopSuppliersByVolume(limitNum);
  }

  @Get('by-payment-terms')
  @ApiOperation({ summary: 'Agrupar proveedores por términos de pago' })
  @ApiResponse({ status: 200, description: 'Proveedores agrupados por términos de pago' })
  async getSuppliersByPaymentTerms() {
    return this.suppliersService.getSuppliersByPaymentTerms();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo proveedor' })
  @ApiResponse({ status: 201, description: 'Proveedor creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Post(':id/update-order-stats')
  @ApiOperation({ summary: 'Actualizar estadísticas de órdenes del proveedor' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Estadísticas actualizadas' })
  async updateOrderStats(
    @Param('id') id: string,
    @Body() updateStatsDto: { orderAmount: number }
  ) {
    return this.suppliersService.updateOrderStats(id, updateStatsDto.orderAmount);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar proveedor' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 204, description: 'Proveedor eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}