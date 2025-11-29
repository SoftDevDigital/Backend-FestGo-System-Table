import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery, 
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiOkResponse
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/reservation.dto';
import { Customer } from '../../common/entities/reservation.entity';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { SuccessResponse } from '../../common/dto/response.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // POST /customers - Crear cliente
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '👥 Crear nuevo cliente',
    description: 'Registra un nuevo cliente con validación de duplicados'
  })
  @ApiCreatedResponse({ description: '✅ Cliente creado exitosamente' })
  @ApiBadRequestResponse({ description: '❌ Email o teléfono ya registrado' })
  async create(@Body() createCustomerDto: CreateCustomerDto): Promise<SuccessResponse<Customer>> {
    const customer = await this.customersService.createCustomer(createCustomerDto);
    return { success: true, message: 'Customer created', data: customer };
  }

  // GET /customers - Listar o buscar
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📋 Listar o buscar clientes',
    description: `Endpoint unificado:
    
    **Búsqueda (query: q):**
    - Busca por nombre, email, teléfono, empresa
    
    **Filtros especiales (query: filter):**
    - vip: Solo clientes VIP
    - top: Top clientes por gasto (usar limit)
    
    **Listado normal:**
    - Sin parámetros: Lista paginada
    - page: Número de página
    - limit: Items por página`
  })
  @ApiQuery({ name: 'q', required: false, description: 'Búsqueda: nombre, email, teléfono', example: 'Juan' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filtro: vip, top', example: 'vip' })
  @ApiQuery({ name: 'page', required: false, description: 'Página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items por página', example: 20 })
  @ApiOkResponse({ description: '✅ Clientes obtenidos' })
  async findAll(
    @Query('q') searchQuery?: string,
    @Query('filter') filter?: string,
    @Query('page') page?: number, 
    @Query('limit') limit?: number
  ): Promise<SuccessResponse<any>> {
    // Búsqueda
    if (searchQuery) {
      const customers = await this.customersService.searchCustomers(searchQuery);
      return { success: true, message: 'Search completed', data: customers };
    }

    // Filtro VIP
    if (filter === 'vip') {
      const customers = await this.customersService.getVipCustomers();
      return { success: true, message: 'VIP customers retrieved', data: customers };
    }

    // Filtro Top
    if (filter === 'top') {
      const customers = await this.customersService.getTopCustomers(limit);
      return { success: true, message: 'Top customers retrieved', data: customers };
    }

    // Listado normal con paginación
    const customers = await this.customersService.findAllCustomers(page, limit);
    return { success: true, message: 'Customers retrieved', data: customers };
  }

  // GET /customers/:id - Obtener por ID
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🔍 Obtener cliente por ID',
    description: 'Obtiene perfil completo del cliente'
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiOkResponse({ description: '✅ Cliente encontrado' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Customer>> {
    const customer = await this.customersService.findCustomerById(id);
    return { success: true, message: 'Customer retrieved', data: customer };
  }

  // GET /customers/:id/reservations - Historial de reservas
  @Get(':id/reservations')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📅 Historial de reservas del cliente',
    description: 'Obtiene todas las reservas pasadas y futuras del cliente'
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiOkResponse({ description: '✅ Historial obtenido' })
  async getReservationHistory(@Param('id') id: string): Promise<SuccessResponse<any[]>> {
    const reservations = await this.customersService.getCustomerReservationHistory(id);
    return { success: true, message: 'Reservation history retrieved', data: reservations };
  }

  // GET /customers/phone/:phone - Buscar por teléfono
  @Get('phone/:phone')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📱 Buscar cliente por teléfono',
    description: 'Búsqueda rápida usando número de teléfono'
  })
  @ApiParam({ name: 'phone', description: 'Número de teléfono', example: '+34612345678' })
  @ApiOkResponse({ description: '✅ Cliente encontrado' })
  async findByPhone(@Param('phone') phone: string): Promise<SuccessResponse<Customer>> {
    const customer = await this.customersService.findCustomerByPhone(phone);
    return { success: true, message: 'Customer retrieved', data: customer };
  }

  // PATCH /customers/:id - Actualizar
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '✏️ Actualizar cliente',
    description: 'Actualiza información del cliente'
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiOkResponse({ description: '✅ Cliente actualizado' })
  async update(
    @Param('id') id: string, 
    @Body() updateCustomerDto: UpdateCustomerDto
  ): Promise<SuccessResponse<Customer>> {
    const customer = await this.customersService.updateCustomer(id, updateCustomerDto);
    return { success: true, message: 'Customer updated', data: customer };
  }

  // PATCH /customers/:id/manage - Gestionar estado VIP y notas
  @Patch(':id/manage')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '⭐ Gestionar cliente',
    description: `Gestión de cliente usando query parameter 'action':
    - promote-vip: Promover a VIP
    - remove-vip: Remover status VIP
    - add-note: Agregar nota (requiere body)
    - update-preferences: Actualizar preferencias (requiere body)`
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiQuery({ name: 'action', required: true, description: 'Acción: promote-vip, remove-vip, add-note, update-preferences' })
  @ApiBody({ required: false, description: 'Datos para add-note o update-preferences' })
  @ApiOkResponse({ description: '✅ Acción completada' })
  async manageCustomer(
    @Param('id') id: string,
    @Query('action') action: string,
    @Body() body?: any
  ): Promise<SuccessResponse<Customer>> {
    let customer: Customer;

    switch(action) {
      case 'promote-vip':
        customer = await this.customersService.promoteToVip(id);
        break;
      case 'remove-vip':
        customer = await this.customersService.removeVipStatus(id);
        break;
      case 'add-note':
        if (!body?.note) throw new Error('Note is required');
        customer = await this.customersService.addCustomerNote(id, body.note);
        break;
      case 'update-preferences':
        if (!body) throw new Error('Preferences are required');
        customer = await this.customersService.updateCommunicationPreferences(id, body);
        break;
      default:
        throw new Error('Invalid action');
    }

    return { success: true, message: `Customer ${action}d successfully`, data: customer };
  }

  // DELETE /customers/:id - Eliminar
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🗑️ Eliminar cliente',
    description: 'Elimina permanentemente un cliente (usar con precaución)'
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiOkResponse({ description: '✅ Cliente eliminado' })
  async remove(@Param('id') id: string): Promise<SuccessResponse<void>> {
    await this.customersService.deleteCustomer(id);
    return { success: true, message: 'Customer deleted', data: undefined };
  }
}
