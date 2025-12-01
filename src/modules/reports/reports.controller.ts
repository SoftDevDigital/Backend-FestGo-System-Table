import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📈 Reporte de ventas',
    description: `Obtiene reporte detallado de ventas con análisis completo. Solo para administradores.
    
    **Incluye:**
    - Ventas por período (día, semana, mes)
    - Comparación con períodos anteriores
    - Ventas por categoría de producto
    - Ventas por método de pago
    - Top productos vendidos
    - Horarios pico de ventas
    - Tendencias y gráficos`
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    description: 'Fecha de inicio (YYYY-MM-DD)',
    example: '2025-11-01'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    description: 'Fecha de fin (YYYY-MM-DD)',
    example: '2025-11-30'
  })
  @ApiQuery({ 
    name: 'groupBy', 
    required: false, 
    description: 'Agrupar por: day, week, month',
    example: 'day',
    enum: ['day', 'week', 'month']
  })
  @ApiOkResponse({ 
    description: '✅ Reporte de ventas obtenido exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: {
          period: {
            startDate: '2025-11-01',
            endDate: '2025-11-30',
            days: 30
          },
          summary: {
            totalSales: 35000.00,
            totalOrders: 450,
            averageOrderValue: 77.78,
            previousPeriod: {
              totalSales: 32000.00,
              change: 9.38
            }
          },
          byCategory: [
            { category: 'Pizzas', sales: 15000.00, percentage: 42.86 },
            { category: 'Pastas', sales: 10000.00, percentage: 28.57 }
          ],
          byPaymentMethod: [
            { method: 'card', amount: 21000.00, percentage: 60 },
            { method: 'cash', amount: 14000.00, percentage: 40 }
          ],
          topProducts: [
            { name: 'Pizza Margherita', sales: 5000.00, quantity: 250 },
            { name: 'Pasta Carbonara', sales: 3500.00, quantity: 175 }
          ],
          peakHours: [
            { hour: '20:00', sales: 5000.00 },
            { hour: '21:00', sales: 4500.00 }
          ]
        }
      }
    }
  })
  getSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string
  ) {
    return this.reportsService.getSales();
  }
}