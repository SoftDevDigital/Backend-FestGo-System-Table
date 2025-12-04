import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException, Logger, InternalServerErrorException } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery, 
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
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
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

  // POST /customers - Crear cliente
  @Post()
  @Public()
  @ApiOperation({ 
    summary: '👥 Crear nuevo cliente',
    description: `Registra un nuevo cliente en el sistema. Útil para crear perfiles de clientes antes de que hagan reservas.
    
    **Funcionalidades:**
    - Crea un perfil de cliente con información personal
    - Valida que el email y teléfono sean únicos (no duplicados)
    - Inicializa estadísticas (totalVisits: 0, totalSpent: 0)
    - Genera un customerId único (UUID)
    
    **Campos requeridos:**
    - firstName: Nombre del cliente
    - lastName: Apellido del cliente
    - phone: Teléfono en formato internacional (debe ser único)
    
    **Campos opcionales:**
    - email: Email del cliente (debe ser único si se proporciona)
    - dateOfBirth: Fecha de nacimiento (para ofertas de cumpleaños)
    - allergies: Lista de alergias alimentarias
    - dietaryRestrictions: Restricciones dietéticas
    - preferences: Preferencias del cliente
    - notes: Notas adicionales
    
    **Validaciones:**
    - Email debe ser único (si se proporciona)
    - Teléfono debe ser único
    - Email debe tener formato válido
    - Teléfono debe tener formato internacional (+1234567890)
    
    **Respuesta:**
    Retorna el cliente creado con su customerId, que puede usarse para vincular reservas.`
  })
  @ApiCreatedResponse({ 
    description: '✅ Cliente creado exitosamente. Retorna el cliente con su customerId generado.'
  })
  @ApiBadRequestResponse({ 
    description: '❌ Error de validación: email o teléfono ya registrado, formato inválido, o datos faltantes' 
  })
  async create(@Body() createCustomerDto: CreateCustomerDto): Promise<SuccessResponse<Customer>> {
    try {
      const customer = await this.customersService.createCustomer(createCustomerDto);
      return { success: true, message: 'Customer created', data: customer };
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al crear cliente: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo crear el cliente. Verifica que todos los datos sean correctos: ` +
        `nombre, apellido y teléfono son requeridos. El email y teléfono deben ser únicos (no duplicados). ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /customers - Listar o buscar
  @Get()
  @AdminOrEmployee()
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
    try {
      // Búsqueda
      if (searchQuery) {
        if (searchQuery.trim().length === 0) {
          throw new BadRequestException('El parámetro de búsqueda (q) no puede estar vacío. Proporciona un nombre, email o teléfono para buscar.');
        }
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

      // Validar filtro inválido
      if (filter && filter !== 'vip' && filter !== 'top') {
        throw new BadRequestException(
          `Filtro inválido: "${filter}". Los filtros permitidos son: "vip" (clientes VIP) o "top" (top clientes por gasto).`
        );
      }

      // Listado normal con paginación
      const customers = await this.customersService.findAllCustomers(page, limit);
      return { success: true, message: 'Customers retrieved', data: customers };
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al listar/buscar clientes (q: ${searchQuery}, filter: ${filter}): ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Error al procesar la solicitud de clientes. Verifica los parámetros enviados e intenta nuevamente. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /customers/profile - Perfil completo del cliente (público para clientes registrados)
  @Get('profile')
  @Public()
  @ApiOperation({ 
    summary: '👤 Perfil completo del cliente',
    description: `Obtiene el perfil completo del cliente con toda su información histórica y estadísticas.
    
    **Información incluida:**
    
    1. **Datos del cliente:**
       - Información personal (nombre, email, teléfono, fecha de nacimiento)
       - Estado VIP
       - Alergias y restricciones dietéticas
       - Preferencias y dirección
    
    2. **Estadísticas:**
       - Total de reservas (completadas, canceladas, no-show, futuras)
       - Total de visitas
       - Total gastado y promedio por reserva
       - Última visita
       - Mesa favorita (más reservada)
       - Horario favorito (más frecuente)
       - Estadísticas mensuales (últimos 6 meses)
    
    3. **Historial de reservas:**
       - Reservas futuras (ordenadas por fecha ascendente)
       - Reservas pasadas (ordenadas por fecha descendente)
    
    **Parámetros requeridos (uno de los dos):**
    - customerId: ID único del cliente (UUID)
    - phone: Teléfono del cliente en formato internacional
    
    **Uso típico:**
    - Cliente registrado: Usar customerId después de login
    - Cliente no registrado: Usar phone para verificar reservas
    
    **Respuesta:**
    Objeto completo con customer, statistics, y reservations (upcoming/past)`
  })
  @ApiQuery({ 
    name: 'customerId', 
    required: false, 
    description: 'ID único del cliente (UUID). Requerido si no se proporciona phone.',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({ 
    name: 'phone', 
    required: false, 
    description: 'Teléfono del cliente en formato internacional. Requerido si no se proporciona customerId.',
    example: '+1234567890'
  })
  @ApiOkResponse({ 
    description: '✅ Perfil obtenido exitosamente. Retorna objeto con customer, statistics y reservations.' 
  })
  @ApiBadRequestResponse({ 
    description: '❌ Error: Debe proporcionar customerId o phone (al menos uno es requerido)' 
  })
  @ApiNotFoundResponse({ 
    description: '❌ Cliente no encontrado con el customerId o phone proporcionado' 
  })
  async getProfile(
    @Query('customerId') customerId?: string,
    @Query('phone') phone?: string
  ): Promise<SuccessResponse<any>> {
    try {
      if (!customerId && !phone) {
        throw new BadRequestException(
          'Para obtener el perfil del cliente debes proporcionar al menos uno de estos parámetros: ' +
          'customerId (ID único del cliente) o phone (teléfono en formato internacional, ej: +1234567890).'
        );
      }
      if (customerId && customerId.trim().length === 0) {
        throw new BadRequestException('El customerId no puede estar vacío. Proporciona un ID válido o usa el parámetro phone.');
      }
      if (phone && phone.trim().length === 0) {
        throw new BadRequestException('El teléfono no puede estar vacío. Proporciona un teléfono válido en formato internacional o usa el parámetro customerId.');
      }
      const profile = await this.customersService.getCustomerProfile(customerId, phone);
      return { success: true, message: 'Customer profile retrieved', data: profile };
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al obtener perfil del cliente (customerId: ${customerId}, phone: ${phone}): ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo encontrar el perfil del cliente. Verifica que el customerId o teléfono sean correctos y que el cliente exista en el sistema. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /customers/:id - Obtener por ID (Admin/Employee)
  @Get(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🔍 Obtener cliente por ID',
    description: 'Obtiene información básica del cliente (para admin/empleado)'
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiOkResponse({ description: '✅ Cliente encontrado' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Customer>> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID del cliente es requerido y no puede estar vacío.');
      }
      const customer = await this.customersService.findCustomerById(id);
      return { success: true, message: 'Customer retrieved', data: customer };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener cliente por ID (${id}): ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo encontrar el cliente con ID: ${id}. Verifica que el ID sea correcto y que el cliente exista en el sistema.`
      );
    }
  }

  // GET /customers/:id/reservations - Historial de reservas
  @Get(':id/reservations')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📅 Historial de reservas del cliente',
    description: 'Obtiene todas las reservas pasadas y futuras del cliente'
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiOkResponse({ description: '✅ Historial obtenido' })
  async getReservationHistory(@Param('id') id: string): Promise<SuccessResponse<any[]>> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID del cliente es requerido y no puede estar vacío.');
      }
      const reservations = await this.customersService.getCustomerReservationHistory(id);
      return { success: true, message: 'Reservation history retrieved', data: reservations };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener historial de reservas del cliente (${id}): ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo obtener el historial de reservas del cliente con ID: ${id}. Verifica que el ID sea correcto.`
      );
    }
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
    try {
      if (!phone || phone.trim().length === 0) {
        throw new BadRequestException('El teléfono es requerido y no puede estar vacío. Debe estar en formato internacional (ej: +1234567890).');
      }
      const customer = await this.customersService.findCustomerByPhone(phone);
      return { success: true, message: 'Customer retrieved', data: customer };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al buscar cliente por teléfono (${phone}): ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo encontrar el cliente con teléfono: ${phone}. Verifica que el teléfono sea correcto y esté en formato internacional.`
      );
    }
  }

  // PATCH /customers/:id - Actualizar
  @Patch(':id')
  @AdminOrEmployee()
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
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID del cliente es requerido y no puede estar vacío.');
      }
      if (!updateCustomerDto || Object.keys(updateCustomerDto).length === 0) {
        throw new BadRequestException('Debes enviar al menos un campo en el body con los datos a actualizar.');
      }
      const customer = await this.customersService.updateCustomer(id, updateCustomerDto);
      return { success: true, message: 'Customer updated', data: customer };
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al actualizar cliente (${id}): ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo actualizar el cliente con ID: ${id}. Verifica que el cliente exista y que los datos enviados sean válidos. ` +
        `El email y teléfono deben ser únicos si se están actualizando. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // PATCH /customers/:id/manage - Gestionar estado VIP y notas
  @Patch(':id/manage')
  @AdminOnly()
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
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID del cliente es requerido y no puede estar vacío.');
      }
      if (!action || action.trim().length === 0) {
        throw new BadRequestException(
          'La acción es requerida. Las acciones permitidas son: promote-vip, remove-vip, add-note, update-preferences.'
        );
      }

      let customer: Customer;

      switch(action) {
        case 'promote-vip':
          customer = await this.customersService.promoteToVip(id);
          break;
        case 'remove-vip':
          customer = await this.customersService.removeVipStatus(id);
          break;
        case 'add-note':
          if (!body?.note || body.note.trim().length === 0) {
            throw new BadRequestException('Para agregar una nota (action=add-note) se requiere el campo "note" en el body con el texto de la nota.');
          }
          customer = await this.customersService.addCustomerNote(id, body.note);
          break;
        case 'update-preferences':
          if (!body || Object.keys(body).length === 0) {
            throw new BadRequestException(
              'Para actualizar preferencias (action=update-preferences) se requiere un body con las preferencias a actualizar.'
            );
          }
          customer = await this.customersService.updateCommunicationPreferences(id, body);
          break;
        default:
          throw new BadRequestException(
            `Acción inválida: "${action}". Las acciones permitidas son: promote-vip, remove-vip, add-note, update-preferences.`
          );
      }

      return { success: true, message: `Customer ${action}d successfully`, data: customer };
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al gestionar cliente (ID: ${id}, action: ${action}): ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo procesar la acción "${action}" para el cliente con ID: ${id}. ` +
        `Verifica que el cliente exista y que los datos enviados sean válidos. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // DELETE /customers/:id - Eliminar
  @Delete(':id')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🗑️ Eliminar cliente',
    description: 'Elimina permanentemente un cliente (usar con precaución)'
  })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiOkResponse({ description: '✅ Cliente eliminado' })
  async remove(@Param('id') id: string): Promise<SuccessResponse<void>> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID del cliente es requerido y no puede estar vacío.');
      }
      await this.customersService.deleteCustomer(id);
      return { success: true, message: 'Customer deleted', data: undefined };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al eliminar cliente (${id}): ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo eliminar el cliente con ID: ${id}. Verifica que el ID sea correcto y que el cliente exista en el sistema.`
      );
    }
  }
}
