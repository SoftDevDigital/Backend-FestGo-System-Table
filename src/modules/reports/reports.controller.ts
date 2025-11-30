import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @AdminOnly()
  @ApiOperation({ 
    summary: '📈 Reporte de ventas',
    description: 'Obtiene reporte detallado de ventas. Solo para administradores.'
  })
  getSales() {
    return this.reportsService.getSales();
  }
}