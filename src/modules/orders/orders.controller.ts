import { Controller, Get, Post, Patch, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth, ApiCreatedResponse, ApiParam, ApiBody, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { CreateOrderDto, AddItemsToOrderDto } from './dto/order.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
import { Order } from '../../common/entities/order.entity';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📝 Crear nueva orden 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Crea una nueva orden para una mesa. El empleado puede tomar la orden directamente sin necesidad de que el cliente esté registrado.
    
    **Flujo walk-in (cliente sin registro):**
    - El cliente se sienta en una mesa
    - El empleado crea la orden con solo tableId e items
    - No se requiere customerId (opcional)
    - El ticket mostrará "Consumidor Final" si no hay cliente
    
    El empleado puede ir agregando items después con el endpoint PATCH /orders/:id/items.`
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({ 
    description: '✅ Orden creada exitosamente'
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación o producto no disponible' })
  async create(@Body() createOrderDto: CreateOrderDto): Promise<SuccessResponse<Order>> {
    try {
      const order = await this.ordersService.create(createOrderDto);
      return { success: true, message: 'Orden creada exitosamente', data: order };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la orden. Verifica que todos los datos sean correctos.');
    }
  }

  @Patch(':id/items')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '➕ Agregar items a una orden 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Agrega items adicionales a una orden existente. El total se recalcula automáticamente.`
  })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  @ApiBody({ type: AddItemsToOrderDto })
  @ApiOkResponse({ 
    description: '✅ Items agregados exitosamente'
  })
  @ApiBadRequestResponse({ description: '❌ Orden completada/cancelada o error de validación' })
  @ApiNotFoundResponse({ description: '❌ Orden no encontrada' })
  async addItems(
    @Param('id') id: string,
    @Body() addItemsDto: AddItemsToOrderDto
  ): Promise<SuccessResponse<Order>> {
    try {
      const order = await this.ordersService.addItems(id, addItemsDto.items);
      return { success: true, message: 'Items agregados exitosamente', data: order };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al agregar items a la orden.');
    }
  }

  @Delete(':id/items/:itemId')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '➖ Quitar item de una orden 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Quita un item de una orden existente. El total se recalcula automáticamente.`
  })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  @ApiParam({ name: 'itemId', description: 'ID del item a quitar' })
  @ApiOkResponse({ 
    description: '✅ Item removido exitosamente'
  })
  @ApiBadRequestResponse({ description: '❌ Orden completada/cancelada' })
  @ApiNotFoundResponse({ description: '❌ Orden o item no encontrado' })
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string
  ): Promise<SuccessResponse<Order>> {
    try {
      const order = await this.ordersService.removeItem(id, itemId);
      return { success: true, message: 'Item removido exitosamente', data: order };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al quitar el item de la orden.');
    }
  }

  @Get(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📋 Obtener orden por ID 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene los detalles completos de una orden específica.`
  })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  @ApiOkResponse({ 
    description: '✅ Orden obtenida exitosamente'
  })
  @ApiNotFoundResponse({ description: '❌ Orden no encontrada' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Order>> {
    const order = await this.ordersService.findOne(id);
    return { success: true, message: 'Orden obtenida exitosamente', data: order };
  }

  @Get()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📝 Obtener todos los pedidos 🔐', 
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Retorna una lista de todos los pedidos del restaurante. Incluye información de estado, mesa, productos, total, etc.` 
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filtrar por estado del pedido',
    example: 'pending',
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled', 'completed']
  })
  @ApiQuery({ 
    name: 'tableId', 
    required: false, 
    description: 'Filtrar por mesa',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({ 
    name: 'date', 
    required: false, 
    description: 'Filtrar por fecha (YYYY-MM-DD)',
    example: '2025-11-30'
  })
  @ApiOkResponse({ 
    description: '✅ Lista de pedidos obtenida exitosamente'
  })
  async findAll(@Query('status') status?: string, @Query('tableId') tableId?: string, @Query('date') date?: string) {
    const orders = await this.ordersService.findAll();
    return { success: true, message: 'Pedidos obtenidos exitosamente', data: orders };
  }
}
