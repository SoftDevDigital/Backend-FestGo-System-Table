import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({ 
    summary: '🍽️ Obtener todas las mesas', 
    description: 'Retorna una lista de todas las mesas disponibles en el restaurante. Endpoint público, no requiere autenticación.' 
  })
  @ApiOkResponse({ 
    description: '✅ Lista de mesas obtenida exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            number: 1,
            capacity: 4,
            location: 'Interior',
            status: 'available',
            createdAt: '2025-11-30T10:00:00.000Z',
            updatedAt: '2025-11-30T10:00:00.000Z'
          }
        ]
      }
    }
  })
  findAll() {
    return this.tablesService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: '🔍 Obtener mesa por ID', 
    description: 'Obtiene los detalles de una mesa específica por su ID.' 
  })
  @ApiParam({ name: 'id', description: 'ID único de la mesa', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ 
    description: '✅ Mesa encontrada',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          number: 1,
          capacity: 4,
          location: 'Interior',
          status: 'available'
        }
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: '❌ Mesa no encontrada',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        message: 'Mesa con ID 123e4567-e89b-12d3-a456-426614174000 no encontrada'
      }
    }
  })
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ 
    summary: '➕ Crear nueva mesa', 
    description: 'Crea una nueva mesa en el restaurante. Solo administradores pueden crear mesas.' 
  })
  @ApiBody({ type: CreateTableDto })
  @ApiCreatedResponse({ 
    description: '✅ Mesa creada exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        message: 'Recurso creado exitosamente',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          number: 5,
          capacity: 6,
          location: 'Terraza',
          status: 'available',
          createdAt: '2025-11-30T10:00:00.000Z',
          updatedAt: '2025-11-30T10:00:00.000Z'
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: '❌ Datos inválidos',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'Error de validación',
        validationErrors: {
          number: 'El número de mesa es requerido',
          capacity: 'La capacidad debe ser un número mayor a 0'
        }
      }
    }
  })
  create(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.create(createTableDto);
  }

  @Put(':id')
  @AdminOnly()
  @ApiOperation({ 
    summary: '✏️ Actualizar mesa', 
    description: 'Actualiza los datos de una mesa existente. Solo administradores pueden actualizar mesas.' 
  })
  @ApiParam({ name: 'id', description: 'ID único de la mesa', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ 
    description: '✅ Mesa actualizada exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Operación completada exitosamente',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          number: 1,
          capacity: 6,
          location: 'Terraza',
          status: 'reserved',
          updatedAt: '2025-11-30T10:00:00.000Z'
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Mesa no encontrada' })
  @ApiBadRequestResponse({ description: '❌ Datos inválidos' })
  update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tablesService.update(id, updateTableDto);
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: '🗑️ Eliminar mesa', 
    description: 'Elimina permanentemente una mesa del sistema. Solo administradores pueden eliminar mesas. Esta acción no se puede deshacer.' 
  })
  @ApiParam({ name: 'id', description: 'ID único de la mesa', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiNoContentResponse({ description: '✅ Mesa eliminada exitosamente' })
  @ApiNotFoundResponse({ description: '❌ Mesa no encontrada' })
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}