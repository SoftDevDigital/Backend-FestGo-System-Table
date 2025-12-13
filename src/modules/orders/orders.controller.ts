import { Controller, Get, Post, Patch, Delete, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth, ApiCreatedResponse, ApiParam, ApiBody, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { CreateOrderDto, AddItemsToOrderDto, CreateOrderByCodesDto } from './dto/order.dto';
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
    
    **📚 FLUJO: Toma de Orden y Facturación - Paso 1**
    
    Crea una nueva orden para una mesa. Este es el primer paso del flujo completo de toma de orden.
    
    **Flujo walk-in (cliente sin registro):**
    - El cliente se sienta en una mesa
    - El empleado crea la orden con solo tableId e items
    - No se requiere customerId (opcional)
    - El ticket mostrará "Consumidor Final" si no hay cliente
    
    **Próximos pasos del flujo:**
    1. ✅ Crear orden (este endpoint)
    2. ➡️ Agregar/actualizar items: PATCH /orders/:id/items
    3. ➡️ Ver orden: GET /orders/:id
    4. ➡️ Cerrar cuenta: POST /bills
    5. ➡️ Obtener ticket: GET /bills/:id/ticket
    
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

  @Post('by-codes')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📝 Crear orden rápida por códigos 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    **⚡ TOMA DE PEDIDO RÁPIDA**
    
    Crea una orden usando códigos de 3 letras + cantidad para agilizar la toma de pedidos.
    
    **Formato de códigos:**
    - \`CCM2\` = 2 Coca Colas Medianas (código CCM, cantidad 2)
    - \`PMG1\` = 1 Pizza Muzzarella Grande (código PMG, cantidad 1)
    - \`CCM\` = 1 Coca Cola Mediana (si no se especifica cantidad, es 1)
    
    **Ejemplo de request:**
    \`\`\`json
    {
      "tableId": "123e4567-e89b-12d3-a456-426614174000",
      "codes": ["CCM2", "PMG1"],
      "orderType": "dine_in"
    }
    \`\`\`
    
    **Cálculo automático:**
    - Si CCM tiene precio $10: CCM2 = 2 × $10 = $20
    - Si PMG tiene precio $20: PMG1 = 1 × $20 = $20
    - Subtotal: $40
    - Total: $40 (sin impuestos)
    
    El sistema agrupa automáticamente productos duplicados (ej: ["CCM2", "CCM1"] = CCM3).`
  })
  @ApiBody({ type: CreateOrderByCodesDto })
  @ApiCreatedResponse({ 
    description: '✅ Orden creada exitosamente'
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación, código inválido o producto no disponible' })
  @ApiNotFoundResponse({ description: '❌ Producto con código especificado no encontrado' })
  async createByCodes(@Body() createOrderByCodesDto: CreateOrderByCodesDto): Promise<SuccessResponse<Order>> {
    try {
      const order = await this.ordersService.createByCodes(createOrderByCodesDto);
      return { success: true, message: 'Orden creada exitosamente por códigos', data: order };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la orden. Verifica que todos los códigos sean correctos.');
    }
  }

  @Patch(':id/items')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '➕ Agregar/Actualizar items en una orden 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    **📚 FLUJO: Toma de Orden y Facturación - Paso 2**
    
    Agrega o actualiza items en una orden existente. 
    
    **Comportamiento:**
    - Si el producto ya existe en la orden → actualiza la cantidad a la nueva cantidad
    - Si el producto no existe → agrega como nuevo item
    - El total se recalcula automáticamente
    
    **Ejemplo:**
    - Orden tiene: Pizza x2
    - Envías: Pizza x4
    - Resultado: Pizza x4 (actualiza, no suma)
    
    **Próximos pasos del flujo:**
    1. ✅ Crear orden: POST /orders
    2. ✅ Agregar/actualizar items (este endpoint)
    3. ➡️ Ver orden: GET /orders/:id
    4. ➡️ Cerrar cuenta: POST /bills
    5. ➡️ Obtener ticket: GET /bills/:id/ticket`
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
    
    **📚 FLUJO: Toma de Orden y Facturación - Opcional**
    
    Quita un item de una orden existente. Útil si el cliente cambia de opinión o hay un error.
    El total se recalcula automáticamente.
    
    **Próximos pasos del flujo:**
    1. ✅ Crear orden: POST /orders
    2. ✅ Agregar/actualizar items: PATCH /orders/:id/items
    3. ✅ Quitar item (este endpoint - opcional)
    4. ➡️ Ver orden: GET /orders/:id
    5. ➡️ Cerrar cuenta: POST /bills
    6. ➡️ Obtener ticket: GET /bills/:id/ticket`
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
    
    **📚 FLUJO: Toma de Orden y Facturación - Paso 3**
    
    Obtiene los detalles completos de una orden específica. Útil para verificar el total antes de cerrar la cuenta.
    
    **Próximos pasos del flujo:**
    1. ✅ Crear orden: POST /orders
    2. ✅ Agregar/actualizar items: PATCH /orders/:id/items
    3. ✅ Ver orden (este endpoint)
    4. ➡️ Cerrar cuenta: POST /bills
    5. ➡️ Obtener ticket: GET /bills/:id/ticket`
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
