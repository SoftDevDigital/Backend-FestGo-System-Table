import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException, Logger } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiOkResponse
} from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/reservation.dto';
import { WaitlistEntry } from '../../common/entities/reservation.entity';
import { SuccessResponse } from '../../common/dto/response.dto';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  private readonly logger = new Logger(WaitlistController.name);

  constructor(private readonly waitlistService: WaitlistService) {}

  // POST /waitlist - Agregar a lista de espera
  @Post()
  @Public()
  @ApiOperation({ 
    summary: '⏳ Agregar a lista de espera 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Agrega un cliente a la lista de espera con cálculo automático de tiempo estimado.
    
    **Campos requeridos:**
    - partySize: Número de personas (1-20)
    - requestedDate: Fecha solicitada en formato ISO (ej: "2025-12-04T23:00:00.000Z")
    - customerDetails O customerId: Debes proporcionar uno de los dos
      - customerDetails: { firstName, lastName, phone } (requerido si no hay customerId)
      - customerId: ID del cliente registrado (opcional)
    
    **Campos opcionales:**
    - requestedTime: Hora solicitada (HH:mm)
    - timeFlexibility: Flexibilidad de tiempo en minutos (0-240, default: 30)
    - notes: Notas adicionales`
  })
  @ApiBody({ 
    type: CreateWaitlistEntryDto,
    examples: {
      withCustomerDetails: {
        summary: 'Con datos del cliente (nuevo cliente)',
        description: 'Ejemplo cuando el cliente no está registrado en el sistema',
        value: {
          partySize: 4,
          requestedDate: '2025-12-04T23:00:00.000Z',
          customerDetails: {
            firstName: 'Juan',
            lastName: 'Pérez',
            phone: '+541198765432',
            email: 'juan.perez@example.com'
          },
          requestedTime: '20:00',
          timeFlexibility: 30,
          notes: 'Mesa cerca de la barra'
        }
      },
      withCustomerId: {
        summary: 'Con ID de cliente (cliente registrado)',
        description: 'Ejemplo cuando el cliente ya está registrado en el sistema',
        value: {
          partySize: 2,
          requestedDate: '2025-12-04T23:00:00.000Z',
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          requestedTime: '19:30',
          notes: 'Aniversario'
        }
      }
    }
  })
  @ApiCreatedResponse({ description: '✅ Agregado a lista de espera exitosamente' })
  @ApiBadRequestResponse({ description: '❌ Error de validación: datos faltantes, cliente ya en lista, o formato inválido' })
  async addToWaitlist(@Body() createWaitlistDto: CreateWaitlistEntryDto): Promise<SuccessResponse<WaitlistEntry>> {
    try {
      const waitlistEntry = await this.waitlistService.addToWaitlist(createWaitlistDto);
      return { success: true, message: 'Added to waitlist', data: waitlistEntry };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error agregando a waitlist: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo agregar a la lista de espera. ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /waitlist - Obtener lista de espera
  @Get()
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📋 Obtener lista de espera 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene lista de espera con filtros opcionales:
    
    **Filtros (query):**
    - date: Fecha específica (YYYY-MM-DD)
    - stats: Estadísticas (usar ?stats=true)
    
    **Sin filtros:**
    - Retorna lista de espera actual (hoy)`
  })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha específica (YYYY-MM-DD)', example: '2025-11-20' })
  @ApiQuery({ name: 'stats', required: false, description: 'Obtener estadísticas (true/false)', example: false })
  @ApiOkResponse({ description: '✅ Lista obtenida' })
  async getWaitlist(
    @Query('date') date?: string,
    @Query('stats') stats?: boolean
  ): Promise<SuccessResponse<any>> {
    // Estadísticas
    if (stats) {
      const statistics = await this.waitlistService.getWaitlistStatistics(date);
      return { success: true, message: 'Waitlist statistics retrieved', data: statistics };
    }

    // Lista normal por fecha
    const useDate = date || new Date().toISOString().split('T')[0];
    const waitlist = await this.waitlistService.getWaitlistForDate(useDate);
    return { success: true, message: 'Waitlist retrieved', data: waitlist };
  }

  // PATCH /waitlist/:id - Actualizar estado
  @Patch(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🔄 Actualizar entrada de lista de espera 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Actualiza usando query parameter 'action':
    - contact: Marcar como contactado
    - convert: Convertir a reserva (requiere reservationId)
    - cancel: Cancelar entrada`
  })
  @ApiParam({ name: 'id', description: 'ID de la entrada de waitlist' })
  @ApiQuery({ name: 'action', required: true, description: 'Acción: contact, convert, cancel' })
  @ApiQuery({ name: 'reservationId', required: false, description: 'ID de reserva (para action=convert)' })
  @ApiOkResponse({ description: '✅ Entrada actualizada' })
  async updateEntry(
    @Param('id') id: string,
    @Query('action') action: string,
    @Query('reservationId') reservationId?: string
  ): Promise<SuccessResponse<WaitlistEntry>> {
    let waitlistEntry: WaitlistEntry;

    switch(action) {
      case 'contact':
        waitlistEntry = await this.waitlistService.contactWaitlistEntry(id);
        break;
      case 'convert':
        if (!reservationId) throw new Error('reservationId required for convert action');
        waitlistEntry = await this.waitlistService.convertWaitlistToReservation(id, reservationId);
        break;
      case 'cancel':
        waitlistEntry = await this.waitlistService.cancelWaitlistEntry(id);
        break;
      default:
        throw new Error('Invalid action');
    }

    return { success: true, message: `Waitlist entry ${action}ed`, data: waitlistEntry };
  }

  // DELETE /waitlist/:id - Eliminar entrada
  @Delete(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🗑️ Eliminar entrada 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Elimina una entrada de la lista de espera`
  })
  @ApiParam({ name: 'id', description: 'ID de la entrada' })
  @ApiOkResponse({ description: '✅ Entrada eliminada' })
  async cancel(@Param('id') id: string): Promise<SuccessResponse<WaitlistEntry>> {
    const waitlistEntry = await this.waitlistService.cancelWaitlistEntry(id);
    return { success: true, message: 'Waitlist entry cancelled', data: waitlistEntry };
  }

  // POST /waitlist/maintenance - Mantenimiento
  @Post('maintenance')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🔧 Mantenimiento de lista de espera 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Expira entradas antiguas automáticamente`
  })
  @ApiOkResponse({ description: '✅ Mantenimiento completado' })
  async expireOldEntries(): Promise<SuccessResponse<void>> {
    await this.waitlistService.expireOldEntries();
    return { success: true, message: 'Old entries expired', data: undefined };
  }
}
