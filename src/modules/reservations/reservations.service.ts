import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Reservation } from '../../common/entities/reservation.entity';
import { 
  CreateReservationDto, 
  UpdateReservationDto, 
  ReservationFilterDto,
  AvailabilityQueryDto,
  CustomerDetailsDto 
} from './dto/reservation.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { ReservationStatus } from '../../common/enums';
import { v4 as uuidv4 } from 'uuid';
import { DateUtils } from '../../common/utils/date.utils';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly reservationsTableName: string;
  private readonly customersTableName: string;
  private readonly tablesTableName: string;

  constructor(private readonly dynamoService: DynamoDBService) {
    this.reservationsTableName = this.dynamoService.getTableName('reservations');
    this.customersTableName = this.dynamoService.getTableName('customers');
    this.tablesTableName = this.dynamoService.getTableName('tables');
    
    // Log del nombre de la tabla al inicializar
    this.logger.log(`📋 Tabla de reservas configurada: ${this.reservationsTableName}`);
  }

  async createReservation(createReservationDto: CreateReservationDto): Promise<Reservation> {
    try {
    // Validar que la fecha esté dentro del rango permitido (hoy hasta 2 semanas)
    if (!DateUtils.isDateInValidRange(createReservationDto.reservationDate)) {
      const today = DateUtils.getCurrentDateStringArgentina();
      const maxDate = DateUtils.getMaxReservationDateString();
      throw new BadRequestException(`La fecha de reserva debe estar entre ${today} y ${maxDate} (máximo 2 semanas desde hoy)`);
    }

    // Validar límite de reservas por cliente
    await this.validateReservationLimits(createReservationDto);

    // Validar duplicados
    await this.validateDuplicateReservation(createReservationDto);

    const reservationId = uuidv4();
    const confirmationCode = this.generateConfirmationCode();

    // Si se especifica tableNumber o tableId, buscar esa mesa específica
    // Si no, buscar automáticamente una mesa disponible
    let assignedTable;
    
    if (createReservationDto.tableNumber || createReservationDto.tableId) {
      // Buscar mesa específica por número o ID
      const allTables = await this.dynamoService.scan(this.tablesTableName);
      let specificTable;
      
      if (createReservationDto.tableId) {
        // Buscar por ID (más preciso)
        specificTable = allTables.items?.find((t: any) => t.id === createReservationDto.tableId);
        if (!specificTable) {
          throw new BadRequestException(`Mesa con ID ${createReservationDto.tableId} no encontrada`);
        }
      } else if (createReservationDto.tableNumber) {
        // Buscar por número
        specificTable = allTables.items?.find((t: any) => t.number === createReservationDto.tableNumber);
        if (!specificTable) {
          throw new BadRequestException(`Mesa número ${createReservationDto.tableNumber} no encontrada`);
        }
      }

      // Verificar capacidad de la mesa
      if (specificTable.capacity < createReservationDto.partySize) {
        const tableIdentifier = createReservationDto.tableNumber 
          ? `número ${createReservationDto.tableNumber}` 
          : `ID ${createReservationDto.tableId}`;
        throw new BadRequestException(
          `La mesa ${tableIdentifier} tiene capacidad para ${specificTable.capacity} personas, pero solicitaste ${createReservationDto.partySize}`
        );
      }

      // Verificar que la mesa esté disponible en el horario solicitado
      const isAvailable = await this.isTableAvailableForReservation(
        specificTable,
        createReservationDto.reservationDate,
        createReservationDto.reservationTime,
        createReservationDto.duration || 120,
        createReservationDto.partySize
      );

      if (!isAvailable) {
        // Verificar si hay una reserva conflictiva para dar un mensaje más específico
        const reservationsResult = await this.dynamoService.scan(
          this.reservationsTableName,
          'reservationDate = :date',
          undefined,
          { ':date': createReservationDto.reservationDate }
        );
        
        const dayReservations = (reservationsResult.items as Reservation[]) || [];
        const conflictingReservation = dayReservations.find(r => 
          r.tableId === specificTable.id &&
          (r.status === ReservationStatus.CONFIRMED || 
           r.status === ReservationStatus.SEATED || 
           r.status === ReservationStatus.PENDING) &&
          !DateUtils.isReservationEnded(r.reservationDate, r.reservationTime, r.duration || 120)
        );

        const tableIdentifier = createReservationDto.tableNumber 
          ? `número ${createReservationDto.tableNumber}` 
          : `ID ${createReservationDto.tableId}`;

        if (conflictingReservation) {
          throw new BadRequestException(
            `La mesa ${tableIdentifier} ya está reservada para el ${createReservationDto.reservationDate} a las ${createReservationDto.reservationTime}. ` +
            `Por favor, selecciona otro horario o mesa.`
          );
        }

        throw new BadRequestException(
          `La mesa ${tableIdentifier} no está disponible para el ${createReservationDto.reservationDate} a las ${createReservationDto.reservationTime}. ` +
          `Por favor, selecciona otro horario o mesa.`
        );
      }

      assignedTable = specificTable;
    } else {
      // Buscar automáticamente una mesa disponible
      assignedTable = await this.findAndAssignAvailableTable({
        date: createReservationDto.reservationDate,
        time: createReservationDto.reservationTime,
        partySize: createReservationDto.partySize,
        duration: createReservationDto.duration || 120,
        preferredSeatingArea: createReservationDto.preferredSeatingArea
      });

      if (!assignedTable) {
        throw new BadRequestException('No hay mesas disponibles para la fecha y hora solicitadas');
      }
    }

    // Asegurar que customerDetails se serialice correctamente
    const customerDetails = createReservationDto.customerDetails ? {
      firstName: createReservationDto.customerDetails.firstName,
      lastName: createReservationDto.customerDetails.lastName,
      email: createReservationDto.customerDetails.email,
      phone: createReservationDto.customerDetails.phone,
    } : undefined;

    const reservation: Reservation = {
      reservationId,
      confirmationCode,
      customerId: createReservationDto.customerId,
      customerDetails: customerDetails,
      tableId: assignedTable.id,
      tableNumber: assignedTable.number,
      partySize: createReservationDto.partySize,
      preferredSeatingArea: createReservationDto.preferredSeatingArea,
      reservationDate: createReservationDto.reservationDate,
      reservationTime: createReservationDto.reservationTime,
      duration: createReservationDto.duration || 120, // 2 horas por defecto
      status: ReservationStatus.CONFIRMED, // Las reservas se crean directamente como confirmadas
      source: createReservationDto.source,
      priority: createReservationDto.priority,
      specialRequests: createReservationDto.specialRequests || [],
      dietaryRestrictions: createReservationDto.dietaryRestrictions || [],
      allergies: createReservationDto.allergies || [],
      estimatedSpend: createReservationDto.estimatedSpend,
      actualSpend: 0,
      remindersSent: [],
      tags: [],
      internalNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system', // TODO: Get from auth context
      updatedBy: 'system'
    };

      await this.dynamoService.put(this.reservationsTableName, reservation);
      
      // Actualizar estado de la mesa a "reserved" y guardar el currentReservationId
      await this.updateTableReservationStatus(assignedTable.id, reservationId, 'reserved');
      
      // Nota: Las reservas se crean directamente como CONFIRMED
      // No se requiere confirmación por código - la reserva está lista para que admin/empleado la vea
      // Los datos del cliente (nombre, email, teléfono) permiten búsqueda rápida por admin/empleado
      
      // Programar recordatorios automáticos (opcional)
      await this.scheduleAutomaticReminders(reservation);
      
      return reservation;
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error creando reserva: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo crear la reserva debido a un error interno. ` +
        `Verifica que todos los datos sean correctos: fecha dentro del rango permitido (hoy hasta 2 semanas), ` +
        `horario entre 8:00-22:00, número de personas entre 1-20, y que no excedas el límite de 2 reservas activas. ` +
        `Detalle técnico: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async findAllReservations(filters: ReservationFilterDto): Promise<PaginatedResponse<Reservation>> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;

      // Construir parámetros de consulta
      let filterExpression = '';
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      if (filters.status) {
        filterExpression += '#status = :status';
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filters.date) {
        filterExpression += filterExpression ? ' AND ' : '';
        filterExpression += 'reservationDate = :date';
        expressionAttributeValues[':date'] = filters.date;
      }

      const result = await this.dynamoService.scan(
        this.reservationsTableName,
        filterExpression || undefined,
        Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
        limit
      );
      
      return new PaginatedResponse(
        result.items as Reservation[],
        page,
        limit,
        result.count || 0
      );
    } catch (error) {
      this.logger.error(`Error obteniendo reservas: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo obtener la lista de reservas. Verifica los filtros aplicados e intenta nuevamente. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async findReservationById(reservationId: string): Promise<Reservation> {
    try {
      const reservation = await this.dynamoService.get(this.reservationsTableName, { reservationId });
      
      if (!reservation) {
        throw new NotFoundException(`Reserva con ID ${reservationId} no encontrada`);
      }
      
      return reservation as Reservation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error obteniendo reserva ${reservationId}: ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo encontrar la reserva con ID: ${reservationId}. Verifica que el ID sea correcto y que la reserva exista en el sistema. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async findReservationByConfirmationCode(confirmationCode: string): Promise<Reservation> {
    try {
      const result = await this.dynamoService.scan(
        this.reservationsTableName,
        'confirmationCode = :code',
        undefined,
        { ':code': confirmationCode },
        1
      );
      
      if (!result.items || result.items.length === 0) {
        throw new NotFoundException(`Reserva con código ${confirmationCode} no encontrada`);
      }
      
      return result.items[0] as Reservation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error obteniendo reserva por código ${confirmationCode}: ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo encontrar la reserva con código de confirmación: ${confirmationCode}. ` +
        `Verifica que el código sea correcto (6 caracteres alfanuméricos) y que la reserva exista en el sistema. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Obtiene reservas por customerId o por teléfono
   */
  async findReservationsByUser(customerId?: string, phone?: string, status?: 'past' | 'upcoming' | 'all'): Promise<Reservation[]> {
    try {
      let reservations: Reservation[] = [];

      if (customerId) {
        const result = await this.dynamoService.scan(
          this.reservationsTableName,
          'customerId = :customerId',
          undefined,
          { ':customerId': customerId }
        );
        reservations = (result.items as Reservation[]) || [];
      } else if (phone) {
        // Buscar por teléfono en customerDetails
        const result = await this.dynamoService.scan(this.reservationsTableName);
        const allReservations = (result.items as Reservation[]) || [];
        
        // Filtrar por teléfono en customerDetails
        reservations = allReservations.filter(reservation => 
          reservation.customerDetails?.phone === phone
        );
      }

      // Filtrar por estado (past/upcoming)
      if (status && status !== 'all') {
        const now = DateUtils.getCurrentDateArgentina();
        reservations = reservations.filter(reservation => {
          const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
          const reservationEnd = new Date(reservationDateTime.getTime() + (reservation.duration || 120) * 60000);
          
          if (status === 'past') {
            return reservationEnd < now;
          } else if (status === 'upcoming') {
            return reservationDateTime > now;
          }
          return true;
        });
      }

      return reservations;
    } catch (error) {
      this.logger.error(`Error obteniendo reservas por usuario: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudieron obtener las reservas del usuario. Verifica que el customerId o teléfono sean correctos. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Cancela una reserva usando el código de confirmación (público, para clientes)
   */
  async cancelReservationByCode(confirmationCode: string, reason?: string): Promise<Reservation> {
    try {
      const reservation = await this.findReservationByConfirmationCode(confirmationCode);
      
      // Verificar que la reserva no esté ya cancelada
      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('La reserva ya está cancelada');
      }

      // Verificar que la reserva no haya pasado (solo se pueden cancelar reservas futuras)
      const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
      const now = DateUtils.getCurrentDateArgentina();
      
      if (reservationDateTime < now) {
        throw new BadRequestException('No se pueden cancelar reservas pasadas');
      }

      return await this.cancelReservation(reservation.reservationId, reason || 'Cancelada por el cliente');
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error cancelando reserva por código ${confirmationCode}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo cancelar la reserva con código ${confirmationCode}. ` +
        `Verifica que el código sea correcto y que la reserva esté en un estado que permita cancelación (solo reservas futuras). ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Confirma una reserva usando el código de confirmación (público, para clientes)
   */
  async confirmReservationByCode(confirmationCode: string): Promise<Reservation> {
    try {
      const reservation = await this.findReservationByConfirmationCode(confirmationCode);
      
      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('No se puede confirmar una reserva cancelada');
      }

      if (reservation.status === ReservationStatus.CONFIRMED) {
        return reservation; // Ya está confirmada
      }

      return await this.confirmReservation(reservation.reservationId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error confirmando reserva por código ${confirmationCode}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo confirmar la reserva con código ${confirmationCode}. ` +
        `Verifica que el código sea correcto y que la reserva no esté cancelada. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Actualiza una reserva usando el código de confirmación (público, para clientes)
   * Permite cambiar mesa, horario, fecha, número de personas, etc.
   */
  async updateReservationByCode(confirmationCode: string, updateReservationDto: UpdateReservationDto): Promise<Reservation> {
    try {
      const reservation = await this.findReservationByConfirmationCode(confirmationCode);
      
      // Verificar que la reserva no esté cancelada o completada
      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('No se puede actualizar una reserva cancelada');
      }

      if (reservation.status === ReservationStatus.COMPLETED) {
        throw new BadRequestException('No se puede actualizar una reserva completada');
      }

      // Verificar que la reserva no haya pasado (solo se pueden actualizar reservas futuras)
      const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
      const now = DateUtils.getCurrentDateArgentina();
      
      if (reservationDateTime < now) {
        throw new BadRequestException('No se pueden actualizar reservas pasadas. Solo se pueden modificar reservas futuras.');
      }

      // Verificar que si se está cambiando a una fecha pasada, rechazar
      if (updateReservationDto.reservationDate) {
        const newDate = new Date(`${updateReservationDto.reservationDate}T${updateReservationDto.reservationTime || reservation.reservationTime}`);
        if (newDate < now) {
          throw new BadRequestException('No se puede cambiar la reserva a una fecha/hora pasada');
        }
      } else if (updateReservationDto.reservationTime) {
        const newDateTime = new Date(`${reservation.reservationDate}T${updateReservationDto.reservationTime}`);
        if (newDateTime < now) {
          throw new BadRequestException('No se puede cambiar la reserva a un horario pasado');
        }
      }

      // Si cambia la fecha, hora, mesa o número de personas, validar límites y disponibilidad
      const dateChanged = updateReservationDto.reservationDate && updateReservationDto.reservationDate !== reservation.reservationDate;
      const timeChanged = updateReservationDto.reservationTime && updateReservationDto.reservationTime !== reservation.reservationTime;
      const tableChanged = updateReservationDto.tableNumber && updateReservationDto.tableNumber !== reservation.tableNumber;
      const partySizeChanged = updateReservationDto.partySize && updateReservationDto.partySize !== reservation.partySize;

      if (dateChanged || timeChanged || tableChanged || partySizeChanged) {
        // Validar límites de reservas (excluyendo esta reserva)
        const phone = reservation.customerDetails?.phone;
        const customerId = reservation.customerId;
        const newDate = updateReservationDto.reservationDate || reservation.reservationDate;
        const newTime = updateReservationDto.reservationTime || reservation.reservationTime;

        // Buscar reservas activas del cliente (excluyendo esta)
        const existingReservations = await this.findReservationsByUser(customerId, phone, 'upcoming');
        const activeReservations = existingReservations.filter(r => 
          r.reservationId !== reservation.reservationId && // Excluir esta reserva
          r.status !== ReservationStatus.CANCELLED &&
          r.status !== ReservationStatus.COMPLETED &&
          r.status !== ReservationStatus.NO_SHOW
        );

        // Validar máximo 2 reservas activas en total (ya tenemos 1, así que solo puede tener 1 más)
        // Pero como estamos actualizando esta, el límite ya está respetado
        // Solo validamos que no tenga más de 2 en total incluyendo esta
        if (activeReservations.length >= 2) {
          throw new BadRequestException('Máximo 2 reservas activas por cliente. Ya tienes 2 reservas activas. Cancela una antes de crear otra.');
        }

        // Validar que no exceda el límite de reservas por día (excluyendo esta)
        const sameDateReservations = activeReservations.filter(r => 
          r.reservationDate === newDate
        );

        if (sameDateReservations.length >= 1) {
          throw new BadRequestException('Ya tienes otra reserva activa para esta fecha. Máximo 1 reserva por día.');
        }

        // Validar duplicado (misma fecha y hora, excluyendo esta reserva)
        const duplicate = activeReservations.find(r => 
          r.reservationDate === newDate &&
          r.reservationTime === newTime
        );

        if (duplicate) {
          throw new BadRequestException('Ya tienes otra reserva para esta fecha y hora');
        }
      }

      // Actualizar la reserva (el método updateReservation ya maneja la liberación y reasignación de mesas)
      return await this.updateReservation(reservation.reservationId, updateReservationDto);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error actualizando reserva por código ${confirmationCode}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo actualizar la reserva con código ${confirmationCode}. ` +
        `Verifica que el código sea correcto, que la reserva esté en un estado que permita actualización (solo reservas futuras), ` +
        `y que los nuevos datos (mesa, fecha, horario) estén disponibles. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Valida límites de reservas por cliente
   */
  private async validateReservationLimits(createReservationDto: CreateReservationDto): Promise<void> {
    const phone = createReservationDto.customerDetails?.phone;
    const customerId = createReservationDto.customerId;
    const reservationDate = createReservationDto.reservationDate;

    if (!phone && !customerId) {
      return; // No se puede validar sin identificador
    }

    // Buscar reservas activas del cliente (solo futuras)
    const existingReservations = await this.findReservationsByUser(customerId, phone, 'upcoming');
    
    // Filtrar solo reservas activas (no canceladas, completadas o no-show)
    const activeReservations = existingReservations.filter(r => 
      r.status !== ReservationStatus.CANCELLED &&
      r.status !== ReservationStatus.COMPLETED &&
      r.status !== ReservationStatus.NO_SHOW
    );

    // Validar máximo 2 reservas activas en total
    if (activeReservations.length >= 2) {
      throw new BadRequestException('Máximo 2 reservas activas por cliente. Ya tienes 2 reservas activas. Cancela una antes de crear otra.');
    }

    // Contar reservas en la misma fecha
    const sameDateReservations = activeReservations.filter(r => 
      r.reservationDate === reservationDate
    );

    if (sameDateReservations.length >= 1) {
      throw new BadRequestException('Ya tienes una reserva activa para esta fecha. Máximo 1 reserva por día.');
    }
  }

  /**
   * Valida duplicados de reserva
   */
  private async validateDuplicateReservation(createReservationDto: CreateReservationDto): Promise<void> {
    const phone = createReservationDto.customerDetails?.phone;
    const customerId = createReservationDto.customerId;
    const reservationDate = createReservationDto.reservationDate;
    const reservationTime = createReservationDto.reservationTime;

    if (!phone && !customerId) {
      return;
    }

    // Buscar reservas existentes
    const existingReservations = await this.findReservationsByUser(customerId, phone, 'upcoming');
    
    // Verificar duplicado exacto (misma fecha, hora y cliente)
    const duplicate = existingReservations.find(r => 
      r.reservationDate === reservationDate &&
      r.reservationTime === reservationTime &&
      r.status !== ReservationStatus.CANCELLED &&
      r.status !== ReservationStatus.COMPLETED &&
      r.status !== ReservationStatus.NO_SHOW
    );

    if (duplicate) {
      throw new BadRequestException('Ya tienes una reserva para esta fecha y hora');
    }
  }

  async updateReservation(reservationId: string, updateReservationDto: UpdateReservationDto): Promise<Reservation> {
    try {
      const reservation = await this.findReservationById(reservationId);
      
      // Verificar que la reserva no esté cancelada o completada (a menos que sea admin cambiando estado)
      if (reservation.status === ReservationStatus.CANCELLED && !updateReservationDto.status) {
        throw new BadRequestException('No se puede actualizar una reserva cancelada');
      }

      if (reservation.status === ReservationStatus.COMPLETED && !updateReservationDto.status) {
        throw new BadRequestException('No se puede actualizar una reserva completada');
      }

      const oldTableId = reservation.tableId;
      let newTableId = oldTableId;

      // Si cambia la fecha, validar que esté dentro del rango permitido
      if (updateReservationDto.reservationDate) {
        if (!DateUtils.isDateInValidRange(updateReservationDto.reservationDate)) {
          const today = DateUtils.getCurrentDateStringArgentina();
          const maxDate = DateUtils.getMaxReservationDateString();
          throw new BadRequestException(`La fecha de reserva debe estar entre ${today} y ${maxDate} (máximo 2 semanas desde hoy)`);
        }
      }

      // Si cambia la fecha, hora o mesa, verificar disponibilidad y reasignar mesa
      const dateChanged = updateReservationDto.reservationDate && updateReservationDto.reservationDate !== reservation.reservationDate;
      const timeChanged = updateReservationDto.reservationTime && updateReservationDto.reservationTime !== reservation.reservationTime;
      const tableChanged = updateReservationDto.tableNumber && updateReservationDto.tableNumber !== reservation.tableNumber;
      const partySizeChanged = updateReservationDto.partySize && updateReservationDto.partySize !== reservation.partySize;

      if (dateChanged || timeChanged || tableChanged || partySizeChanged) {
        // Liberar mesas de reservas que ya terminaron
        await this.releaseExpiredReservations();
        
        // Liberar la mesa anterior si existe
        if (oldTableId) {
          await this.updateTableReservationStatus(oldTableId, null, 'available');
        }

        // Buscar nueva mesa disponible
        const assignedTable = await this.findAndAssignAvailableTable({
          date: updateReservationDto.reservationDate || reservation.reservationDate,
          time: updateReservationDto.reservationTime || reservation.reservationTime,
          partySize: updateReservationDto.partySize || reservation.partySize,
          duration: updateReservationDto.duration || reservation.duration || 120,
          preferredSeatingArea: updateReservationDto.preferredSeatingArea || reservation.preferredSeatingArea,
          tableNumber: updateReservationDto.tableNumber,
          excludeReservationId: reservationId // Excluir esta reserva de la verificación
        });

        if (!assignedTable) {
          throw new BadRequestException('No hay mesas disponibles para la nueva fecha y hora solicitadas');
        }

        newTableId = assignedTable.id;
        // Actualizar la mesa a reserved
        await this.updateTableReservationStatus(newTableId, reservationId, 'reserved');
      }

      const updatedReservation = {
        ...reservation,
        ...updateReservationDto,
        tableId: newTableId,
        tableNumber: newTableId ? (await this.findTableById(newTableId)).number : reservation.tableNumber,
        internalNotes: Array.isArray(updateReservationDto.internalNotes) 
          ? updateReservationDto.internalNotes 
          : reservation.internalNotes,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      };

      await this.dynamoService.put(this.reservationsTableName, updatedReservation);
      
      return updatedReservation;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error actualizando reserva ${reservationId}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo actualizar la reserva con ID: ${reservationId}. ` +
        `Verifica que la reserva exista y que los datos enviados sean válidos. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async cancelReservation(reservationId: string, cancellationReason?: string): Promise<Reservation> {
    try {
      const reservation = await this.findReservationById(reservationId);

      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('La reserva ya está cancelada');
      }

      const updatedReservation = {
        ...reservation,
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date().toISOString(),
        cancellationReason,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system' // TODO: Get from auth context
      };

      await this.dynamoService.put(this.reservationsTableName, updatedReservation);
      
      // Liberar la mesa asignada
      if (reservation.tableId) {
        await this.updateTableReservationStatus(reservation.tableId, null, 'available');
      }
      
      // TODO: Send cancellation notification
      await this.scheduleCancellationNotification(reservation);
      
      return updatedReservation;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error cancelando reserva ${reservationId}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo cancelar la reserva con ID: ${reservationId}. ` +
        `Verifica que la reserva exista y que esté en un estado que permita cancelación. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async confirmReservation(reservationId: string): Promise<Reservation> {
    try {
      const reservation = await this.findReservationById(reservationId);

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException('Solo se pueden confirmar reservas pendientes');
      }

      const updatedReservation = {
        ...reservation,
        status: ReservationStatus.CONFIRMED,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system' // TODO: Get from auth context
      };

      await this.dynamoService.put(this.reservationsTableName, updatedReservation);
      
      return updatedReservation;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error confirmando reserva ${reservationId}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo confirmar la reserva con ID: ${reservationId}. ` +
        `Verifica que la reserva exista y que esté en estado "pending". Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async seatReservation(reservationId: string, tableId: string): Promise<Reservation> {
    try {
      const reservation = await this.findReservationById(reservationId);

      if (reservation.status !== ReservationStatus.CONFIRMED && reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException('Solo se pueden sentar reservas confirmadas o pendientes');
      }

      // Verificar que la mesa esté disponible o reservada para esta reserva
      const table = await this.findTableById(tableId);
      if (!table) {
        throw new BadRequestException('La mesa no existe');
      }

      // Si la mesa está reservada, debe ser para esta reserva
      if (table.status === 'reserved' && table.currentReservationId !== reservationId) {
        throw new BadRequestException('La mesa está reservada para otra reserva');
      }

      // Si la mesa está ocupada, no se puede usar
      if (table.status === 'occupied') {
        throw new BadRequestException('La mesa está ocupada');
      }

      // Si la reserva ya tenía otra mesa asignada, liberarla
      if (reservation.tableId && reservation.tableId !== tableId) {
        await this.updateTableReservationStatus(reservation.tableId, null, 'available');
      }

      const updatedReservation = {
        ...reservation,
        status: ReservationStatus.SEATED,
        tableId,
        tableNumber: table.number,
        seatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'system' // TODO: Get from auth context
      };

      await this.dynamoService.put(this.reservationsTableName, updatedReservation);
      
      // Actualizar estado de la mesa a "occupied" cuando se sientan los clientes
      await this.updateTableReservationStatus(tableId, reservationId, 'occupied');
      
      return updatedReservation;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error asignando mesa a reserva ${reservationId}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo asignar la mesa a la reserva con ID: ${reservationId}. ` +
        `Verifica que la reserva exista, que la mesa esté disponible y que la capacidad sea suficiente. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async completeReservation(reservationId: string, actualSpend?: number): Promise<Reservation> {
    try {
      const reservation = await this.findReservationById(reservationId);

      const updatedReservation = {
        ...reservation,
        status: ReservationStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        actualSpend: actualSpend || 0,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system' // TODO: Get from auth context
      };

      await this.dynamoService.put(this.reservationsTableName, updatedReservation);
      
      // Liberar la mesa cuando se completa la reserva
      if (reservation.tableId) {
        await this.updateTableReservationStatus(reservation.tableId, null, 'available');
      }
      
      // TODO: Update customer statistics
      await this.updateCustomerStatistics(reservation.customerId, actualSpend || 0);
      
      // TODO: Schedule follow-up
      await this.scheduleFollowUp(reservation);
      
      return updatedReservation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error completando reserva ${reservationId}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo completar la reserva con ID: ${reservationId}. ` +
        `Verifica que la reserva exista y que esté en un estado que permita completarla. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async markAsNoShow(reservationId: string): Promise<Reservation> {
    try {
      const reservation = await this.findReservationById(reservationId);

      const updatedReservation = {
        ...reservation,
        status: ReservationStatus.NO_SHOW,
        noShowAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'system' // TODO: Get from auth context
      };

      await this.dynamoService.put(this.reservationsTableName, updatedReservation);
      
      // Liberar la mesa cuando se marca como no-show
      if (reservation.tableId) {
        await this.updateTableReservationStatus(reservation.tableId, null, 'available');
      }
      
      return updatedReservation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error marcando reserva ${reservationId} como no-show: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo marcar la reserva con ID: ${reservationId} como no-show. ` +
        `Verifica que la reserva exista. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  private async checkAvailabilityInternal(query: AvailabilityQueryDto, excludeReservationId?: string): Promise<boolean> {
    // Liberar mesas de reservas que ya terminaron
    await this.releaseExpiredReservations();

    if (!query.time) {
      // Si no hay time, solo verificamos capacidad total del día
      const availableTables = await this.getAvailableTables(query.date);
      const totalCapacity = availableTables.reduce((sum, table) => sum + table.capacity, 0);
      return totalCapacity >= query.partySize;
    }

    const result = await this.dynamoService.scan(
      this.reservationsTableName,
      'reservationDate = :date AND #status IN (:confirmed, :seated, :pending)',
      { '#status': 'status' },
      { 
        ':date': query.date,
        ':confirmed': ReservationStatus.CONFIRMED,
        ':seated': ReservationStatus.SEATED,
        ':pending': ReservationStatus.PENDING
      }
    );

    const reservations = result.items as Reservation[];

    // Calcular capacidad disponible
    const availableTables = await this.getAvailableTables(query.date);
    let totalCapacity = availableTables.reduce((sum, table) => sum + table.capacity, 0);

    // Restar capacidad ocupada por otras reservas en la misma fecha/hora
    for (const reservation of reservations) {
      if (excludeReservationId && reservation.reservationId === excludeReservationId) {
        continue;
      }

      // Si la reserva ya terminó, no cuenta
      if (DateUtils.isReservationEnded(
        reservation.reservationDate,
        reservation.reservationTime,
        reservation.duration || 120
      )) {
        continue;
      }

      // Verificar solapamiento de horarios
      const resStart = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
      const resEnd = new Date(resStart.getTime() + (reservation.duration || 120) * 60000);
      
      const queryStart = new Date(`${query.date}T${query.time}`);
      const queryEnd = new Date(queryStart.getTime() + (query.duration || 120) * 60000);

      if (queryStart < resEnd && queryEnd > resStart) {
        totalCapacity -= reservation.partySize;
      }
    }

    return totalCapacity >= query.partySize;
  }

  async checkAvailability(query: AvailabilityQueryDto, excludeReservationId?: string): Promise<{ available: boolean; alternatives: string[] }> {
    try {
      // Liberar mesas de reservas que ya terminaron
      await this.releaseExpiredReservations();

      const available = await this.checkAvailabilityInternal(query, excludeReservationId);
      const alternatives: string[] = [];

      // Si no hay disponibilidad, buscar alternativas cercanas
      if (!available && query.time) {
        const operatingHours = { start: '08:00', end: '22:00' };
        const requestedTime = new Date(`${query.date}T${query.time}`);
        const startTime = new Date(`${query.date}T${operatingHours.start}`);
        const endTime = new Date(`${query.date}T${operatingHours.end}`);

        // Buscar slots disponibles antes y después del horario solicitado
        for (let offset = -60; offset <= 120 && alternatives.length < 3; offset += 30) {
          const alternativeTime = new Date(requestedTime.getTime() + offset * 60000);
          
          if (alternativeTime >= startTime && alternativeTime <= endTime) {
            const timeString = alternativeTime.toTimeString().substring(0, 5);
            const isAltAvailable = await this.checkAvailabilityInternal({
              ...query,
              time: timeString
            }, excludeReservationId);

            if (isAltAvailable && timeString !== query.time) {
              alternatives.push(timeString);
            }
          }
        }
      }

      return { available, alternatives };
    } catch (error) {
      this.logger.error(`Error verificando disponibilidad: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo verificar la disponibilidad. Verifica que la fecha, hora y número de personas sean correctos. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  private async getAvailableTables(date: string): Promise<any[]> {
    const result = await this.dynamoService.scan(
      this.tablesTableName,
      '#status = :status',
      { '#status': 'status' },
      { ':status': 'available' }
    );

    return result.items || [];
  }

  async getTodaysReservations(): Promise<Reservation[]> {
    // Liberar mesas de reservas que ya terminaron
    await this.releaseExpiredReservations();
    
    const today = DateUtils.getCurrentDateStringArgentina();
    
    const result = await this.dynamoService.scan(
      this.reservationsTableName,
      'reservationDate = :today',
      undefined,
      { ':today': today }
    );
    
    return (result.items as Reservation[]).sort((a, b) => 
      a.reservationTime.localeCompare(b.reservationTime)
    );
  }

  async getUpcomingReservations(days: number = 7): Promise<Reservation[]> {
    // Liberar mesas de reservas que ya terminaron
    await this.releaseExpiredReservations();
    
    const today = DateUtils.getCurrentDateStringArgentina();
    const todayDate = DateUtils.getCurrentDateArgentina();
    const futureDate = new Date(todayDate.getTime() + days * 24 * 60 * 60 * 1000);
    
    const result = await this.dynamoService.scan(
      this.reservationsTableName,
      'reservationDate BETWEEN :start AND :end',
      undefined,
      {
        ':start': today,
        ':end': futureDate.toISOString().split('T')[0]
      }
    );
    
    return result.items as Reservation[];
  }

  async getAvailableTimeSlots(date: string, partySize: number, preferredSeatingArea?: string): Promise<string[]> {
    // Horarios de operación del restaurante (8:00 AM a 22:00 PM)
    const operatingHours = {
      start: '08:00',
      end: '22:00'
    };

    // Generar slots de 30 minutos
    const timeSlots = [];
    const startTime = new Date(`${date}T${operatingHours.start}`);
    const endTime = new Date(`${date}T${operatingHours.end}`);

    while (startTime < endTime) {
      const timeString = startTime.toTimeString().substring(0, 5);
      
      // Verificar disponibilidad para este slot
      const isAvailable = await this.checkAvailabilityInternal({
        date,
        time: timeString,
        partySize,
        duration: 120
      });

      if (isAvailable) {
        timeSlots.push(timeString);
      }

      startTime.setMinutes(startTime.getMinutes() + 30);
    }

    return timeSlots;
  }

  /**
   * Obtiene todas las mesas disponibles con sus horarios disponibles para una fecha específica
   */
  async getAvailableTablesWithTimeSlots(
    date: string,
    partySize: number,
    duration: number = 120,
    preferredSeatingArea?: string
  ): Promise<any[]> {
    try {
      // Validar que la fecha esté dentro del rango permitido
      if (!DateUtils.isDateInValidRange(date)) {
        const today = DateUtils.getCurrentDateStringArgentina();
        const maxDate = DateUtils.getMaxReservationDateString();
        throw new BadRequestException(`La fecha debe estar entre ${today} y ${maxDate} (máximo 2 semanas desde hoy)`);
      }

      // Liberar mesas de reservas que ya terminaron
      await this.releaseExpiredReservations();

      // Horarios de operación del restaurante (8:00 AM a 22:00 PM)
      const operatingHours = {
        start: '08:00',
        end: '22:00'
      };

      // Obtener todas las mesas
      const allTablesResult = await this.dynamoService.scan(this.tablesTableName);
      const allTables = allTablesResult.items || [];

      // Filtrar mesas que cumplan con los requisitos básicos
      let candidateTables = allTables.filter((table: any) => {
        // Filtrar por capacidad
        if (table.capacity < partySize) {
          return false;
        }

        // Filtrar por área preferida si se especifica
        if (preferredSeatingArea) {
          const tableLocation = table.location?.toLowerCase() || '';
          const preferredArea = preferredSeatingArea.toLowerCase();
          if (!tableLocation.includes(preferredArea)) {
            return false;
          }
        }

        // Excluir mesas fuera de servicio o en mantenimiento
        if (table.status === 'out_of_service' || table.status === 'cleaning') {
          return false;
        }

        return true;
      });

      // Ordenar por capacidad (preferir mesas con capacidad más cercana al partySize)
      candidateTables.sort((a: any, b: any) => {
        const diffA = Math.abs(a.capacity - partySize);
        const diffB = Math.abs(b.capacity - partySize);
        return diffA - diffB;
      });

      // Para cada mesa, calcular sus horarios disponibles
      const tablesWithSlots = await Promise.all(
        candidateTables.map(async (table: any) => {
          const availableTimeSlots: string[] = [];
          const startTime = new Date(`${date}T${operatingHours.start}`);
          const endTime = new Date(`${date}T${operatingHours.end}`);

          // Generar slots de 30 minutos
          const tempTime = new Date(startTime);
          while (tempTime < endTime) {
            const timeString = tempTime.toTimeString().substring(0, 5);
            
            // Verificar si esta mesa está disponible en este horario
            const isAvailable = await this.isTableAvailableForReservation(
              table,
              date,
              timeString,
              duration,
              partySize
            );

            if (isAvailable) {
              availableTimeSlots.push(timeString);
            }

            tempTime.setMinutes(tempTime.getMinutes() + 30);
          }

          return {
            id: table.id,
            number: table.number,
            capacity: table.capacity,
            location: table.location || 'Interior',
            status: table.status,
            amenities: table.amenities || [],
            availableTimeSlots,
            availableSlotsCount: availableTimeSlots.length
          };
        })
      );

      // Filtrar mesas que tengan al menos un horario disponible
      return tablesWithSlots.filter((table: any) => table.availableSlotsCount > 0);
    } catch (error) {
      this.logger.error(`Error obteniendo mesas con horarios disponibles: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudieron obtener las mesas disponibles. Verifica que la fecha y número de personas sean correctos. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  private async findCustomerByPhone(phone: string): Promise<any> {
    const result = await this.dynamoService.scan(
      this.customersTableName,
      'phone = :phone',
      undefined,
      { ':phone': phone },
      1
    );
    
    return result.items && result.items.length > 0 ? result.items[0] : null;
  }

  private async findTableById(tableId: string): Promise<any> {
    try {
      return await this.dynamoService.get(this.tablesTableName, { id: tableId });
    } catch (error) {
      this.logger.error(`Error obteniendo mesa ${tableId}: ${error.message}`, error.stack);
      throw new NotFoundException(
        `No se pudo encontrar la mesa. Verifica que el ID de la mesa sea correcto. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Verifica si una mesa específica está disponible para un día y hora determinados
   * @param tableId - ID de la mesa (opcional si se proporciona tableNumber)
   * @param tableNumber - Número de la mesa (opcional si se proporciona tableId)
   * @param date - Fecha en formato YYYY-MM-DD
   * @param time - Hora en formato HH:mm
   * @param partySize - Número de personas
   * @param duration - Duración en minutos (default: 120)
   * @returns Información sobre la disponibilidad de la mesa
   */
  async checkTableAvailability(
    tableId?: string,
    tableNumber?: number,
    date?: string,
    time?: string,
    partySize?: number,
    duration: number = 120
  ): Promise<{
    available: boolean;
    table: any;
    request: {
      date: string | null;
      time: string | null;
      partySize: number | null;
      duration: number;
    };
    reason?: string | null;
    conflictingReservations: any[];
    error?: string | null;
  }> {
    // Validar parámetros básicos primero - SIEMPRE retornar respuesta completa
    if (!tableId && !tableNumber) {
      return {
        available: false,
        table: null,
        request: {
          date: date || null,
          time: time || null,
          partySize: partySize || null,
          duration: duration || 120
        },
        reason: 'Debes proporcionar tableId o tableNumber',
        error: 'MISSING_TABLE_IDENTIFIER',
        conflictingReservations: []
      };
    }

    if (!date) {
      return {
        available: false,
        table: null,
        request: {
          date: null,
          time: time || null,
          partySize: partySize || null,
          duration: duration || 120
        },
        reason: 'La fecha (date) es requerida en formato YYYY-MM-DD',
        error: 'MISSING_DATE',
        conflictingReservations: []
      };
    }

    if (!time) {
      return {
        available: false,
        table: null,
        request: {
          date: date || null,
          time: null,
          partySize: partySize || null,
          duration: duration || 120
        },
        reason: 'La hora (time) es requerida en formato HH:mm',
        error: 'MISSING_TIME',
        conflictingReservations: []
      };
    }

    if (!partySize || partySize < 1) {
      return {
        available: false,
        table: null,
        request: {
          date: date || null,
          time: time || null,
          partySize: null,
          duration: duration || 120
        },
        reason: 'El número de personas (partySize) es requerido y debe ser mayor a 0',
        error: 'INVALID_PARTY_SIZE',
        conflictingReservations: []
      };
    }

    try {
      // Obtener la mesa con timeout implícito
      let table: any = null;
      
      try {
        if (tableId) {
          table = await this.findTableById(tableId);
        } else if (tableNumber) {
          const allTablesResult = await this.dynamoService.scan(this.tablesTableName);
          const allTables = (allTablesResult.items || []) as any[];
          table = allTables.find(t => t.number === tableNumber);
          if (!table) {
            return {
              available: false,
              table: null,
              request: {
                date: date,
                time: time,
                partySize: partySize,
                duration: duration
              },
              reason: `Mesa número ${tableNumber} no encontrada`,
              error: 'TABLE_NOT_FOUND',
              conflictingReservations: []
            };
          }
        }
      } catch (tableError) {
        return {
          available: false,
          table: null,
          request: {
            date: date,
            time: time,
            partySize: partySize,
            duration: duration
          },
          reason: `Error al obtener la mesa: ${tableError.message}`,
          error: 'TABLE_FETCH_ERROR',
          conflictingReservations: []
        };
      }

      if (!table) {
        return {
          available: false,
          table: null,
          request: {
            date: date,
            time: time,
            partySize: partySize,
            duration: duration
          },
          reason: 'No se pudo obtener la información de la mesa',
          error: 'TABLE_NOT_FOUND',
          conflictingReservations: []
        };
      }

      // Verificar disponibilidad básica primero (sin consultar reservas)
      if (table.capacity < partySize) {
        return {
          available: false,
          table: {
            id: table.id,
            number: table.number || table.tableNumber,
            capacity: table.capacity,
            location: table.location || null,
            status: table.status
          },
          request: {
            date: date,
            time: time,
            partySize: partySize,
            duration: duration
          },
          reason: `La mesa tiene capacidad para ${table.capacity} personas, pero se requieren ${partySize}`,
          error: 'INSUFFICIENT_CAPACITY',
          conflictingReservations: []
        };
      }

      if (table.status === 'out_of_service' || table.status === 'cleaning') {
        return {
          available: false,
          table: {
            id: table.id,
            number: table.number || table.tableNumber,
            capacity: table.capacity,
            location: table.location || null,
            status: table.status
          },
          request: {
            date: date,
            time: time,
            partySize: partySize,
            duration: duration
          },
          reason: `La mesa está ${table.status === 'out_of_service' ? 'fuera de servicio' : 'en limpieza'}`,
          error: 'TABLE_UNAVAILABLE',
          conflictingReservations: []
        };
      }

      if (table.status === 'occupied') {
        return {
          available: false,
          table: {
            id: table.id,
            number: table.number || table.tableNumber,
            capacity: table.capacity,
            location: table.location || null,
            status: table.status
          },
          request: {
            date: date,
            time: time,
            partySize: partySize,
            duration: duration
          },
          reason: 'La mesa está ocupada actualmente',
          error: 'TABLE_OCCUPIED',
          conflictingReservations: []
        };
      }

      // Verificar disponibilidad de horario (con timeout y manejo de errores)
      let isAvailable = true;
      let conflictingReservations: any[] = [];
      let reason: string | undefined;

      try {
        // Intentar verificar con timeout implícito
        const checkPromise = this.isTableAvailableForReservation(
          table,
          date,
          time,
          duration,
          partySize
        );
        
        // Timeout de 5 segundos
        const timeoutPromise = new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout verificando disponibilidad')), 5000)
        );

        isAvailable = await Promise.race([checkPromise, timeoutPromise]);
      } catch (availabilityError) {
        // Si falla la verificación, asumir disponible pero con advertencia
        this.logger.warn(`Error verificando disponibilidad, asumiendo disponible: ${availabilityError.message}`);
        isAvailable = true; // Por defecto, asumir disponible si hay error
        reason = 'No se pudo verificar completamente la disponibilidad debido a un error técnico';
      }

      // Si no está disponible, buscar reservas conflictivas (opcional, no bloquea)
      if (!isAvailable) {
        try {
          const reservations = await Promise.race([
            this.dynamoService.scan(
              this.reservationsTableName,
              'reservationDate = :date',
              undefined,
              { ':date': date }
            ),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            )
          ]);

          const allReservations = (reservations.items as Reservation[]) || [];
          const reservationStart = new Date(`${date}T${time}`);
          const reservationEnd = new Date(reservationStart.getTime() + duration * 60000);

          conflictingReservations = allReservations.filter(reservation => {
            if (reservation.tableId !== table.id) return false;
            if (reservation.status !== ReservationStatus.CONFIRMED &&
                reservation.status !== ReservationStatus.SEATED &&
                reservation.status !== ReservationStatus.PENDING) {
              return false;
            }
            if (DateUtils.isReservationEnded(
              reservation.reservationDate,
              reservation.reservationTime,
              reservation.duration || 120
            )) {
              return false;
            }
            const resStart = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
            const resEnd = new Date(resStart.getTime() + (reservation.duration || 120) * 60000);
            return reservationStart < resEnd && reservationEnd > resStart;
          });

          if (conflictingReservations.length > 0) {
            reason = `La mesa tiene ${conflictingReservations.length} reserva(s) conflictiva(s) en ese horario`;
          }
        } catch (scanError) {
          // Si falla el scan, no es crítico, solo no mostramos conflictos
          this.logger.warn(`Error obteniendo reservas conflictivas: ${scanError.message}`);
        }
      }

      // SIEMPRE retornar respuesta completa
      const response = {
        available: isAvailable,
        table: {
          id: table.id,
          number: table.number || table.tableNumber,
          capacity: table.capacity,
          location: table.location || null,
          status: table.status
        },
        request: {
          date: date,
          time: time,
          partySize: partySize,
          duration: duration
        },
        reason: reason || (isAvailable ? null : 'Mesa no disponible para el horario solicitado'),
        conflictingReservations: conflictingReservations.length > 0 ? conflictingReservations.map(r => ({
          reservationId: r.reservationId,
          date: r.reservationDate,
          time: r.reservationTime,
          duration: r.duration || 120,
          partySize: r.partySize,
          status: r.status
        })) : []
      };
      
      this.logger.log(`checkTableAvailability retornando: ${JSON.stringify(response)}`);
      return response;

    } catch (error) {
      // SIEMPRE retornar respuesta, incluso en caso de error
      this.logger.error(`Error verificando disponibilidad de mesa: ${error.message}`, error.stack);
      const errorResponse = {
        available: false,
        table: null,
        request: {
          date: date || null,
          time: time || null,
          partySize: partySize || null,
          duration: duration || 120
        },
        reason: `Error al verificar disponibilidad: ${error.message || 'Error desconocido'}`,
        error: 'INTERNAL_ERROR',
        conflictingReservations: []
      };
      this.logger.log(`checkTableAvailability retornando error: ${JSON.stringify(errorResponse)}`);
      return errorResponse;
    }
  }

  /**
   * Busca y asigna una mesa disponible considerando capacidad, área preferida y horarios
   */
  private async findAndAssignAvailableTable(params: {
    date: string;
    time: string;
    partySize: number;
    duration: number;
    preferredSeatingArea?: string;
    tableNumber?: number;
    excludeReservationId?: string;
  }): Promise<any | null> {
    try {
      // Si se especifica un número de mesa, buscar esa mesa específica
      if (params.tableNumber) {
        const allTables = await this.dynamoService.scan(this.tablesTableName);
        const specificTable = allTables.items?.find((t: any) => t.number === params.tableNumber);
        
        if (specificTable && await this.isTableAvailableForReservation(specificTable, params.date, params.time, params.duration, params.partySize, params.excludeReservationId)) {
          return specificTable;
        }
        return null; // Mesa específica no disponible
      }

      // Buscar todas las mesas disponibles
      const allTables = await this.dynamoService.scan(this.tablesTableName);
      const availableTables = allTables.items || [];

      // Filtrar por capacidad y área preferida
      let candidateTables = availableTables.filter((table: any) => {
        const hasCapacity = table.capacity >= params.partySize;
        const matchesArea = !params.preferredSeatingArea || 
                           table.location?.toLowerCase() === params.preferredSeatingArea.toLowerCase() ||
                           table.location?.toLowerCase().includes(params.preferredSeatingArea.toLowerCase());
        return hasCapacity && matchesArea;
      });

      // Ordenar por capacidad (preferir mesas con capacidad más cercana al partySize)
      candidateTables.sort((a: any, b: any) => {
        const diffA = Math.abs(a.capacity - params.partySize);
        const diffB = Math.abs(b.capacity - params.partySize);
        return diffA - diffB;
      });

      // Verificar disponibilidad de horario para cada mesa candidata
      for (const table of candidateTables) {
        if (await this.isTableAvailableForReservation(table, params.date, params.time, params.duration, params.partySize, params.excludeReservationId)) {
          return table;
        }
      }

      return null; // No hay mesas disponibles
    } catch (error) {
      this.logger.error(`Error buscando mesa disponible: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo encontrar una mesa disponible para los criterios especificados. ` +
        `Intenta con otra fecha, hora o número de personas. Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Verifica si una mesa está disponible para una reserva en un horario específico
   */
  private async isTableAvailableForReservation(
    table: any,
    date: string,
    time: string,
    duration: number,
    partySize: number,
    excludeReservationId?: string
  ): Promise<boolean> {
    try {
      console.log('[isTableAvailableForReservation] INICIO', { tableId: table?.id, date, time, duration, partySize });
      
      // Verificar que la mesa tenga capacidad suficiente
      if (table.capacity < partySize) {
        console.log('[isTableAvailableForReservation] Capacidad insuficiente');
        return false;
      }

      // Si la mesa está en mantenimiento o fuera de servicio, no está disponible
      if (table.status === 'out_of_service' || table.status === 'cleaning') {
        console.log('[isTableAvailableForReservation] Mesa fuera de servicio o en limpieza');
        return false;
      }

      // Si la mesa está ocupada actualmente, no está disponible
      if (table.status === 'occupied') {
        console.log('[isTableAvailableForReservation] Mesa ocupada');
        return false;
      }

      // Verificar si hay otras reservas para esta mesa en el mismo horario
      const reservationStart = new Date(`${date}T${time}`);
      const reservationEnd = new Date(reservationStart.getTime() + duration * 60000);

      console.log('[isTableAvailableForReservation] Buscando reservas conflictivas...');
      console.log('[isTableAvailableForReservation] Tabla:', this.reservationsTableName);
      console.log('[isTableAvailableForReservation] Fecha:', date);
      console.log('[isTableAvailableForReservation] Mesa ID:', table.id);
      
      // Usar scan simple y filtrar en memoria para evitar problemas con filtros complejos
      let allReservations: Reservation[] = [];
      try {
        console.log('[isTableAvailableForReservation] Ejecutando scan...');
        const reservations = await this.dynamoService.scan(
          this.reservationsTableName,
          'reservationDate = :date',
          undefined,
          { ':date': date }
        );
        console.log('[isTableAvailableForReservation] Scan completado');
        allReservations = (reservations.items as Reservation[]) || [];
        console.log('[isTableAvailableForReservation] Reservas del día:', allReservations.length);
      } catch (scanError) {
        console.log('[isTableAvailableForReservation] Error en scan:', scanError.message);
        // Si falla el scan, asumir que no hay conflictos para no bloquear
        return true;
      }

      // Filtrar en memoria
      const conflictingReservations = allReservations.filter(reservation => {
        // Verificar que sea para esta mesa
        if (reservation.tableId !== table.id) return false;
        
        // Verificar estado activo
        if (reservation.status !== ReservationStatus.CONFIRMED &&
            reservation.status !== ReservationStatus.SEATED &&
            reservation.status !== ReservationStatus.PENDING) {
          return false;
        }

        // Excluir la reserva actual si se especifica
        if (excludeReservationId && reservation.reservationId === excludeReservationId) {
          return false;
        }

        // Si la reserva ya terminó, no cuenta como conflicto
        if (DateUtils.isReservationEnded(
          reservation.reservationDate,
          reservation.reservationTime,
          reservation.duration || 120
        )) {
          return false;
        }

        // Verificar solapamiento de horarios
        const resStart = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
        const resEnd = new Date(resStart.getTime() + (reservation.duration || 120) * 60000);

        return reservationStart < resEnd && reservationEnd > resStart;
      });

      console.log('[isTableAvailableForReservation] Reservas conflictivas:', conflictingReservations.length);
      const isAvailable = conflictingReservations.length === 0;
      console.log('[isTableAvailableForReservation] FIN - Disponible:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.log('[isTableAvailableForReservation] ERROR:', error.message);
      this.logger.error(`Error verificando disponibilidad de mesa: ${error.message}`, error.stack);
      // En caso de error, retornar false para ser conservador
      return false;
    }
  }

  /**
   * Libera automáticamente las mesas de reservas que ya terminaron
   */
  private async releaseExpiredReservations(): Promise<void> {
    try {
      const now = DateUtils.getCurrentDateArgentina();
      const today = DateUtils.getCurrentDateStringArgentina();
      
      // Buscar reservas activas (pending, confirmed, seated) de hoy y días anteriores
      const allReservations = await this.dynamoService.scan(this.reservationsTableName);
      const activeReservations = (allReservations.items as Reservation[]) || [];

      for (const reservation of activeReservations) {
        // Solo procesar reservas que ya pasaron (fecha anterior a hoy o fecha de hoy pero hora ya pasó)
        const reservationDate = new Date(reservation.reservationDate);
        const todayDate = new Date(today);
        
        if (reservationDate < todayDate || 
            (reservationDate.getTime() === todayDate.getTime() && 
             DateUtils.isReservationEnded(
               reservation.reservationDate,
               reservation.reservationTime,
               reservation.duration || 120
             ))) {
          
          // Si la reserva ya terminó y la mesa está reservada/ocupada, liberarla
          if (reservation.tableId && 
              (reservation.status === ReservationStatus.PENDING ||
               reservation.status === ReservationStatus.CONFIRMED ||
               reservation.status === ReservationStatus.SEATED)) {
            
            const table = await this.findTableById(reservation.tableId);
            if (table && (table.status === 'reserved' || table.status === 'occupied')) {
              // Actualizar estado de la reserva a completed
              // Ya verificamos que el estado es PENDING, CONFIRMED o SEATED (líneas 987-989)
              const updatedReservation = {
                ...reservation,
                status: ReservationStatus.COMPLETED,
                completedAt: now.toISOString(),
                updatedAt: now.toISOString()
              };
              await this.dynamoService.put(this.reservationsTableName, updatedReservation);
              
              // Liberar la mesa
              await this.updateTableReservationStatus(reservation.tableId, null, 'available');
              this.logger.log(`Mesa ${table.number} liberada automáticamente - Reserva ${reservation.reservationId} completada`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error liberando reservas expiradas: ${error.message}`, error.stack);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Actualiza el estado de una mesa relacionada con una reserva
   */
  private async updateTableReservationStatus(tableId: string, reservationId: string | null, status: string): Promise<void> {
    try {
      const table = await this.findTableById(tableId);
      
      const updateExpression = 'SET #status = :status, #updatedAt = :updatedAt, currentReservationId = :reservationId';
      const expressionAttributeNames = {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      };
      const expressionAttributeValues: any = {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
        ':reservationId': reservationId
      };

      await this.dynamoService.update(
        this.tablesTableName,
        { id: tableId },
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues
      );
    } catch (error) {
      this.logger.error(`Error actualizando estado de mesa ${tableId}: ${error.message}`, error.stack);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Métodos de notificación
  private async scheduleConfirmationNotification(reservation: Reservation): Promise<void> {
    try {
      // Estructura básica para notificaciones
      // TODO: Implementar integración con servicio de notificaciones (SMS/Email)
      
      this.logger.log(`Notificación de confirmación programada para reserva ${reservation.reservationId}`);
      
      // Aquí se podría:
      // 1. Enviar email de confirmación
      // 2. Enviar SMS con código de confirmación
      // 3. Guardar en tabla de notificaciones para procesamiento asíncrono
      
      if (reservation.customerDetails?.email) {
        // TODO: Enviar email
        this.logger.log(`Email de confirmación debería enviarse a: ${reservation.customerDetails.email}`);
      }
      
      if (reservation.customerDetails?.phone) {
        // TODO: Enviar SMS
        this.logger.log(`SMS de confirmación debería enviarse a: ${reservation.customerDetails.phone}`);
      }
    } catch (error) {
      this.logger.error(`Error programando notificación de confirmación: ${error.message}`);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  private async scheduleReminderNotification(reservation: Reservation, reminderType: '24h' | '2h'): Promise<void> {
    try {
      this.logger.log(`Recordatorio ${reminderType} programado para reserva ${reservation.reservationId}`);
      
      // Calcular cuándo enviar el recordatorio
      const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
      const reminderTime = new Date(reservationDateTime);
      
      if (reminderType === '24h') {
        reminderTime.setHours(reminderTime.getHours() - 24);
      } else if (reminderType === '2h') {
        reminderTime.setHours(reminderTime.getHours() - 2);
      }
      
      // TODO: Programar notificación para reminderTime
      // TODO: Usar un sistema de colas (Bull, RabbitMQ, etc.) o cron jobs
      
      if (reservation.customerDetails?.email) {
        this.logger.log(`Recordatorio ${reminderType} debería enviarse a: ${reservation.customerDetails.email} a las ${reminderTime.toISOString()}`);
      }
    } catch (error) {
      this.logger.error(`Error programando recordatorio: ${error.message}`);
    }
  }

  private async scheduleCancellationNotification(reservation: Reservation): Promise<void> {
    try {
      this.logger.log(`Notificación de cancelación programada para reserva ${reservation.reservationId}`);
      
      if (reservation.customerDetails?.email) {
        // TODO: Enviar email de cancelación
        this.logger.log(`Email de cancelación debería enviarse a: ${reservation.customerDetails.email}`);
      }
      
      if (reservation.customerDetails?.phone) {
        // TODO: Enviar SMS de cancelación
        this.logger.log(`SMS de cancelación debería enviarse a: ${reservation.customerDetails.phone}`);
      }
    } catch (error) {
      this.logger.error(`Error programando notificación de cancelación: ${error.message}`);
    }
  }

  private async scheduleFollowUp(reservation: Reservation): Promise<void> {
    try {
      this.logger.log(`Follow-up programado para reserva ${reservation.reservationId}`);
      
      // TODO: Programar follow-up después de completar la reserva
      // Por ejemplo: enviar encuesta de satisfacción 1 día después
      
      if (reservation.customerDetails?.email) {
        this.logger.log(`Follow-up debería enviarse a: ${reservation.customerDetails.email}`);
      }
    } catch (error) {
      this.logger.error(`Error programando follow-up: ${error.message}`);
    }
  }

  /**
   * Programa recordatorios automáticos para una reserva
   */
  private async scheduleAutomaticReminders(reservation: Reservation): Promise<void> {
    try {
      // Programar recordatorio 24h antes
      await this.scheduleReminderNotification(reservation, '24h');
      
      // Programar recordatorio 2h antes
      await this.scheduleReminderNotification(reservation, '2h');
    } catch (error) {
      this.logger.error(`Error programando recordatorios automáticos: ${error.message}`);
    }
  }

  private async updateCustomerStatistics(customerId: string, spend: number): Promise<void> {
    try {
      const customer = await this.dynamoService.get(this.customersTableName, { customerId });
      if (customer) {
        const updatedCustomer = {
          ...customer,
          totalVisits: (customer.totalVisits || 0) + 1,
          totalSpent: (customer.totalSpent || 0) + spend,
          lastVisitDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await this.dynamoService.put(this.customersTableName, updatedCustomer);
      }
    } catch (error) {
      // No lanzar error aquí para no interrumpir el flujo principal
      this.logger.warn(`Error actualizando estadísticas del cliente ${customerId}: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas de reservas para una fecha específica
   */
  async getReservationStats(date?: string): Promise<any> {
    try {
      const targetDate = date || DateUtils.getCurrentDateStringArgentina();
      
      // Buscar todas las reservas del día
      const result = await this.dynamoService.scan(
        this.reservationsTableName,
        'reservationDate = :date',
        undefined,
        { ':date': targetDate }
      );

      const reservations = (result.items as Reservation[]) || [];
      
      const stats = {
        date: targetDate,
        total: reservations.length,
        byStatus: {
          pending: reservations.filter(r => r.status === ReservationStatus.PENDING).length,
          confirmed: reservations.filter(r => r.status === ReservationStatus.CONFIRMED).length,
          seated: reservations.filter(r => r.status === ReservationStatus.SEATED).length,
          completed: reservations.filter(r => r.status === ReservationStatus.COMPLETED).length,
          cancelled: reservations.filter(r => r.status === ReservationStatus.CANCELLED).length,
          noShow: reservations.filter(r => r.status === ReservationStatus.NO_SHOW).length
        },
        totalPartySize: reservations.reduce((sum, r) => sum + r.partySize, 0),
        averagePartySize: reservations.length > 0 
          ? Math.round((reservations.reduce((sum, r) => sum + r.partySize, 0) / reservations.length) * 10) / 10 
          : 0,
        occupancy: {
          totalTables: 0,
          reservedTables: new Set(reservations.filter(r => r.tableId).map(r => r.tableId)).size,
          occupiedTables: reservations.filter(r => r.status === ReservationStatus.SEATED || r.status === ReservationStatus.COMPLETED).length
        },
        revenue: {
          estimated: reservations.reduce((sum, r) => sum + (r.estimatedSpend || 0), 0),
          actual: reservations.reduce((sum, r) => sum + (r.actualSpend || 0), 0)
        },
        bySource: {
          phone: reservations.filter(r => r.source === 'phone').length,
          website: reservations.filter(r => r.source === 'website').length,
          walk_in: reservations.filter(r => r.source === 'walk_in').length,
          third_party: reservations.filter(r => r.source === 'third_party').length,
          mobile_app: reservations.filter(r => r.source === 'mobile_app').length
        }
      };

      // Obtener total de mesas
      const allTables = await this.dynamoService.scan(this.tablesTableName);
      stats.occupancy.totalTables = allTables.items?.length || 0;

      return stats;
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudieron obtener las estadísticas de reservas. Intenta nuevamente más tarde. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Obtiene calendario completo de disponibilidad desde hoy hasta 2 semanas adelante
   * Muestra mesas disponibles para cada día
   */
  /**
   * Obtiene calendario con fechas y horas disponibles para reservas (2 semanas)
   * Retorna fechas desde hoy hasta 2 semanas adelante con horarios disponibles
   * 
   * @returns Calendario con fechas y horarios disponibles
   */
  async getAvailabilityCalendar(): Promise<any> {
    try {
      this.logger.log('Generando calendario de disponibilidad (2 semanas)');
      
      // Obtener fechas base
      const today = DateUtils.getCurrentDateArgentina();
      const todayString = DateUtils.getCurrentDateStringArgentina();
      const maxDate = DateUtils.getMaxReservationDate();
      const maxDateString = DateUtils.getMaxReservationDateString();

      // Horarios de operación del restaurante (8:00 AM a 10:00 PM)
      const operatingHours = {
        start: '08:00',
        end: '22:00'
      };

      // Generar slots de 30 minutos
      const timeSlots: string[] = [];
      const startTime = new Date(`${todayString}T${operatingHours.start}`);
      const endTime = new Date(`${todayString}T${operatingHours.end}`);
      
      while (startTime < endTime) {
        const timeString = startTime.toTimeString().substring(0, 5);
        timeSlots.push(timeString);
        startTime.setMinutes(startTime.getMinutes() + 30);
      }

      // Generar calendario día por día
      const calendar: any[] = [];
      const currentDate = new Date(today);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= maxDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Información del día
        let dayOfWeek = '';
        let dayOfWeekShort = '';
        try {
          dayOfWeek = currentDate.toLocaleDateString('es-AR', { weekday: 'long' });
          dayOfWeekShort = currentDate.toLocaleDateString('es-AR', { weekday: 'short' });
        } catch (dateError) {
          const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
          const weekdaysShort = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
          dayOfWeek = weekdays[currentDate.getDay()] || '';
          dayOfWeekShort = weekdaysShort[currentDate.getDay()] || '';
        }

        calendar.push({
          date: dateString,
          day: currentDate.getDate(),
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          dayOfWeek: dayOfWeek,
          dayOfWeekShort: dayOfWeekShort,
          availableTimeSlots: timeSlots // Todos los horarios están disponibles por defecto
        });

        // Avanzar al siguiente día
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        startDate: todayString,
        endDate: maxDateString,
        totalDays: calendar.length,
        operatingHours: operatingHours,
        timeSlotInterval: 30, // minutos
        calendar: calendar
      };

    } catch (error) {
      this.logger.error(`Error obteniendo calendario: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudo generar el calendario. ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Obtiene mesas disponibles para una fecha y hora específica
   * 
   * @param date - Fecha en formato YYYY-MM-DD
   * @param time - Hora en formato HH:mm
   * @param partySize - Capacidad mínima de la mesa (opcional)
   * @param duration - Duración de la reserva en minutos (default: 120)
   * @returns Lista de mesas disponibles con sus características
   */
  async getAvailableTablesForDateTime(
    date: string,
    time: string,
    partySize?: number,
    duration: number = 120
  ): Promise<any[]> {
    try {
      this.logger.log(`Obteniendo mesas disponibles para ${date} ${time}`);

      // Validar fecha
      if (!DateUtils.isDateInValidRange(date)) {
        throw new BadRequestException(
          `La fecha ${date} está fuera del rango permitido. Debe estar entre hoy y 2 semanas adelante.`
        );
      }

      // Obtener todas las mesas disponibles
      const tablesResult = await this.dynamoService.scan(
        this.tablesTableName,
        '#status = :status',
        { '#status': 'status' },
        { ':status': 'available' }
      );

      let allTables = (tablesResult.items || []) as any[];

      // Filtrar por capacidad si se especifica
      if (partySize && partySize > 0) {
        allTables = allTables.filter(table => table.capacity >= partySize);
      }

      // Verificar disponibilidad de cada mesa para el horario específico
      const availableTables: any[] = [];

      for (const table of allTables) {
        const isAvailable = await this.isTableAvailableForReservation(
          table,
          date,
          time,
          duration,
          partySize || table.capacity
        );

        if (isAvailable) {
          availableTables.push({
            id: table.id,
            number: table.number || table.tableNumber,
            capacity: table.capacity,
            location: table.location || null,
            status: table.status,
            features: table.features || [],
            isAccessible: table.isAccessible || false
          });
        }
      }

      // Ordenar por número de mesa
      availableTables.sort((a, b) => (a.number || 0) - (b.number || 0));

      this.logger.log(`Mesas disponibles encontradas: ${availableTables.length} de ${allTables.length} totales`);

      return availableTables;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error obteniendo mesas disponibles: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudieron obtener las mesas disponibles. ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Obtiene todas las mesas disponibles y sus horarios disponibles para una fecha específica
   * 
   * @param date - Fecha en formato YYYY-MM-DD
   * @param partySize - Capacidad mínima de la mesa (opcional)
   * @param duration - Duración de la reserva en minutos (default: 120)
   * @returns Objeto con la fecha y array de mesas con sus horarios disponibles
   */
  async getAvailabilityForDate(
    date: string,
    partySize?: number,
    duration: number = 120
  ): Promise<{
    date: string;
    tables: Array<{
      id: string;
      number: number;
      capacity: number;
      location: string | null;
      status: string;
      features: string[];
      isAccessible: boolean;
      availableTimeSlots: string[];
    }>;
    totalTables: number;
    totalAvailableSlots: number;
  }> {
    try {
      this.logger.log(`Obteniendo disponibilidad para la fecha ${date}`);

      // Validar fecha
      if (!DateUtils.isDateInValidRange(date)) {
        throw new BadRequestException(
          `La fecha ${date} está fuera del rango permitido. Debe estar entre hoy y 2 semanas adelante.`
        );
      }

      // Obtener TODAS las mesas (no solo las 'available')
      // Mostraremos todas las mesas y calcularemos qué horarios están disponibles
      // basándonos en las reservas existentes
      const tablesResult = await this.dynamoService.scan(this.tablesTableName);
      let allTables = (tablesResult.items || []) as any[];

      // Filtrar por capacidad si se especifica
      if (partySize && partySize > 0) {
        allTables = allTables.filter(table => table.capacity >= partySize);
      }

      // Generar horarios de operación (8:00 AM a 10:00 PM, slots de 30 minutos)
      const timeSlots: string[] = [];
      const startTime = new Date(`${date}T08:00`);
      const endTime = new Date(`${date}T22:00`);
      const currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const timeString = currentTime.toTimeString().substring(0, 5);
        timeSlots.push(timeString);
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }

      // Obtener todas las reservas del día
      const reservationsResult = await this.dynamoService.scan(
        this.reservationsTableName,
        'reservationDate = :date',
        undefined,
        { ':date': date }
      );

      const dayReservations = (reservationsResult.items as Reservation[]) || [];
      const activeReservations = dayReservations.filter(r => 
        r.status === ReservationStatus.CONFIRMED ||
        r.status === ReservationStatus.SEATED ||
        r.status === ReservationStatus.PENDING
      );

      // Para cada mesa, verificar qué horarios están disponibles
      const tablesWithAvailability: any[] = [];

      for (const table of allTables) {
        // Verificar que la mesa tenga capacidad suficiente si se especifica partySize
        if (partySize && table.capacity < partySize) {
          continue;
        }

        // Si la mesa está en mantenimiento o fuera de servicio, saltarla completamente
        if (table.status === 'out_of_service' || table.status === 'cleaning') {
          continue;
        }

        // Obtener reservas de esta mesa para este día
        // Incluir reservas activas (CONFIRMED, SEATED, PENDING) que no hayan terminado
        const tableReservations = activeReservations.filter(r => {
          if (r.tableId !== table.id) return false;
          // Excluir reservas que ya terminaron
          return !DateUtils.isReservationEnded(
            r.reservationDate,
            r.reservationTime,
            r.duration || 120
          );
        });

        // Verificar cada horario disponible
        const availableTimeSlots: string[] = [];
        const minReservationDuration = 60; // Duración mínima de reserva en minutos

        for (const timeSlot of timeSlots) {
          const slotStart = new Date(`${date}T${timeSlot}`);
          
          // Verificar si hay conflicto con alguna reserva existente
          let hasConflict = false;
          let nextReservationStart: Date | null = null;

          // Buscar conflictos y la próxima reserva
          for (const reservation of tableReservations) {
            const resStart = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
            const resEnd = new Date(resStart.getTime() + (reservation.duration || 120) * 60000);

            // Verificar si el slot se solapa con esta reserva
            // El slot está dentro de la reserva si: slotStart >= resStart && slotStart < resEnd
            // O si la reserva empieza antes pero termina después del slot
            if (slotStart >= resStart && slotStart < resEnd) {
              // El slot está dentro de una reserva existente
              hasConflict = true;
              break;
            }

            // Si hay una reserva que empieza antes y termina después del slot, hay conflicto
            if (resStart <= slotStart && resEnd > slotStart) {
              hasConflict = true;
              break;
            }

            // Si hay una reserva que empieza después de este slot, guardarla
            if (resStart > slotStart) {
              if (!nextReservationStart || resStart < nextReservationStart) {
                nextReservationStart = resStart;
              }
            }
          }

          // Si no hay conflicto directo, verificar que hay tiempo suficiente antes de la próxima reserva
          if (!hasConflict) {
            if (nextReservationStart) {
              // Calcular tiempo disponible hasta la próxima reserva
              const timeAvailable = (nextReservationStart.getTime() - slotStart.getTime()) / 60000; // en minutos
              
              // El slot está disponible si hay al menos la duración mínima disponible
              if (timeAvailable >= minReservationDuration) {
                availableTimeSlots.push(timeSlot);
              }
            } else {
              // No hay reservas futuras, el slot está disponible
              availableTimeSlots.push(timeSlot);
            }
          }
        }

        // Solo agregar la mesa si tiene al menos un horario disponible
        if (availableTimeSlots.length > 0) {
          tablesWithAvailability.push({
            id: table.id,
            number: table.number || table.tableNumber,
            capacity: table.capacity,
            location: table.location || null,
            // En el contexto de disponibilidad, el status siempre es "available" 
            // porque lo que importa son los horarios disponibles, no el estado físico actual
            status: 'available',
            features: table.features || [],
            isAccessible: table.isAccessible || false,
            availableTimeSlots: availableTimeSlots
          });
        }
      }

      // Ordenar por número de mesa
      tablesWithAvailability.sort((a, b) => (a.number || 0) - (b.number || 0));

      // Calcular total de slots disponibles
      const totalAvailableSlots = tablesWithAvailability.reduce(
        (sum, table) => sum + table.availableTimeSlots.length,
        0
      );

      this.logger.log(
        `Disponibilidad para ${date}: ${tablesWithAvailability.length} mesas con ${totalAvailableSlots} slots disponibles`
      );

      return {
        date,
        tables: tablesWithAvailability,
        totalTables: tablesWithAvailability.length,
        totalAvailableSlots
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

  /**
   * Obtiene calendario de disponibilidad para un mes (método antiguo, renombrado)
   */
  async getMonthlyAvailabilityCalendar(year: number, month: number): Promise<any> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const today = DateUtils.getCurrentDateArgentina();
      const maxDate = DateUtils.getMaxReservationDate();

      const calendar: any[] = [];

      for (let day = 1; day <= endDate.getDate(); day++) {
        const currentDate = new Date(year, month - 1, day);
        const dateString = currentDate.toISOString().split('T')[0];

        // Solo incluir días dentro del rango permitido
        if (currentDate < today || currentDate > maxDate) {
          calendar.push({
            date: dateString,
            day: day,
            available: false,
            reason: currentDate < today ? 'past' : 'beyond_range'
          });
          continue;
        }

        // Buscar reservas del día
        const result = await this.dynamoService.scan(
          this.reservationsTableName,
          'reservationDate = :date',
          undefined,
          { ':date': dateString }
        );

        const reservations = (result.items as Reservation[]) || [];
        const activeReservations = reservations.filter(r => 
          r.status !== ReservationStatus.CANCELLED &&
          r.status !== ReservationStatus.COMPLETED &&
          r.status !== ReservationStatus.NO_SHOW
        );

        // Obtener total de mesas
        const allTables = await this.dynamoService.scan(this.tablesTableName);
        const totalTables = allTables.items?.length || 0;
        const reservedTables = new Set(activeReservations.filter(r => r.tableId).map(r => r.tableId)).size;
        const availableTables = totalTables - reservedTables;

        calendar.push({
          date: dateString,
          day: day,
          available: availableTables > 0,
          totalTables: totalTables,
          reservedTables: reservedTables,
          availableTables: availableTables
        });
      }

      return {
        year,
        month,
        calendar
      };
    } catch (error) {
      this.logger.error(`Error obteniendo calendario mensual: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudo generar el calendario mensual. ${error.message || 'Error desconocido'}`
      );
    }
  }


  /**
   * Búsqueda avanzada de reservas
   */
  async searchReservations(query: string, filters?: {
    date?: string;
    status?: ReservationStatus;
    customerId?: string;
    tableNumber?: number;
  }): Promise<Reservation[]> {
    try {
      let reservations: Reservation[] = [];

      // Si hay filtros específicos, usarlos primero
      if (filters?.date || filters?.status || filters?.customerId || filters?.tableNumber) {
        const filterDto: ReservationFilterDto = {
          date: filters.date,
          status: filters.status,
          customerId: filters.customerId,
          tableNumber: filters.tableNumber
        };
        const result = await this.findAllReservations(filterDto);
        reservations = result.data;
      } else {
        // Obtener todas las reservas
        const result = await this.dynamoService.scan(this.reservationsTableName);
        reservations = (result.items as Reservation[]) || [];
      }

      // Si hay query de búsqueda, filtrar
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        reservations = reservations.filter(reservation => {
          // Buscar en código de confirmación
          if (reservation.confirmationCode?.toLowerCase().includes(searchTerm)) {
            return true;
          }
          // Buscar en nombre del cliente
          if (reservation.customerDetails?.firstName?.toLowerCase().includes(searchTerm) ||
              reservation.customerDetails?.lastName?.toLowerCase().includes(searchTerm)) {
            return true;
          }
          // Buscar en teléfono
          if (reservation.customerDetails?.phone?.includes(searchTerm)) {
            return true;
          }
          // Buscar en email
          if (reservation.customerDetails?.email?.toLowerCase().includes(searchTerm)) {
            return true;
          }
          // Buscar en número de mesa
          if (reservation.tableNumber?.toString().includes(searchTerm)) {
            return true;
          }
          return false;
        });
      }

      return reservations;
    } catch (error) {
      this.logger.error(`Error buscando reservas: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudieron buscar las reservas. Verifica que el texto de búsqueda sea válido. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Exporta reservas a formato CSV
   */
  async exportReservationsToCSV(filters?: ReservationFilterDto): Promise<string> {
    try {
      const result = await this.findAllReservations(filters || { page: 1, limit: 10000 });
      const reservations = result.data;

      // Encabezados CSV
      const headers = [
        'ID',
        'Código Confirmación',
        'Fecha',
        'Hora',
        'Mesa',
        'Personas',
        'Cliente',
        'Teléfono',
        'Email',
        'Estado',
        'Origen',
        'Gasto Estimado',
        'Gasto Real',
        'Creado'
      ];

      // Filas CSV
      const rows = reservations.map(r => [
        r.reservationId,
        r.confirmationCode,
        r.reservationDate,
        r.reservationTime,
        r.tableNumber || '',
        r.partySize,
        `${r.customerDetails?.firstName || ''} ${r.customerDetails?.lastName || ''}`.trim(),
        r.customerDetails?.phone || '',
        r.customerDetails?.email || '',
        r.status,
        r.source || '',
        r.estimatedSpend || 0,
        r.actualSpend || 0,
        r.createdAt
      ]);

      // Generar CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      this.logger.error(`Error exportando reservas: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `No se pudo exportar las reservas a CSV. Intenta nuevamente más tarde. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }
}