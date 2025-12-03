import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/inventory.dto';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { EntityNotFoundException } from '../../common/exceptions/business.exception';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
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
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener top proveedores por volumen' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número de proveedores a retornar' })
  @ApiResponse({ status: 200, description: 'Top proveedores por volumen' })
  async getTopSuppliersByVolume(@Query('limit') limit?: string) {
    const limitNum = limit ? Number.parseInt(limit, 10) : 10;
    return this.suppliersService.getTopSuppliersByVolume(limitNum);
  }

  @Get('by-payment-terms')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Agrupar proveedores por términos de pago' })
  @ApiResponse({ status: 200, description: 'Proveedores agrupados por términos de pago' })
  async getSuppliersByPaymentTerms() {
    return this.suppliersService.getSuppliersByPaymentTerms();
  }

  @Get(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear nuevo proveedor' })
  @ApiResponse({ status: 201, description: 'Proveedor creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  @ApiParam({ name: 'id', description: 'ID del proveedor', example: 'fc26390b-8b18-44dd-88b1-6ce437fa07da' })
  @ApiBody({ type: UpdateSupplierDto })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    try {
      return await this.suppliersService.update(id, updateSupplierDto);
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/update-order-stats')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar estadísticas de órdenes del proveedor' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderAmount: {
          type: 'number',
          description: 'Monto de la orden',
          example: 1500.50,
          minimum: 0
        }
      },
      required: ['orderAmount']
    }
  })
  @ApiResponse({ status: 200, description: 'Estadísticas actualizadas' })
  @ApiResponse({ status: 400, description: 'Datos inválidos - orderAmount es requerido y debe ser un número' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async updateOrderStats(
    @Param('id') id: string,
    @Body() updateStatsDto: { orderAmount?: number }
  ) {
    try {
      // Validar que el body exista
      if (!updateStatsDto || Object.keys(updateStatsDto).length === 0) {
        throw new BadRequestException('El cuerpo de la solicitud está vacío. Debes proporcionar el campo "orderAmount" con un valor numérico. Ejemplo: { "orderAmount": 1500.50 }');
      }

      // Validar que el body tenga orderAmount
      if (updateStatsDto.orderAmount === undefined || updateStatsDto.orderAmount === null) {
        throw new BadRequestException('El campo "orderAmount" es requerido en el cuerpo de la solicitud y no puede estar vacío. Ejemplo de formato correcto: { "orderAmount": 1500.50 }');
      }

      // Validar que sea un número
      const orderAmount = Number(updateStatsDto.orderAmount);
      if (isNaN(orderAmount) || !isFinite(orderAmount)) {
        throw new BadRequestException(`El valor de "orderAmount" no es un número válido. Se recibió: "${updateStatsDto.orderAmount}". Debe ser un número (ejemplo: 1500.50)`);
      }

      if (orderAmount < 0) {
        throw new BadRequestException(`El valor de "orderAmount" no puede ser negativo. Se recibió: ${orderAmount}. Debe ser un número mayor o igual a 0`);
      }

      return this.suppliersService.updateOrderStats(id, orderAmount);
    } catch (error) {
      // Re-lanzar excepciones HTTP y de negocio tal cual
      if (error instanceof BadRequestException || error instanceof EntityNotFoundException) {
        throw error;
      }
      // Si es un error del servicio con mensaje descriptivo, convertirlo a BadRequestException
      if (error instanceof Error && error.message) {
        // Si el mensaje indica que el proveedor no existe, lanzar EntityNotFoundException
        if (error.message.includes('no encontrado') || error.message.includes('no existe')) {
          throw new EntityNotFoundException('Proveedor', id);
        }
        throw new BadRequestException(error.message);
      }
      // Manejar errores que no son instancias de Error
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : 'Error desconocido. Por favor, verifica los datos enviados e intenta nuevamente';
      throw new BadRequestException(`Error al procesar la solicitud de actualización de estadísticas: ${errorMessage}`);
    }
  }

  @Delete(':id')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar proveedor' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 204, description: 'Proveedor eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}