import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery, 
  ApiParam, 
  ApiBearerAuth, 
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse 
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto, UpdateReservationDto, AvailabilityQueryDto, ReservationFilterDto } from './dto/reservation.dto';
import { Reservation } from '../../common/entities/reservation.entity';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // POST /reservations - Crear reserva
  @Post()
  @Public()
  @ApiOperation({ 
    summary: '📅 Crear nueva reserva',
    description: 'Crea una nueva reserva verificando disponibilidad automáticamente'
  })
  @ApiCreatedResponse({ description: '✅ Reserva creada exitosamente' })
  @ApiBadRequestResponse({ description: '❌ Datos inválidos' })
  @ApiConflictResponse({ description: '⚠️ No hay disponibilidad' })
  async create(@Body() createReservationDto: CreateReservationDto): Promise<SuccessResponse<Reservation>> {
    const reservation = await this.reservationsService.createReservation(createReservationDto);
    return {
      success: true,
      message: 'Reservation created successfully',
      data: reservation
    };
  }

  // GET /reservations - Listar con filtros
  @Get()
  @AdminOrEmployee()
  @ApiOperation({ 
    summary: '📋 Obtener reservas',
    description: `Obtiene reservas con filtros opcionales:
    
    **Filtros rápidos (query: filter):**
    - today: Reservas de hoy
    - upcoming: Próximas X horas (usar param hours)
    
    **Filtros normales:**
    - date: Fecha específica (YYYY-MM-DD)
    - status: Estado (pending, confirmed, seated, completed, cancelled)
    - customerId: Por cliente
    - tableNumber: Por mesa
    
    **Paginación:**
    - page: Número de página (default: 1)
    - limit: Items por página (default: 10, max: 100)`
  })
  @ApiQuery({ name: 'filter', required: false, description: 'Filtro rápido: today, upcoming', example: 'today' })
  @ApiQuery({ name: 'hours', required: false, description: 'Horas para filter=upcoming (default: 2)', example: 2 })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha específica (YYYY-MM-DD)', example: '2025-11-20' })
  @ApiQuery({ name: 'status', required: false, description: 'Estado de reserva', example: 'confirmed' })
  @ApiQuery({ name: 'customerId', required: false, description: 'ID del cliente' })
  @ApiQuery({ name: 'tableNumber', required: false, description: 'Número de mesa' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items por página', example: 20 })
  @ApiOkResponse({ description: '✅ Reservas obtenidas exitosamente' })
  async findAll(
    @Query() filters: ReservationFilterDto,
    @Query('filter') quickFilter?: string,
    @Query('hours') hours?: number
  ): Promise<SuccessResponse<any>> {
    // Filtros rápidos
    if (quickFilter === 'today') {
      const reservations = await this.reservationsService.getTodaysReservations();
      return { success: true, message: "Today's reservations", data: reservations };
    }
    
    if (quickFilter === 'upcoming') {
      const reservations = await this.reservationsService.getUpcomingReservations(hours);
      return { success: true, message: 'Upcoming reservations', data: reservations };
    }

    // Listado normal con paginación
    const reservations = await this.reservationsService.findAllReservations(filters);
    return { success: true, message: 'Reservations retrieved', data: reservations };
  }

  // GET /reservations/check - Verificar disponibilidad o slots
  @Get('check')
  @Public()
  @ApiOperation({ 
    summary: '🔍 Verificar disponibilidad o slots',
    description: `Endpoint unificado:
    
    **type=availability (default):**
    - Verifica si hay disponibilidad
    - Retorna: { available: boolean, alternatives: [] }
    
    **type=slots:**
    - Retorna horarios disponibles
    - Con scores de recomendación`
  })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo: availability o slots', example: 'availability' })
  @ApiQuery({ name: 'date', required: true, description: 'Fecha (YYYY-MM-DD)', example: '2025-11-20' })
  @ApiQuery({ name: 'time', required: false, description: 'Hora (HH:mm) - solo para availability', example: '20:00' })
  @ApiQuery({ name: 'partySize', required: true, description: 'Número de personas', example: 4 })
  @ApiQuery({ name: 'duration', required: false, description: 'Duración en minutos', example: 120 })
  @ApiOkResponse({ description: '✅ Consulta exitosa' })
  async checkAvailability(
    @Query('type') type: string = 'availability',
    @Query() query: AvailabilityQueryDto
  ): Promise<SuccessResponse<any>> {
    if (type === 'slots') {
      const slots = await this.reservationsService.getAvailableTimeSlots(
        query.date, 
        query.partySize, 
        query.preferredSeatingArea
      );
      return { success: true, message: 'Available slots retrieved', data: slots };
    }

    // Availability check por defecto
    const isAvailable = await this.reservationsService.checkAvailability(query);
    return { success: true, message: 'Availability checked', data: isAvailable };
  }

  // GET /reservations/:id - Obtener por ID
  @Get(':id')
  @AdminOrEmployee()
  @ApiOperation({ 
    summary: '🔍 Obtener reserva por ID',
    description: 'Obtiene detalles completos de una reserva específica'
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva', example: 'res_789abc123' })
  @ApiOkResponse({ description: '✅ Reserva encontrada' })
  @ApiNotFoundResponse({ description: '❌ Reserva no encontrada' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Reservation>> {
    const reservation = await this.reservationsService.findReservationById(id);
    return { success: true, message: 'Reservation retrieved', data: reservation };
  }

  // GET /reservations/code/:code - Buscar por código de confirmación
  @Get('code/:code')
  @Public()
  @ApiOperation({ 
    summary: '🎫 Buscar por código de confirmación',
    description: 'Busca reserva usando el código de confirmación (ej: GRV2K4)'
  })
  @ApiParam({ name: 'code', description: 'Código de confirmación', example: 'GRV2K4' })
  @ApiOkResponse({ description: '✅ Reserva encontrada' })
  async findByCode(@Param('code') code: string): Promise<SuccessResponse<Reservation>> {
    const reservation = await this.reservationsService.findReservationByConfirmationCode(code);
    return { success: true, message: 'Reservation found', data: reservation };
  }

  // PATCH /reservations/:id - Actualizar
  @Patch(':id')
  @AdminOrEmployee()
  @ApiOperation({ 
    summary: '✏️ Actualizar reserva',
    description: 'Actualiza datos de una reserva existente'
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva' })
  @ApiOkResponse({ description: '✅ Reserva actualizada' })
  async update(
    @Param('id') id: string, 
    @Body() updateReservationDto: UpdateReservationDto
  ): Promise<SuccessResponse<Reservation>> {
    const reservation = await this.reservationsService.updateReservation(id, updateReservationDto);
    return { success: true, message: 'Reservation updated', data: reservation };
  }

  // PATCH /reservations/:id/status - Cambiar estado
  @Patch(':id/status')
  @AdminOrEmployee()
  @ApiOperation({ 
    summary: '🔄 Cambiar estado de reserva',
    description: `Cambia el estado usando query parameter 'action':
    - confirm: Confirmar reserva
    - seat: Sentar clientes (requiere tableId)
    - complete: Completar (opcional: actualSpend)
    - cancel: Cancelar (opcional: reason)
    - no-show: Marcar no-show`
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva' })
  @ApiQuery({ name: 'action', required: true, description: 'Acción: confirm, seat, complete, cancel, no-show' })
  @ApiQuery({ name: 'tableId', required: false, description: 'ID de mesa (para action=seat)' })
  @ApiQuery({ name: 'actualSpend', required: false, description: 'Gasto real (para action=complete)' })
  @ApiQuery({ name: 'reason', required: false, description: 'Motivo (para action=cancel)' })
  @ApiOkResponse({ description: '✅ Estado actualizado' })
  async updateStatus(
    @Param('id') id: string,
    @Query('action') action: string,
    @Query('tableId') tableId?: string,
    @Query('actualSpend') actualSpend?: number,
    @Query('reason') reason?: string
  ): Promise<SuccessResponse<Reservation>> {
    let reservation: Reservation;

    switch(action) {
      case 'confirm':
        reservation = await this.reservationsService.confirmReservation(id);
        break;
      case 'seat':
        if (!tableId) throw new Error('tableId required for seat action');
        reservation = await this.reservationsService.seatReservation(id, tableId);
        break;
      case 'complete':
        reservation = await this.reservationsService.completeReservation(id, actualSpend);
        break;
      case 'cancel':
        reservation = await this.reservationsService.cancelReservation(id, reason);
        break;
      case 'no-show':
        reservation = await this.reservationsService.markAsNoShow(id);
        break;
      default:
        throw new Error('Invalid action');
    }

    return { success: true, message: `Reservation ${action}ed successfully`, data: reservation };
  }

  // DELETE /reservations/:id - Eliminar
  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ 
    summary: '🗑️ Eliminar reserva',
    description: 'Elimina permanentemente una reserva (usar con precaución)'
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva' })
  @ApiOkResponse({ description: '✅ Reserva eliminada' })
  async remove(@Param('id') id: string): Promise<SuccessResponse<void>> {
    await this.reservationsService.cancelReservation(id, 'Deleted by admin');
    return { success: true, message: 'Reservation deleted', data: undefined };
  }
}
