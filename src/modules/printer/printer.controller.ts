import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrinterService } from './printer.service';

@ApiTags('printer')
@Controller('printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Post('print-ticket')
  printTicket(@Body() data: any) {
    return this.printerService.printTicket(data);
  }
}