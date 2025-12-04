import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
    enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled']
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
    description: '✅ Lista de pedidos obtenida exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            tableId: 'table-123',
            tableNumber: 5,
            status: 'preparing',
            items: [
              {
                productId: 'prod-123',
                productName: 'Pizza Margherita',
                quantity: 2,
                price: 15.99,
                subtotal: 31.98
              }
            ],
            total: 31.98,
            createdAt: '2025-11-30T10:00:00.000Z'
          }
        ]
      }
    }
  })
  findAll(@Query('status') status?: string, @Query('tableId') tableId?: string, @Query('date') date?: string) {
    return this.ordersService.findAll();
  }
}