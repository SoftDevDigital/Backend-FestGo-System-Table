import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({ 
    summary: '📦 Obtener todos los artículos de inventario', 
    description: 'Retorna una lista completa de todos los artículos del inventario. Requiere autenticación como administrador o empleado. Incluye información de stock, costos, proveedores, ubicación, etc.' 
  })
  @ApiQuery({ 
    name: 'lowStock', 
    required: false, 
    description: 'Filtrar solo artículos con stock bajo (true/false)',
    example: 'true',
    type: String
  })
  @ApiOkResponse({ 
    description: '✅ Lista de artículos de inventario obtenida exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            itemName: 'Tomate',
            sku: 'TOM-001',
            currentStock: 50,
            minimumStock: 20,
            maximumStock: 100,
            unit: 'kg',
            costPerUnit: 2.5,
            supplierId: 'supplier-123',
            location: 'Almacén A',
            lastStockUpdate: '2025-11-30T10:00:00.000Z'
          }
        ]
      }
    }
  })
  async findAll(@Query('lowStock') lowStock?: string) {
    const lowStockOnly = lowStock === 'true';
    return this.inventoryService.findAll(lowStockOnly);
  }

  @Get('low-stock')
  @AdminOrEmployee()
  @ApiOperation({ 
    summary: '⚠️ Obtener artículos con stock bajo', 
    description: 'Retorna solo los artículos que están por debajo del stock mínimo. Útil para alertas y reabastecimiento.' 
  })
  @ApiOkResponse({ 
    description: '✅ Lista de artículos con stock bajo',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            itemName: 'Tomate',
            currentStock: 5,
            minimumStock: 20,
            unit: 'kg',
            needsRestock: true
          }
        ]
      }
    }
  })
  async getLowStockItems() {
    return this.inventoryService.getLowStockItems();
  }

  @Get('value')
  @AdminOnly()
  @ApiOperation({ 
    summary: '💰 Obtener valor total del inventario', 
    description: 'Calcula el valor total del inventario basado en el stock actual y el costo por unidad de cada artículo. Solo para administradores.' 
  })
  @ApiOkResponse({ 
    description: '✅ Valor total del inventario calculado',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: {
          totalValue: 12500.50,
          currency: 'USD',
          itemCount: 45,
          averageValuePerItem: 277.79
        }
      }
    }
  })
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
  @ApiOperation({ 
    summary: '➕ Crear nuevo artículo de inventario', 
    description: 'Crea un nuevo artículo en el inventario. Solo administradores pueden crear artículos. Se registra automáticamente un movimiento inicial de stock.' 
  })
  @ApiBody({ type: CreateInventoryItemDto })
  @ApiCreatedResponse({ 
    description: '✅ Artículo creado exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        message: 'Recurso creado exitosamente',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          itemName: 'Tomate',
          currentStock: 50,
          minimumStock: 20,
          maximumStock: 100,
          unit: 'kg',
          costPerUnit: 2.5,
          createdAt: '2025-11-30T10:00:00.000Z'
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: '❌ Datos inválidos' })
  async create(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.create(createInventoryItemDto);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ 
    summary: '✏️ Actualizar artículo de inventario', 
    description: 'Actualiza los datos de un artículo existente. Solo administradores pueden actualizar artículos.' 
  })
  @ApiParam({ name: 'id', description: 'ID del artículo', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateInventoryItemDto })
  @ApiOkResponse({ 
    description: '✅ Artículo actualizado exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          itemName: 'Tomate',
          currentStock: 60,
          minimumStock: 25,
          updatedAt: '2025-11-30T10:00:00.000Z'
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Artículo no encontrado' })
  @ApiBadRequestResponse({ description: '❌ Datos inválidos' })
  async update(@Param('id') id: string, @Body() updateInventoryItemDto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, updateInventoryItemDto);
  }

  @Post(':id/adjust-stock')
  @AdminOnly()
  @ApiOperation({ 
    summary: '🔧 Ajustar stock de un artículo', 
    description: 'Ajusta manualmente el stock de un artículo (inventario físico, correcciones, etc.). Solo administradores. Se registra un movimiento de tipo "adjustment".' 
  })
  @ApiParam({ name: 'id', description: 'ID del artículo', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', description: 'Cantidad a ajustar (positivo para aumentar, negativo para disminuir)', example: 10 },
        reason: { type: 'string', description: 'Razón del ajuste', example: 'Inventario físico' },
        notes: { type: 'string', description: 'Notas adicionales', example: 'Ajuste por conteo físico' }
      },
      required: ['quantity', 'reason']
    }
  })
  @ApiOkResponse({ 
    description: '✅ Stock ajustado exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Stock ajustado exitosamente',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          previousStock: 50,
          newStock: 60,
          adjustment: 10
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Artículo no encontrado' })
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
  @ApiOperation({ 
    summary: '📉 Consumir stock de un artículo', 
    description: 'Registra el consumo de stock (usado en preparación de platos, ventas, etc.). Disponible para administradores y empleados. Se registra un movimiento de tipo "sale".' 
  })
  @ApiParam({ name: 'id', description: 'ID del artículo', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', description: 'Cantidad a consumir', example: 5, minimum: 0.01 },
        reference: { type: 'string', description: 'Referencia (ID de pedido, orden, etc.)', example: 'order-123' }
      },
      required: ['quantity']
    }
  })
  @ApiOkResponse({ 
    description: '✅ Stock consumido exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Stock consumido exitosamente',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          previousStock: 50,
          newStock: 45,
          consumed: 5
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: '❌ Stock insuficiente',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'Stock insuficiente. Stock disponible: 5, solicitado: 10'
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Artículo no encontrado' })
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
  @ApiOperation({ 
    summary: '🗑️ Eliminar artículo de inventario', 
    description: 'Elimina permanentemente un artículo del inventario. Solo administradores. Esta acción no se puede deshacer.' 
  })
  @ApiParam({ name: 'id', description: 'ID del artículo', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiNoContentResponse({ description: '✅ Artículo eliminado exitosamente' })
  @ApiNotFoundResponse({ description: '❌ Artículo no encontrado' })
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}