import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @AdminOrEmployee()
  @ApiOperation({ summary: 'Obtener todos los pedidos' })
  findAll() {
    return this.ordersService.findAll();
  }
}