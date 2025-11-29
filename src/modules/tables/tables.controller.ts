import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las mesas' })
  findAll() {
    return this.tablesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener mesa por ID' })
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva mesa' })
  create(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.create(createTableDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar mesa' })
  update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tablesService.update(id, updateTableDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar mesa' })
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}