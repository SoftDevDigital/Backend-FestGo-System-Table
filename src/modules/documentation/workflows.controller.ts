import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('📚 Flujos de Trabajo / Workflows')
@Controller('workflows')
export class WorkflowsController {
  @Get()
  @Public()
  @ApiOperation({ 
    summary: '📚 Documentación de Flujos de Trabajo',
    description: `Esta sección documenta los flujos de trabajo principales del sistema.
    
    **Flujos disponibles:**
    1. 🍽️ Flujo de Reserva de Mesa
    2. 📝 Flujo de Toma de Orden y Facturación
    3. 📋 Flujo de Lista de Espera
    4. 📊 Flujo de Reportes y Administración`
  })
  @ApiOkResponse({
    description: 'Lista de flujos de trabajo disponibles',
    schema: {
      type: 'object',
      properties: {
        workflows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              endpoints: { type: 'array' }
            }
          }
        }
      }
    }
  })
  getWorkflows() {
    return {
      workflows: [
        {
          id: 'reservation',
          name: '🍽️ Flujo de Reserva de Mesa',
          description: 'Proceso completo para que un cliente reserve una mesa',
          endpoints: [
            'POST /api/v1/reservations - Crear reserva',
            'GET /api/v1/reservations - Ver reservas',
            'PATCH /api/v1/reservations/:id - Actualizar reserva',
            'GET /api/v1/reservations/availability/:date - Ver disponibilidad'
          ]
        },
        {
          id: 'order-billing',
          name: '📝 Flujo de Toma de Orden y Facturación',
          description: 'Proceso completo desde que el empleado toma la orden hasta que se factura',
          endpoints: [
            'POST /api/v1/orders - Crear orden',
            'PATCH /api/v1/orders/:id/items - Agregar/actualizar items',
            'DELETE /api/v1/orders/:id/items/:itemId - Quitar item',
            'GET /api/v1/orders/:id - Ver orden',
            'POST /api/v1/bills - Cerrar cuenta y crear factura',
            'GET /api/v1/bills/:id/ticket - Obtener ticket'
          ]
        },
        {
          id: 'waitlist',
          name: '📋 Flujo de Lista de Espera',
          description: 'Proceso para manejar clientes en lista de espera',
          endpoints: [
            'POST /api/v1/waitlist - Agregar a lista de espera',
            'GET /api/v1/waitlist - Ver lista de espera',
            'PATCH /api/v1/waitlist/:id - Actualizar entrada',
            'DELETE /api/v1/waitlist/:id - Remover de lista'
          ]
        },
        {
          id: 'reports',
          name: '📊 Flujo de Reportes y Administración',
          description: 'Flujos para administradores: reportes, movimientos financieros, etc.',
          endpoints: [
            'GET /api/v1/reports/sales - Reporte de ventas',
            'GET /api/v1/financial-movements - Ver movimientos financieros',
            'GET /api/v1/financial-movements/summary - Resumen financiero',
            'POST /api/v1/financial-movements - Registrar gasto/pago'
          ]
        }
      ]
    };
  }
}

