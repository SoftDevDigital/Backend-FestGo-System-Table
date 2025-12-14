import { Controller, Get, Post, Body, Query, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth, ApiCreatedResponse, ApiBody, ApiBadRequestResponse, ApiNotFoundResponse, ApiParam, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { CreateBillDto, CreateDirectSaleDto, BillResponseDto } from './dto/bill.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
import { Bill } from '../../common/entities/bill.entity';

@ApiTags('bills')
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post('direct-sale')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiExtraModels(SuccessResponse, BillResponseDto)
  @ApiOperation({ 
    summary: '💰 Venta directa (sin orden ni mesa) 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    **📚 FLUJO: Venta Directa / Takeaway - Paso Único**
    
    Crea una factura directamente sin necesidad de orden ni mesa. Ideal para ventas rápidas como:
    - Cliente pide pizza y agua para llevar
    - Venta rápida sin sentarse en mesa
    - Takeaway/to-go
    
    **Proceso automático:**
    1. ✅ Valida productos y disponibilidad
    2. ✅ Calcula totales (subtotal, descuentos) - **SIN IMPUESTOS**
    3. ✅ Valida el monto pagado
    4. ✅ Crea la factura con todos los items
    5. ✅ Registra movimiento financiero de VENTA (para reportes)
    6. ✅ Genera ticket completo
    
    **No requiere:**
    - ❌ Orden previa
    - ❌ Mesa asignada
    - ❌ Cliente registrado (opcional)
    
    **Todo queda registrado:**
    - ✅ Factura con items completos
    - ✅ Movimiento financiero SALE
    - ✅ Ticket disponible para imprimir
    
    **Ejemplo de uso:**
    Cliente: "Quiero una pizza y 2 botellas de agua"
    Empleado: Crea venta directa con esos productos → Factura → Ticket → Listo`
  })
  @ApiBody({ type: CreateDirectSaleDto })
  @ApiCreatedResponse({ 
    description: '✅ Venta directa creada exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(BillResponseDto),
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación, producto no disponible, o monto insuficiente' })
  async createDirectSale(@Body() createDirectSaleDto: CreateDirectSaleDto): Promise<SuccessResponse<Bill>> {
    try {
      const bill = await this.billsService.createDirectSale(
        createDirectSaleDto.items,
        createDirectSaleDto.paymentMethod,
        createDirectSaleDto.paidAmount,
        createDirectSaleDto.cashierId,
        createDirectSaleDto.customerId,
        createDirectSaleDto.discountAmount,
        createDirectSaleDto.notes,
      );
      return { success: true, message: 'Venta directa creada exitosamente', data: bill };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la venta directa. Verifica que todos los datos sean correctos.');
    }
  }

  @Post()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiExtraModels(SuccessResponse, BillResponseDto)
  @ApiOperation({ 
    summary: '🧾 Cerrar cuenta y crear factura (desde orden) 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    **📚 FLUJO: Toma de Orden y Facturación - Paso 4 (FINAL)**
    
    Crea una factura a partir de una orden y procesa el pago. Este es el paso final del flujo de orden.
    Funciona tanto para clientes registrados como para clientes walk-in (sin registro).
    
    **Proceso automático:**
    1. ✅ Se obtiene la orden
    2. ✅ Se calculan los totales (subtotal, descuentos, propina) - **SIN IMPUESTOS**
    3. ✅ Se valida el monto pagado
    4. ✅ Se actualiza el estado de la orden a COMPLETED (para auditoría)
    5. ✅ Se crea la factura (con todos los items guardados permanentemente, incluyendo orderType)
    6. ✅ Se registra movimiento financiero de VENTA (para reportes)
    7. ✅ **La mesa se libera automáticamente** (solo si orderType === 'dine_in')
    8. ✅ Se ELIMINA la orden de la tabla Orders (ya cumplió su función)
    
    **Nota importante:** La liberación de mesa es automática y solo ocurre para órdenes tipo 'dine_in'. 
    Las órdenes 'takeaway' o 'delivery' no liberan mesas porque nunca las ocuparon.
    
    **Nota:** Si la orden no tiene customerId (cliente walk-in), el ticket mostrará "Consumidor Final".
    
    **Próximos pasos del flujo:**
    1. ✅ Crear orden: POST /orders
    2. ✅ Agregar/actualizar items: PATCH /orders/:id/items
    3. ✅ Ver orden: GET /orders/:id
    4. ✅ Cerrar cuenta (este endpoint)
    5. ➡️ Obtener ticket: GET /bills/:id/ticket`
  })
  @ApiBody({ type: CreateBillDto })
  @ApiCreatedResponse({ 
    description: '✅ Factura creada exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(BillResponseDto),
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación, orden cancelada, o monto insuficiente' })
  @ApiNotFoundResponse({ description: '❌ Orden no encontrada' })
  async create(@Body() createBillDto: CreateBillDto): Promise<SuccessResponse<Bill>> {
    try {
      const bill = await this.billsService.createBillFromOrder(
        createBillDto.orderId,
        createBillDto.paymentMethod,
        createBillDto.paidAmount,
        createBillDto.cashierId,
        createBillDto.discountAmount,
        createBillDto.tipAmount,
      );
      return { success: true, message: 'Factura creada exitosamente', data: bill };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la factura. Verifica que todos los datos sean correctos.');
    }
  }

  @Get()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiExtraModels(SuccessResponse, BillResponseDto)
  @ApiOperation({ 
    summary: '🧾 Obtener todas las facturas 🔐', 
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Retorna una lista de todas las facturas generadas. Incluye información de pagos, métodos de pago, totales, etc.
    
    **Nota:** Todas las facturas tienen taxAmount = 0 y taxRate = 0 (sin impuestos).` 
  })
  @ApiQuery({ 
    name: 'date', 
    required: false, 
    description: 'Filtrar por fecha (YYYY-MM-DD)',
    example: '2025-11-30'
  })
  @ApiQuery({ 
    name: 'paymentMethod', 
    required: false, 
    description: 'Filtrar por método de pago',
    example: 'cash',
    enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet']
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filtrar por estado',
    example: 'paid',
    enum: ['pending', 'paid', 'partially_paid', 'cancelled', 'refunded']
  })
  @ApiOkResponse({ 
    description: '✅ Lista de facturas obtenida exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(BillResponseDto) },
            },
          },
        },
      ],
    },
  })
  async findAll(
    @Query('date') date?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string
  ) {
    const bills = await this.billsService.findAll();
    return { success: true, message: 'Facturas obtenidas exitosamente', data: bills };
  }

  @Get(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiExtraModels(SuccessResponse, BillResponseDto)
  @ApiOperation({ 
    summary: '🧾 Obtener factura por ID 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene los detalles completos de una factura específica. Incluye todos los items, totales, pagos, etc.
    
    **Nota:** La factura contiene taxAmount = 0 y taxRate = 0 (sin impuestos).`
  })
  @ApiParam({ name: 'id', description: 'ID de la factura (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ 
    description: '✅ Factura obtenida exitosamente',
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponse) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(BillResponseDto),
            },
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: '❌ Factura no encontrada' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Bill>> {
    const bill = await this.billsService.findOne(id);
    return { success: true, message: 'Factura obtenida exitosamente', data: bill };
  }

  @Get(':id/ticket')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🎫 Obtener ticket de factura 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    **📚 FLUJO: Toma de Orden y Facturación - Paso 5 (OPCIONAL)**
    
    Obtiene el ticket completo de una factura con toda la información necesaria para imprimir.
    Incluye: productos, cantidades, precios, totales, método de pago, cambio, etc.
    
    **Flujo completo:**
    1. ✅ Crear orden: POST /orders (mesa se marca como ocupada automáticamente si es dine_in)
    2. ✅ Agregar/actualizar items: PATCH /orders/:id/items
    3. ✅ Ver orden: GET /orders/:id
    4. ✅ Cerrar cuenta: POST /bills 
       - Orden se actualiza a COMPLETED
       - Mesa se libera automáticamente (solo si orderType === 'dine_in')
       - Orden se elimina después de crear factura
    5. ✅ Obtener ticket (este endpoint - para imprimir)
    
    **Nota:** El ticket se genera desde la factura, que contiene todos los items guardados permanentemente.
    El campo "impuestos" siempre será 0 (sin impuestos).
    
    **Automatización del backend:**
    - ✅ La mesa se libera automáticamente al facturar (solo si orderType === 'dine_in')
    - ✅ La orden se actualiza a COMPLETED antes de eliminarse
    - ✅ No se requiere acción manual del frontend para liberar mesas`
  })
  @ApiParam({ name: 'id', description: 'ID de la factura (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ 
    description: '✅ Ticket obtenido exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Ticket obtenido exitosamente',
        data: {
          billNumber: 'BILL-1234567890-ABCD',
          orderNumber: 'ORD-1234567890-EFGH',
          fecha: '2025-12-13T03:00:00.000Z',
          tipoVenta: 'Mesa 5',
          mesa: 5,
          cliente: 'Juan Pérez',
          productos: [
            {
              nombre: 'Pizza Margherita',
              cantidad: 1,
              precioUnitario: 15.99,
              total: 15.99,
              instrucciones: ''
            }
          ],
          subtotal: 15.99,
          impuestos: 0,
          descuento: 0,
          propina: 0,
          total: 15.99,
          metodoPago: 'cash',
          montoPagado: 20.00,
          cambio: 4.01,
          cajero: null,
          notas: ''
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Factura no encontrada' })
  async getTicket(@Param('id') id: string) {
    const bill = await this.billsService.findOne(id);
    
    // Los items están guardados en la factura
    if (!bill.items || bill.items.length === 0) {
      throw new BadRequestException('La factura no contiene items.');
    }
    
    // Obtener información adicional si existe
    let table = null;
    if (bill.tableId) {
      try {
        const tablesTableName = (this.billsService as any).dynamoService.getTableName('tables');
        table = await (this.billsService as any).dynamoService.get(tablesTableName, { id: bill.tableId });
      } catch (error) {
        // Ignorar si no se puede obtener la mesa
      }
    }

    // Obtener información del cliente si existe
    let customerName = 'Consumidor Final';
    if (bill.customerId) {
      try {
        const customersTableName = (this.billsService as any).dynamoService.getTableName('customers');
        const customer = await (this.billsService as any).dynamoService.get(customersTableName, { id: bill.customerId });
        if (customer) {
          customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Consumidor Final';
        }
      } catch (error) {
        // Si no se puede obtener el cliente, usar "Consumidor Final"
      }
    }

    // Determinar tipo de venta
    const isDirectSale = bill.orderId === 'DIRECT_SALE';
    const saleType = isDirectSale ? 'Venta Directa' : (table ? `Mesa ${table.number}` : 'Sin mesa');

    // Estructura del ticket (toda la info viene de la factura)
    const ticket = {
      billNumber: bill.billNumber,
      orderNumber: bill.orderNumber || 'N/A',
      fecha: bill.createdAt,
      tipoVenta: saleType,
      mesa: table ? table.number : null,
      cliente: customerName,
      productos: bill.items.map(item => ({
        nombre: item.productName,
        cantidad: item.quantity,
        precioUnitario: item.unitPrice,
        total: item.totalPrice,
        instrucciones: item.specialInstructions || '',
      })),
      subtotal: bill.subtotal,
      impuestos: 0, // Sin impuestos
      descuento: bill.discountAmount || 0,
      propina: bill.tipAmount || 0,
      total: bill.totalAmount,
      metodoPago: bill.paymentDetails[0]?.method || 'cash',
      montoPagado: bill.paidAmount,
      cambio: bill.changeAmount || 0,
      cajero: bill.cashierId || null,
      notas: bill.notes || '',
    };

    return { success: true, message: 'Ticket obtenido exitosamente', data: ticket };
  }
}
