import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📊 Dashboard del administrador',
    description: `Obtiene métricas y estadísticas generales del sistema en tiempo real. Solo para administradores.
    
    **Incluye:**
    - Ventas del día/semana/mes
    - Reservas activas y pendientes
    - Mesas ocupadas/disponibles
    - Productos más vendidos
    - Ingresos y gastos
    - Alertas de inventario
    - Estadísticas de clientes`
  })
  @ApiOkResponse({ 
    description: '✅ Dashboard obtenido exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: {
          sales: {
            today: 1250.50,
            week: 8750.00,
            month: 35000.00
          },
          reservations: {
            today: 15,
            pending: 8,
            confirmed: 5,
            completed: 2
          },
          tables: {
            total: 20,
            available: 12,
            occupied: 6,
            reserved: 2
          },
          topProducts: [
            { name: 'Pizza Margherita', sales: 45 },
            { name: 'Pasta Carbonara', sales: 32 }
          ],
          inventoryAlerts: [
            { item: 'Tomate', stock: 5, minimum: 20 }
          ],
          customers: {
            total: 150,
            vip: 12,
            newToday: 3
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ No autenticado - Token JWT requerido' })
  @ApiForbiddenResponse({ description: '🚫 Acceso denegado - Solo administradores' })
  getDashboard() {
    return this.adminService.getDashboard();
  }
}