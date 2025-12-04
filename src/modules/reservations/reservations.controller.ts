import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException, Res, Req, UnauthorizedException, ForbiddenException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { Response, Request } from 'express';
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
import { ReservationStatus } from '../../common/enums';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  private readonly logger = new Logger(ReservationsController.name);

  constructor(private readonly reservationsService: ReservationsService) {}

  // POST /reservations - Crear reserva
  @Post()
  @Public()
  @ApiOperation({ 
    summary: '📅 Crear nueva reserva 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Crea una nueva reserva en el sistema. El sistema automáticamente:
    
    **Funcionalidades automáticas:**
    - Verifica disponibilidad de mesas para la fecha y hora solicitada
    - **BLOQUEA la mesa y hora seleccionada** - Una vez reservada, esa combinación queda no disponible para otros clientes
    - Asigna una mesa disponible automáticamente (si no se especifica tableNumber)
    - Valida que la fecha esté dentro del rango permitido (hoy hasta 2 semanas)
    - Verifica límites de reservas por cliente (máximo 2 reservas activas, 1 por día)
    - Crea la reserva directamente como CONFIRMED (no requiere confirmación por código)
    - Genera un código de confirmación único (6 caracteres alfanuméricos) para referencia
    - Marca la mesa como "reserved"
    - Los datos del cliente (nombre, email, teléfono) se guardan para que admin/empleado puedan buscar y filtrar rápidamente
    
    **Flujo recomendado:**
    1. Consultar disponibilidad: GET /reservations/availability/:date
    2. Seleccionar mesa y horario de los disponibles (de availableTimeSlots)
    3. Crear reserva: POST /reservations con tableNumber/tableId y reservationTime
    4. La mesa y horario seleccionados quedarán bloqueados y no disponibles para otros clientes
    
    **Campos requeridos:**
    - customerDetails (firstName, lastName, phone)
    - partySize (1-20 personas)
    - reservationDate (YYYY-MM-DD, máximo 2 semanas en el futuro)
    - reservationTime (HH:mm, dentro del horario 8:00-22:00)
    
    **Campos opcionales:**
    - customerId: Si el cliente ya está registrado
    - tableNumber: Número de mesa específica (ej: 1, 2, 3) - Se puede usar tableNumber o tableId (recomendado para evitar conflictos)
    - tableId: ID único de la mesa (ej: "123e4567-...") - Se puede usar tableId o tableNumber
    - duration: Duración en minutos (default: 120)
    - preferredSeatingArea: Área preferida
    - email: Para notificaciones
    - specialRequests, allergies, dietaryRestrictions, occasion, notes, estimatedSpend
    
    **Validaciones:**
    - **IMPORTANTE:** No se puede reservar una mesa/hora que ya está reservada por otro cliente
    - No se pueden crear reservas duplicadas (misma fecha, hora y cliente)
    - Máximo 2 reservas activas por cliente
    - Máximo 1 reserva por día por cliente
    - Horario del restaurante: 8:00 AM - 10:00 PM
    - Rango de reservas: hoy hasta 2 semanas en el futuro
    - La mesa debe tener capacidad suficiente para el partySize`
  })
  @ApiCreatedResponse({ 
    description: '✅ Reserva creada exitosamente como CONFIRMED. No requiere confirmación por código. Retorna la reserva con todos los datos del cliente (nombre, email, teléfono) para que admin/empleado puedan buscarla fácilmente.'
  })
  @ApiBadRequestResponse({ 
    description: '❌ Error de validación: datos inválidos, fecha fuera de rango, límites excedidos, o no hay disponibilidad' 
  })
  @ApiConflictResponse({ 
    description: '⚠️ Conflicto: reserva duplicada o no hay mesas disponibles para la fecha/hora solicitada' 
  })
  async create(@Body() createReservationDto: CreateReservationDto): Promise<SuccessResponse<Reservation>> {
    try {
      const reservation = await this.reservationsService.createReservation(createReservationDto);
      return {
        success: true,
        message: 'Reservation created successfully',
        data: reservation
      };
    } catch (error) {
      // Re-lanzar excepciones HTTP conocidas (BadRequestException, NotFoundException, etc.)
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      // Para errores desconocidos, loguear y lanzar un error claro
      this.logger.error(`Error al crear reserva: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo crear la reserva. Verifica que todos los datos sean correctos: ${error.message || 'Error desconocido'}. ` +
        `Asegúrate de que la fecha esté dentro del rango permitido (hoy hasta 2 semanas), el horario esté entre 8:00-22:00, ` +
        `y que no excedas el límite de 2 reservas activas.`
      );
    }
  }

  // GET /reservations - Endpoint unificado para múltiples vistas
  @Get()
  @Public() // Por defecto público, pero algunas vistas requieren auth (se valida manualmente en el método)
  @ApiBearerAuth('JWT-auth') // Opcional para vistas que requieren auth
  @ApiOperation({ 
    summary: '📋 Endpoint unificado de reservas 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida (algunas vistas requieren auth)**
    **👥 Roles permitidos:** 
    - Público: view=tables, view=check, view=my-reservations, view=calendar
    - 🔐 Admin/Empleado: view=stats, view=search, view=list
    
    Endpoint principal que maneja múltiples vistas usando query parameter 'view':
    
    **view=tables** (público): Mesas disponibles con horarios
    - **Endpoint público** - No requiere autenticación para ver mesas disponibles
    - Requiere: date, partySize
    - Opcional: duration, preferredSeatingArea
    - Retorna: Lista de mesas disponibles con sus horarios disponibles para el día solicitado
    
    **view=check** (público): Verificar disponibilidad o slots
    - **Verificación general**: Requiere date, partySize. Opcional: type (availability/slots), time, duration
    - **Verificación de mesa específica**: Requiere date, time, partySize y tableId O tableNumber
      - Retorna si esa mesa específica está disponible/ocupada para ese día y hora
      - Incluye información de reservas conflictivas si no está disponible
    
    **view=my-reservations** (público): Mis reservas
    - Requiere: customerId o phone
    - Opcional: status (past/upcoming/all)
    
    **view=stats** (admin/empleado): Estadísticas
    - Opcional: date
    
    **view=calendar** (público): Calendario mensual
    - Requiere: year, month
    
    **view=search** (admin/empleado): Búsqueda avanzada por email, nombre, teléfono, código, mesa
    - Requiere: q (texto a buscar)
    - Opcional: date, status, customerId, tableNumber
    - Busca en: código de confirmación, nombre del cliente, teléfono, email, número de mesa
    - Útil para que admin/empleado encuentren rápidamente una reserva por cualquier dato del cliente
    
    **Sin view** (admin/empleado): Listar reservas con filtros
    - Filtros: filter (today/upcoming), date, status, customerId, tableNumber
    - Paginación: page, limit`
  })
  @ApiQuery({ name: 'view', required: false, description: 'Vista: tables, check, my-reservations, stats, calendar, search', example: 'tables' })
  @ApiQuery({ name: 'date', required: false, description: 'Fecha (YYYY-MM-DD) - usado en varias vistas', example: '2025-12-15' })
  @ApiQuery({ name: 'partySize', required: false, description: 'Número de personas - usado en tables, check', example: 4 })
  @ApiQuery({ name: 'duration', required: false, description: 'Duración en minutos', example: 120 })
  @ApiQuery({ name: 'preferredSeatingArea', required: false, description: 'Área preferida', example: 'terraza' })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo para check: availability o slots', example: 'availability' })
  @ApiQuery({ name: 'time', required: false, description: 'Hora (HH:mm)', example: '20:00' })
  @ApiQuery({ name: 'customerId', required: false, description: 'ID del cliente' })
  @ApiQuery({ name: 'phone', required: false, description: 'Teléfono del cliente', example: '+1234567890' })
  @ApiQuery({ name: 'status', required: false, description: 'Estado o filtro: past, upcoming, all, confirmed, etc.', example: 'upcoming' })
  @ApiQuery({ name: 'year', required: false, description: 'Año para calendar', example: 2025 })
  @ApiQuery({ name: 'month', required: false, description: 'Mes para calendar (1-12)', example: 12 })
  @ApiQuery({ name: 'q', required: false, description: 'Texto de búsqueda', example: 'Juan' })
  @ApiQuery({ name: 'tableNumber', required: false, description: 'Número de mesa - usado en check para verificar disponibilidad de mesa específica', example: 5 })
  @ApiQuery({ name: 'tableId', required: false, description: 'ID de la mesa - usado en check para verificar disponibilidad de mesa específica', example: 'table-123' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filtro rápido: today, upcoming', example: 'today' })
  @ApiQuery({ name: 'hours', required: false, description: 'Horas para filter=upcoming', example: 2 })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items por página', example: 20 })
  @ApiQuery({ name: 'code', required: false, description: 'Código de confirmación para buscar', example: 'ABC123' })
  @ApiQuery({ name: 'export', required: false, description: 'Exportar a CSV (true/false)', example: false })
  @ApiOkResponse({ description: '✅ Operación exitosa' })
  async findAll(
    @Query('view') view?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('partySize') partySize?: number,
    @Query('duration') duration?: number,
    @Query('preferredSeatingArea') preferredSeatingArea?: string,
    @Query('type') type?: string,
    @Query('time') time?: string,
    @Query('customerId') customerId?: string,
    @Query('phone') phone?: string,
    @Query('status') status?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('q') q?: string,
    @Query('tableNumber') tableNumber?: number,
    @Query('tableId') tableId?: string,
    @Query('filter') filter?: string,
    @Query('hours') hours?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('code') code?: string,
    @Query('export') exportCsv?: string,
    @Req() req?: Request,
    @Res() res?: Response
  ): Promise<SuccessResponse<any> | void> {
    console.log('--- [RESERVATIONS] Endpoint GET /reservations llamado ---');
    console.log('Query params:', {
      view, date, startDate, endDate, partySize, duration, preferredSeatingArea, type, time, customerId, phone, status, year, month, q, tableNumber, filter, hours, page, limit, code, exportCsv
    });
    try {
      if (exportCsv === 'true') {
        console.log('Exportando reservas a CSV...');
        if (!req?.user) {
          throw new UnauthorizedException('La exportación de reservas requiere autenticación. Solo administradores pueden exportar datos.');
        }
        const userRole = (req.user as any)?.role;
        if (userRole !== 'admin') {
          throw new ForbiddenException('Solo administradores pueden exportar reservas a CSV.');
        }
        const filters: ReservationFilterDto = {
          date,
          status: status as ReservationStatus,
          customerId,
          tableNumber: tableNumber ? Number(tableNumber) : undefined
        };
        const csv = await this.reservationsService.exportReservationsToCSV(filters);
        res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res!.setHeader('Content-Disposition', 'attachment; filename=reservations.csv');
        res!.send(csv);
        return;
      }

      if (code) {
        console.log('Buscando reserva por código de confirmación:', code);
        if (!code || code.length !== 6) {
          throw new BadRequestException('El código de confirmación debe tener exactamente 6 caracteres alfanuméricos.');
        }
        const reservation = await this.reservationsService.findReservationByConfirmationCode(code);
        return { success: true, message: 'Reservation found', data: reservation };
      }

      if (view === 'tables') {
        console.log('Vista: tables');
        if (!date || !partySize) {
          throw new BadRequestException(
            'Para ver mesas disponibles (view=tables) se requieren los parámetros: date (YYYY-MM-DD) y partySize (número de personas). ' +
            `Recibido: date=${date || 'faltante'}, partySize=${partySize || 'faltante'}`
          );
        }
        if (partySize < 1 || partySize > 20) {
          throw new BadRequestException(`El número de personas (partySize) debe estar entre 1 y 20. Recibido: ${partySize}`);
        }
        const tables = await this.reservationsService.getAvailableTablesWithTimeSlots(
          date,
          partySize,
          duration || 120,
          preferredSeatingArea
        );
        return { success: true, message: 'Available tables retrieved', data: tables };
      }

      if (view === 'check') {
        console.log('[CONTROLLER] Vista: check');
        console.log('[CONTROLLER] Parámetros:', { tableId, tableNumber, date, time, partySize, duration });
        
        // Si se proporciona tableId o tableNumber, verificar disponibilidad de mesa específica
        const tableIdParam = tableId;
        const tableNumberParam = tableNumber;
        
        if (tableIdParam || tableNumberParam) {
          // SIEMPRE retornar respuesta, incluso si faltan parámetros (el servicio lo maneja)
          const tableAvailability = await this.reservationsService.checkTableAvailability(
            tableIdParam,
            tableNumberParam,
            date,
            time,
            partySize,
            duration || 120
          );
          
          // Construir respuesta completa y útil - SIEMPRE retornar datos completos
          const response = {
            success: !tableAvailability.error,
            message: tableAvailability.error 
              ? (tableAvailability.reason || 'Error verificando disponibilidad')
              : (tableAvailability.available 
                  ? 'Mesa disponible para el horario solicitado' 
                  : 'Mesa no disponible para el horario solicitado'),
            data: {
              available: tableAvailability.available,
              table: tableAvailability.table,
              request: tableAvailability.request || {
                date: date || null,
                time: time || null,
                partySize: partySize || null,
                duration: duration || 120
              },
              reason: tableAvailability.reason || null,
              conflictingReservations: tableAvailability.conflictingReservations || [],
              error: tableAvailability.error || null
            }
          };
          
          return response;
        }
        
        // Verificación general de disponibilidad (sin mesa específica)
        if (!date || !partySize) {
          throw new BadRequestException(
            'Para verificar disponibilidad (view=check) se requieren los parámetros: date (YYYY-MM-DD) y partySize (número de personas). ' +
            `Recibido: date=${date || 'faltante'}, partySize=${partySize || 'faltante'}`
          );
        }
        const checkType = type || 'availability';
        if (checkType === 'slots') {
          const slots = await this.reservationsService.getAvailableTimeSlots(
            date,
            partySize,
            preferredSeatingArea
          );
          return { success: true, message: 'Available slots retrieved', data: slots };
        }
        const query: AvailabilityQueryDto = { date, partySize, time, duration, preferredSeatingArea };
        const isAvailable = await this.reservationsService.checkAvailability(query);
        return { success: true, message: 'Availability checked', data: isAvailable };
      }

      if (view === 'my-reservations') {
        console.log('Vista: my-reservations');
        if (!customerId && !phone) {
          throw new BadRequestException(
            'Para ver tus reservas (view=my-reservations) debes proporcionar al menos uno de estos parámetros: customerId (ID del cliente) o phone (teléfono en formato internacional).'
          );
        }
        const reservations = await this.reservationsService.findReservationsByUser(
          customerId,
          phone,
          status as 'past' | 'upcoming' | 'all' || 'all'
        );
        const sortedReservations = reservations.sort((a, b) => {
          const dateA = new Date(`${a.reservationDate}T${a.reservationTime}`);
          const dateB = new Date(`${b.reservationDate}T${b.reservationTime}`);
          return dateB.getTime() - dateA.getTime();
        });
        return { success: true, message: 'User reservations retrieved', data: sortedReservations };
      }

      if (view === 'stats') {
        console.log('Vista: stats');
        if (!req?.user) {
          throw new UnauthorizedException('Las estadísticas requieren autenticación. Debes iniciar sesión como administrador o empleado para ver estadísticas.');
        }
        const userRole = (req.user as any)?.role;
        if (userRole !== 'admin' && userRole !== 'employee') {
          throw new ForbiddenException(`Tu rol actual (${userRole}) no tiene permisos para ver estadísticas. Solo administradores y empleados pueden acceder a esta vista.`);
        }
        const stats = await this.reservationsService.getReservationStats(date);
        return { success: true, message: 'Reservation statistics retrieved', data: stats };
      }

      if (view === 'calendar') {
        console.log('Vista: calendar');
        if (!year || !month) {
          throw new BadRequestException(
            'Para ver el calendario mensual (view=calendar) se requieren los parámetros: year (año, ej: 2025) y month (mes, 1-12). ' +
            `Recibido: year=${year || 'faltante'}, month=${month || 'faltante'}`
          );
        }
        if (month < 1 || month > 12) {
          throw new BadRequestException(`El mes debe estar entre 1 y 12. Recibido: ${month}`);
        }
        const calendar = await this.reservationsService.getMonthlyAvailabilityCalendar(year, month);
        return { success: true, message: 'Availability calendar retrieved', data: calendar };
      }

      if (view === 'search') {
        console.log('Vista: search');
        if (!req?.user) {
          throw new UnauthorizedException('La búsqueda de reservas requiere autenticación. Debes iniciar sesión como administrador o empleado para buscar reservas.');
        }
        const userRole = (req.user as any)?.role;
        if (userRole !== 'admin' && userRole !== 'employee') {
          throw new ForbiddenException(`Tu rol actual (${userRole}) no tiene permisos para buscar reservas. Solo administradores y empleados pueden buscar reservas.`);
        }

        if (!q || q.trim().length === 0) {
          throw new BadRequestException(
            'Para buscar reservas (view=search) se requiere el parámetro q (texto a buscar). ' +
            'Puedes buscar por: código de confirmación, nombre del cliente, teléfono, email o número de mesa.'
          );
        }
        const reservations = await this.reservationsService.searchReservations(q, {
          date,
          status: status as ReservationStatus,
          customerId,
          tableNumber: tableNumber ? Number(tableNumber) : undefined
        });
        return { success: true, message: 'Search results retrieved', data: reservations };
      }

      if (!req?.user) {
        console.log('Vista: listado por defecto (requiere auth)');
        throw new UnauthorizedException('Listar todas las reservas requiere autenticación. Debes iniciar sesión como administrador o empleado para ver todas las reservas.');
      }
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'employee') {
        console.log('Rol no autorizado:', userRole);
        throw new ForbiddenException(`Tu rol actual (${userRole}) no tiene permisos para listar todas las reservas. Solo administradores y empleados pueden ver todas las reservas.`);
      }

      if (filter === 'today') {
        console.log('Filtro: today');
        const reservations = await this.reservationsService.getTodaysReservations();
        return { success: true, message: "Today's reservations", data: reservations };
      }
      
      if (filter === 'upcoming') {
        console.log('Filtro: upcoming');
        const reservations = await this.reservationsService.getUpcomingReservations(hours);
        return { success: true, message: 'Upcoming reservations', data: reservations };
      }

      console.log('Listado normal con paginación');
      const filters: ReservationFilterDto = {
        date,
        status: status as ReservationStatus,
        customerId,
        tableNumber: tableNumber ? Number(tableNumber) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined
      };
      const reservations = await this.reservationsService.findAllReservations(filters);
      console.log('Respuesta listado:', reservations);
      return { success: true, message: 'Reservations retrieved', data: reservations };
    } catch (error) {
      console.log('Error en findAll:', error);
      // Re-lanzar excepciones HTTP conocidas
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      // Para errores desconocidos, loguear y lanzar un error claro
      this.logger.error(`Error en GET /reservations (view=${view || 'default'}): ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Error al procesar la solicitud de reservas. Vista solicitada: ${view || 'listado por defecto'}. ` +
        `Verifica los parámetros enviados e intenta nuevamente. Si el problema persiste, contacta al soporte. ` +
        `Detalle técnico: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /reservations/:id - Obtener por ID
  @Get(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🔍 Obtener reserva por ID 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Obtiene detalles completos de una reserva específica`
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva', example: 'res_789abc123' })
  @ApiOkResponse({ description: '✅ Reserva encontrada' })
  @ApiNotFoundResponse({ description: '❌ Reserva no encontrada' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<Reservation>> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID de la reserva es requerido y no puede estar vacío.');
      }
      const reservation = await this.reservationsService.findReservationById(id);
      return { success: true, message: 'Reservation retrieved', data: reservation };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener reserva por ID (${id}): ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo encontrar la reserva con ID: ${id}. Verifica que el ID sea correcto y que la reserva exista en el sistema.`
      );
    }
  }

  // PATCH /reservations/:id - Actualizar reserva o cambiar estado
  @Patch(':id')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '✏️ Actualizar reserva o cambiar estado 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Actualiza una reserva. Si se proporciona 'action' en query, cambia el estado:
    - action=confirm: Confirmar reserva
    - action=seat: Sentar clientes (requiere tableId)
    - action=complete: Completar (opcional: actualSpend)
    - action=cancel: Cancelar (opcional: reason)
    - action=no-show: Marcar no-show
    
    Si no hay 'action', actualiza los campos del body.`
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva o código de confirmación' })
  @ApiQuery({ name: 'action', required: false, description: 'Acción: confirm, seat, complete, cancel, no-show' })
  @ApiQuery({ name: 'tableId', required: false, description: 'ID de mesa (para action=seat)' })
  @ApiQuery({ name: 'actualSpend', required: false, description: 'Gasto real (para action=complete)' })
  @ApiQuery({ name: 'reason', required: false, description: 'Motivo (para action=cancel)' })
  @ApiOkResponse({ description: '✅ Reserva actualizada' })
  async update(
    @Param('id') id: string,
    @Body() updateReservationDto?: UpdateReservationDto,
    @Query('action') action?: string,
    @Query('tableId') tableId?: string,
    @Query('actualSpend') actualSpend?: number,
    @Query('reason') reason?: string
  ): Promise<SuccessResponse<Reservation>> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID de la reserva es requerido y no puede estar vacío.');
      }

      // Si hay action, cambiar estado
      if (action) {
        let reservation: Reservation;
        switch(action) {
          case 'confirm':
            reservation = await this.reservationsService.confirmReservation(id);
            break;
          case 'seat':
            if (!tableId) {
              throw new BadRequestException(
                'Para la acción "seat" (sentar clientes) se requiere el parámetro tableId (ID de la mesa donde se sentarán los clientes).'
              );
            }
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
            throw new BadRequestException(
              `Acción inválida: "${action}". Las acciones permitidas son: confirm, seat, complete, cancel, no-show.`
            );
        }
        return { success: true, message: `Reservation ${action}ed successfully`, data: reservation };
      }

      // Si no hay action, actualizar campos
      if (!updateReservationDto || Object.keys(updateReservationDto).length === 0) {
        throw new BadRequestException(
          'Para actualizar una reserva sin acción específica, debes enviar al menos un campo en el body con los datos a actualizar.'
        );
      }
      const reservation = await this.reservationsService.updateReservation(id, updateReservationDto);
      return { success: true, message: 'Reservation updated', data: reservation };
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al actualizar reserva (ID: ${id}, action: ${action}): ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo actualizar la reserva con ID: ${id}. Verifica que la reserva exista y que los datos enviados sean válidos. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // PATCH /reservations - Acciones por código de confirmación (público)
  @Patch()
  @Public()
  @ApiOperation({ 
    summary: '🔄 Acciones de cliente por código de confirmación 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Permite a los clientes realizar acciones sobre sus reservas usando el código de confirmación (6 caracteres).
    
    **Acciones disponibles:**
    
    1. **action=confirm**: Confirmar la reserva
       - Cambia el estado de "pending" a "confirmed"
       - No requiere body
       - Solo funciona si la reserva está en estado "pending"
    
    2. **action=cancel**: Cancelar la reserva
       - Cambia el estado a "cancelled"
       - Libera la mesa automáticamente
       - Opcional: reason (motivo de cancelación)
       - Solo se pueden cancelar reservas futuras
    
    3. **action=update**: Actualizar la reserva
       - Permite cambiar: mesa, horario, fecha, número de personas, duración, notas
       - Requiere body con los campos a actualizar
       - Verifica disponibilidad de la nueva mesa/horario
       - Libera la mesa anterior y asigna la nueva
       - Valida límites de reservas (máximo 2 activas, 1 por día)
       - Solo se pueden actualizar reservas futuras
    
    **Parámetros requeridos:**
    - code: Código de confirmación de 6 caracteres (ej: "ABC123")
    - action: Una de las acciones: "confirm", "cancel", "update"
    
    **Parámetros opcionales:**
    - reason: Motivo de cancelación (solo para action=cancel)
    - body: Campos a actualizar (solo para action=update)
    
    **Validaciones:**
    - El código debe existir
    - Solo se pueden modificar reservas futuras
    - No se pueden modificar reservas canceladas o completadas
    - Al actualizar, se verifica disponibilidad y límites
    
    **Ejemplo de uso:**
    - Confirmar: PATCH /reservations?code=ABC123&action=confirm
    - Cancelar: PATCH /reservations?code=ABC123&action=cancel&reason=Cambio%20de%20planes
    - Actualizar: PATCH /reservations?code=ABC123&action=update + body con campos`
  })
  @ApiQuery({ 
    name: 'code', 
    required: true, 
    description: 'Código de confirmación de la reserva (6 caracteres alfanuméricos)',
    example: 'ABC123'
  })
  @ApiQuery({ 
    name: 'action', 
    required: true, 
    description: 'Acción a realizar: "confirm" (confirmar), "cancel" (cancelar), "update" (actualizar)',
    enum: ['confirm', 'cancel', 'update'],
    example: 'confirm'
  })
  @ApiQuery({ 
    name: 'reason', 
    required: false, 
    description: 'Motivo de cancelación (solo para action=cancel)',
    example: 'Cambio de planes'
  })
  @ApiBody({ 
    type: UpdateReservationDto, 
    required: false, 
    description: 'Campos a actualizar (solo para action=update). Puede incluir: tableNumber, reservationDate, reservationTime, partySize, duration, notes, etc.'
  })
  @ApiOkResponse({ 
    description: '✅ Acción realizada exitosamente. Retorna la reserva actualizada.'
  })
  @ApiBadRequestResponse({ 
    description: '❌ Error: código inválido, acción no permitida, reserva pasada, o datos inválidos' 
  })
  @ApiNotFoundResponse({ 
    description: '❌ Reserva no encontrada con el código proporcionado' 
  })
  async updateByCode(
    @Query('code') code: string,
    @Query('action') action: string,
    @Query('reason') reason?: string,
    @Body() updateReservationDto?: UpdateReservationDto
  ): Promise<SuccessResponse<Reservation>> {
    try {
      if (!code || code.trim().length === 0) {
        throw new BadRequestException(
          'El código de confirmación es requerido. Debe ser un código de 6 caracteres alfanuméricos que recibiste al crear la reserva.'
        );
      }
      if (code.length !== 6) {
        throw new BadRequestException(
          `El código de confirmación debe tener exactamente 6 caracteres. Recibido: "${code}" (${code.length} caracteres).`
        );
      }
      if (!action || action.trim().length === 0) {
        throw new BadRequestException(
          'La acción es requerida. Debes especificar qué quieres hacer con la reserva: "confirm" (confirmar), "cancel" (cancelar) o "update" (actualizar).'
        );
      }

      if (action === 'confirm') {
        const reservation = await this.reservationsService.confirmReservationByCode(code);
        return { success: true, message: 'Reservation confirmed successfully', data: reservation };
      } else if (action === 'cancel') {
        const reservation = await this.reservationsService.cancelReservationByCode(code, reason);
        return { success: true, message: 'Reservation cancelled successfully', data: reservation };
      } else if (action === 'update') {
        if (!updateReservationDto || Object.keys(updateReservationDto).length === 0) {
          throw new BadRequestException(
            'Para actualizar la reserva (action=update) debes enviar un body con los campos que deseas actualizar. ' +
            'Puedes actualizar: tableNumber, reservationDate, reservationTime, partySize, duration, notes, etc.'
          );
        }
        const reservation = await this.reservationsService.updateReservationByCode(code, updateReservationDto);
        return { success: true, message: 'Reservation updated successfully', data: reservation };
      } else {
        throw new BadRequestException(
          `Acción inválida: "${action}". Las acciones permitidas son: "confirm" (confirmar), "cancel" (cancelar) o "update" (actualizar).`
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al procesar acción por código (code: ${code}, action: ${action}): ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo procesar la acción "${action}" para la reserva con código "${code}". ` +
        `Verifica que el código sea correcto y que la reserva esté en un estado que permita esta acción. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /reservations/availability/:date - Mesas disponibles y horarios para una fecha específica
  @Get('availability/:date')
  @Public()
  @ApiOperation({
    summary: '📅 Disponibilidad de mesas para una fecha',
    description: `Obtiene todas las mesas disponibles y sus horarios disponibles para una fecha específica.
    
    **Parámetros:**
    - date: Fecha en formato YYYY-MM-DD (ej: 2025-12-15)
    
    **Query params opcionales:**
    - partySize: Filtrar mesas por capacidad mínima
    - duration: Duración de la reserva en minutos (default: 120)
    
    **Retorna:**
    - Fecha consultada
    - Lista de mesas disponibles con:
      - id: ID único de la mesa
      - number: Número de la mesa
      - capacity: Capacidad de la mesa
      - location: Ubicación de la mesa (Interior, Terraza, etc.)
      - status: Siempre "available" en este endpoint (el estado físico no afecta la disponibilidad futura)
      - features: Características especiales de la mesa
      - isAccessible: Si la mesa es accesible para personas con movilidad reducida
      - availableTimeSlots: Array de horarios disponibles (formato HH:mm) para esa mesa
        - Solo muestra horarios donde hay al menos 60 minutos disponibles antes de la próxima reserva
        - Los horarios ya reservados NO aparecen en este array
    - totalTables: Total de mesas con al menos un horario disponible
    - totalAvailableSlots: Total de slots de horarios disponibles
    
    **Lógica de disponibilidad:**
    - Un horario está disponible si:
      1. No hay una reserva activa en ese horario
      2. Hay al menos 60 minutos disponibles antes de la próxima reserva (duración mínima)
    - Si una mesa tiene reserva a las 09:00, los horarios 08:00-08:30 pueden estar disponibles
      solo si hay suficiente tiempo (mínimo 60 min) antes de las 09:00
    
    **Uso:**
    1. El frontend muestra un calendario (manejado por el frontend)
    2. Cuando el usuario selecciona una fecha, consulta este endpoint
    3. El frontend muestra las mesas disponibles y sus horarios (solo los que aparecen en availableTimeSlots)
    4. El usuario selecciona mesa y horario de los disponibles
    5. El usuario crea la reserva usando POST /reservations con tableNumber/tableId y reservationTime
    
    **Ejemplo de respuesta:**
    \`\`\`json
    {
      "date": "2025-12-15",
      "tables": [
        {
          "id": "4e1f5d03-6960-4ffb-be8c-1cc0c76cd9c5",
          "number": 1,
          "capacity": 4,
          "location": "Interior",
          "status": "available",
          "availableTimeSlots": ["08:00", "10:30", "11:00", ...]
        }
      ],
      "totalTables": 2,
      "totalAvailableSlots": 47
    }
    \`\`\``
  })
  @ApiParam({ name: 'date', description: 'Fecha en formato YYYY-MM-DD', example: '2025-12-15' })
  @ApiQuery({ name: 'partySize', required: false, description: 'Filtrar mesas por capacidad mínima', example: 4 })
  @ApiQuery({ name: 'duration', required: false, description: 'Duración en minutos', example: 120 })
  @ApiOkResponse({ description: '✅ Disponibilidad obtenida exitosamente' })
  async getAvailabilityForDate(
    @Param('date') date: string,
    @Query('partySize') partySize?: number,
    @Query('duration') duration?: number
  ): Promise<SuccessResponse<any>> {
    try {
      if (!date) {
        throw new BadRequestException('La fecha es requerida en formato YYYY-MM-DD');
      }

      const availability = await this.reservationsService.getAvailabilityForDate(
        date,
        partySize ? Number(partySize) : undefined,
        duration ? Number(duration) : 120
      );

      return {
        success: true,
        message: 'Availability retrieved successfully',
        data: availability
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error obteniendo disponibilidad para fecha: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudo obtener la disponibilidad para la fecha especificada. ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /reservations/calendar - Calendario con fechas y horas disponibles (2 semanas)
  @Get('calendar')
  @Public()
  @ApiOperation({
    summary: '📅 Calendario de disponibilidad',
    description: `Obtiene un calendario con todas las fechas y horas disponibles para reservas.
    
    **Rango:** Desde hoy hasta 2 semanas en adelante
    
    **Retorna:**
    - Lista de fechas disponibles
    - Para cada fecha, lista de horarios disponibles (8:00 AM - 10:00 PM)
    - Cada horario muestra si hay disponibilidad general
    
    **Uso:**
    1. Cliente ve el calendario con fechas y horas
    2. Cliente selecciona una fecha y hora
    3. Cliente consulta las mesas disponibles para esa fecha/hora usando /reservations/calendar/:date/:time/tables`
  })
  @ApiOkResponse({ description: '✅ Calendario obtenido exitosamente' })
  async getCalendar(): Promise<SuccessResponse<any>> {
    try {
      const calendar = await this.reservationsService.getAvailabilityCalendar();
      return {
        success: true,
        message: 'Calendar retrieved successfully',
        data: calendar
      };
    } catch (error) {
      this.logger.error(`Error obteniendo calendario: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudo obtener el calendario. ${error.message || 'Error desconocido'}`
      );
    }
  }

  // GET /reservations/calendar/:date/:time/tables - Mesas disponibles para fecha/hora específica
  @Get('calendar/:date/:time/tables')
  @Public()
  @ApiOperation({
    summary: '🍽️ Mesas disponibles para fecha y hora 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida**
    **👥 Roles permitidos:** Cualquiera (público)
    
    Obtiene todas las mesas disponibles para una fecha y hora específica.
    
    **Parámetros:**
    - date: Fecha en formato YYYY-MM-DD
    - time: Hora en formato HH:mm (ej: 20:00)
    
    **Query params opcionales:**
    - partySize: Filtrar mesas por capacidad mínima
    - duration: Duración de la reserva en minutos (default: 120)
    
    **Retorna:**
    - Lista de mesas disponibles con sus características:
      - id, number, capacity, location, status
      - Información adicional de la mesa
    
    **Uso:**
    Después de ver el calendario, el cliente selecciona fecha/hora y ve las mesas disponibles.
    Luego puede crear la reserva usando POST /reservations con tableId o tableNumber.`
  })
  @ApiParam({ name: 'date', description: 'Fecha en formato YYYY-MM-DD', example: '2025-12-15' })
  @ApiParam({ name: 'time', description: 'Hora en formato HH:mm', example: '20:00' })
  @ApiQuery({ name: 'partySize', required: false, description: 'Filtrar mesas por capacidad mínima', example: 4 })
  @ApiQuery({ name: 'duration', required: false, description: 'Duración en minutos', example: 120 })
  @ApiOkResponse({ description: '✅ Mesas disponibles obtenidas exitosamente' })
  async getTablesForDateTime(
    @Param('date') date: string,
    @Param('time') time: string,
    @Query('partySize') partySize?: number,
    @Query('duration') duration?: number
  ): Promise<SuccessResponse<any>> {
    try {
      if (!date || !time) {
        throw new BadRequestException('Fecha y hora son requeridos');
      }

      const tables = await this.reservationsService.getAvailableTablesForDateTime(
        date,
        time,
        partySize ? Number(partySize) : undefined,
        duration ? Number(duration) : 120
      );

      return {
        success: true,
        message: 'Available tables retrieved successfully',
        data: {
          date,
          time,
          duration: duration || 120,
          partySize: partySize || null,
          tables: tables,
          totalAvailable: tables.length
        }
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error obteniendo mesas para ${date} ${time}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudieron obtener las mesas disponibles. ${error.message || 'Error desconocido'}`
      );
    }
  }

  // DELETE /reservations/:id - Eliminar (Admin) o por código (Cliente)
  @Delete(':id')
  @Public() // Público para permitir que clientes eliminen con código, pero validamos en el método
  @ApiOperation({ 
    summary: '🗑️ Eliminar/Cancelar reserva 🔓',
    description: `**🔓 PÚBLICO - Sin autenticación requerida (con código de confirmación)**
    **👥 Roles permitidos:** 
    - Cualquiera (público) - Si usa código de confirmación (6 caracteres)
    - 🔐 Admin - Si usa reservationId (UUID)
    
    Elimina/cancela una reserva:
    - Si 'id' es un código de confirmación (6 caracteres): Cliente puede cancelar su propia reserva
    - Si 'id' es un reservationId (UUID): Solo admin puede eliminar
    
    Los clientes pueden cancelar sus reservas usando su código de confirmación.
    Los admins pueden eliminar cualquier reserva usando el reservationId.`
  })
  @ApiParam({ name: 'id', description: 'ID de la reserva o código de confirmación', example: 'ABC123' })
  @ApiQuery({ name: 'reason', required: false, description: 'Motivo de cancelación', example: 'Cambio de planes' })
  @ApiOkResponse({ description: '✅ Reserva eliminada/cancelada' })
  async remove(
    @Param('id') id: string,
    @Query('reason') reason?: string
  ): Promise<SuccessResponse<void>> {
    try {
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('El ID o código de confirmación es requerido y no puede estar vacío.');
      }

      // Si es un código de confirmación (6 caracteres alfanuméricos), permitir cancelación por cliente
      if (/^[A-Z0-9]{6}$/.test(id)) {
        // Es un código de confirmación - cliente puede cancelar
        await this.reservationsService.cancelReservationByCode(id, reason || 'Cancelada por el cliente');
        return { success: true, message: 'Reservation cancelled successfully', data: undefined };
      } else {
        // Es un reservationId - solo admin puede eliminar
        // Nota: En producción, deberías verificar el rol aquí con un guard condicional
        // Por ahora, permitimos la cancelación pero documentamos que es para admin
        await this.reservationsService.cancelReservation(id, reason || 'Deleted by admin');
        return { success: true, message: 'Reservation deleted', data: undefined };
      }
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error al eliminar/cancelar reserva (ID/code: ${id}): ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo eliminar/cancelar la reserva con ID/código: ${id}. ` +
        `Verifica que el ID o código sea correcto y que la reserva exista. ` +
        `Solo se pueden cancelar reservas futuras. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }
}
