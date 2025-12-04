import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('bills')
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🧾 Obtener todas las facturas 🔐', 
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Retorna una lista de todas las facturas generadas. Incluye información de pagos, métodos de pago, totales, etc.` 
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
    enum: ['cash', 'card', 'transfer', 'other']
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filtrar por estado',
    example: 'paid',
    enum: ['pending', 'paid', 'cancelled']
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    description: 'Número de página',
    example: 1,
    type: Number
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Elementos por página',
    example: 20,
    type: Number
  })
  @ApiOkResponse({ 
    description: '✅ Lista de facturas obtenida exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            orderId: 'order-123',
            tableNumber: 5,
            subtotal: 50.00,
            tax: 10.00,
            tip: 5.00,
            total: 65.00,
            paymentMethod: 'card',
            status: 'paid',
            createdAt: '2025-11-30T10:00:00.000Z'
          }
        ]
      }
    }
  })
  findAll(
    @Query('date') date?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string
  ) {
    return this.billsService.findAll();
  }
}