import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
    
    Imprime un ticket (pedido, factura, etc.) en la impresora configurada.`
  })
  printTicket(@Body() data: any) {
    return this.printerService.printTicket(data);
  }
}