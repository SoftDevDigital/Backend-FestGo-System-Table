import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener todas las mesas' })
  findAll() {
    return this.tablesService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener mesa por ID' })
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Crear nueva mesa' })
  create(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.create(createTableDto);
  }

  @Put(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Actualizar mesa' })
  update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tablesService.update(id, updateTableDto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Eliminar mesa' })
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}