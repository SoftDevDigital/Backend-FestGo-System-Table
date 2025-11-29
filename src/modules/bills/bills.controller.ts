import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BillsService } from './bills.service';

@ApiTags('bills')
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  findAll() {
    return this.billsService.findAll();
  }
}