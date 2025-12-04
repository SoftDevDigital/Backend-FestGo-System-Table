import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiUnauthorizedResponse, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { PrinterService } from './printer.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('printer')
@Controller('printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Post('print-ticket')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🖨️ Imprimir ticket 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Genera un ticket estructurado para impresión (pedido, factura, etc.).
    
    **Campos opcionales en el body:**
    - order: Información del pedido
    - bill: Información de la factura
    - table: Información de la mesa
    - customer: Información del cliente
    - paymentMethod: Método de pago
    - cashier: Información del cajero
    - notes: Notas adicionales
    - printedAt: Fecha de impresión (ISO string)`
  })
  @ApiBody({
    description: 'Datos del ticket a imprimir',
    schema: {
      type: 'object',
      properties: {
        order: { type: 'object', description: 'Información del pedido' },
        bill: { type: 'object', description: 'Información de la factura' },
        table: { type: 'object', description: 'Información de la mesa' },
        customer: { type: 'object', description: 'Información del cliente' },
        paymentMethod: { type: 'string', description: 'Método de pago' },
        cashier: { type: 'string', description: 'Nombre del cajero' },
        notes: { type: 'string', description: 'Notas adicionales' },
        printedAt: { type: 'string', format: 'date-time', description: 'Fecha de impresión' }
      }
    },
    examples: {
      orderTicket: {
        summary: 'Ticket de pedido',
        value: {
          order: {
            orderNumber: 'ORD-001',
            items: [
              {
                productName: 'Pizza Margherita',
                quantity: 2,
                unitPrice: 15.99,
                totalPrice: 31.98
              }
            ],
            subtotal: 31.98,
            taxAmount: 5.12,
            totalAmount: 37.10
          },
          table: { number: 5 },
          customer: {
            firstName: 'Juan',
            lastName: 'Pérez',
            phone: '+541198765432'
          }
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: '✅ Ticket generado exitosamente',
    schema: {
      example: {
        success: true,
        ticket: {
          mesa: 5,
          fecha: '2025-12-04T20:00:00.000Z',
          cliente: {
            nombre: 'Juan Pérez',
            telefono: '+541198765432',
            email: 'juan.perez@example.com'
          },
          productos: [],
          subtotal: 31.98,
          impuestos: 5.12,
          total: 37.10
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ No autenticado - Token JWT requerido o inválido',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        message: 'Token inválido o expirado',
        errorCode: 'UNAUTHORIZED'
      }
    }
  })
  printTicket(@Body() data: any) {
    return this.printerService.printTicket(data);
  }
}