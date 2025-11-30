import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('bills')
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @AdminOrEmployee()
  @ApiOperation({ summary: 'Obtener todas las facturas' })
  findAll() {
    return this.billsService.findAll();
  }
}