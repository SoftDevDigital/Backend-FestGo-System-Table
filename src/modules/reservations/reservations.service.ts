import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class ReservationsService {
  constructor(private readonly dynamoService: DynamoDBService) {}

  async createReservation(createReservationDto: CreateReservationDto): Promise<Reservation> {
    const reservationId = uuidv4();
    const confirmationCode = this.generateConfirmationCode();

    // Check availability
    const isAvailable = await this.checkAvailability({
      date: createReservationDto.reservationDate,
      time: createReservationDto.reservationTime,
      partySize: createReservationDto.partySize,
      duration: createReservationDto.duration
    });

    if (!isAvailable) {
      throw new BadRequestException('No hay disponibilidad para la fecha y hora solicitadas');
    }

    const reservation: Reservation = {
      reservationId,
      confirmationCode,
      customerId: createReservationDto.customerId,
      customerDetails: createReservationDto.customerDetails,
      partySize: createReservationDto.partySize,
      preferredSeatingArea: createReservationDto.preferredSeatingArea,
      reservationDate: createReservationDto.reservationDate,
      reservationTime: createReservationDto.reservationTime,
      duration: createReservationDto.duration || 120, // 2 horas por defecto
      status: ReservationStatus.PENDING,
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

    await this.dynamoService.put('reservations', reservation);
    
    // TODO: Send confirmation notification
    await this.scheduleConfirmationNotification(reservation);
    
    return reservation;
  }

  async findAllReservations(filters: ReservationFilterDto): Promise<PaginatedResponse<Reservation>> {
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
      'reservations',
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
  }

  async findReservationById(reservationId: string): Promise<Reservation> {
    const reservation = await this.dynamoService.get('reservations', { reservationId });
    
    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${reservationId} no encontrada`);
    }
    
    return reservation as Reservation;
  }

  async findReservationByConfirmationCode(confirmationCode: string): Promise<Reservation> {
    const result = await this.dynamoService.scan(
      'reservations',
      'confirmationCode = :code',
      undefined,
      { ':code': confirmationCode },
      1
    );
    
    if (!result.items || result.items.length === 0) {
      throw new NotFoundException(`Reserva con código ${confirmationCode} no encontrada`);
    }
    
    return result.items[0] as Reservation;
  }

  async updateReservation(reservationId: string, updateReservationDto: UpdateReservationDto): Promise<Reservation> {
    const reservation = await this.findReservationById(reservationId);

    const updatedReservation = {
      ...reservation,
      ...updateReservationDto,
      internalNotes: Array.isArray(updateReservationDto.internalNotes) 
        ? updateReservationDto.internalNotes 
        : reservation.internalNotes,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put('reservations', updatedReservation);
    
    return updatedReservation;
  }

  async cancelReservation(reservationId: string, cancellationReason?: string): Promise<Reservation> {
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

    await this.dynamoService.put('reservations', updatedReservation);
    
    // TODO: Send cancellation notification
    await this.scheduleCancellationNotification(reservation);
    
    return updatedReservation;
  }

  async confirmReservation(reservationId: string): Promise<Reservation> {
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

    await this.dynamoService.put('reservations', updatedReservation);
    
    return updatedReservation;
  }

  async seatReservation(reservationId: string, tableId: string): Promise<Reservation> {
    const reservation = await this.findReservationById(reservationId);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Solo se pueden asignar mesas a reservas confirmadas');
    }

    // Verificar que la mesa esté disponible
    const table = await this.findTableById(tableId);
    if (!table || table.status !== 'available') {
      throw new BadRequestException('La mesa no está disponible');
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

    await this.dynamoService.put('reservations', updatedReservation);
    
    return updatedReservation;
  }

  async completeReservation(reservationId: string, actualSpend?: number): Promise<Reservation> {
    const reservation = await this.findReservationById(reservationId);

    const updatedReservation = {
      ...reservation,
      status: ReservationStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      actualSpend: actualSpend || 0,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system' // TODO: Get from auth context
    };

    await this.dynamoService.put('reservations', updatedReservation);
    
    // TODO: Update customer statistics
    await this.updateCustomerStatistics(reservation.customerId, actualSpend || 0);
    
    // TODO: Schedule follow-up
    await this.scheduleFollowUp(reservation);
    
    return updatedReservation;
  }

  async markAsNoShow(reservationId: string): Promise<Reservation> {
    const reservation = await this.findReservationById(reservationId);

    const updatedReservation = {
      ...reservation,
      status: ReservationStatus.NO_SHOW,
      noShowAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'system' // TODO: Get from auth context
    };

    await this.dynamoService.put('reservations', updatedReservation);
    
    return updatedReservation;
  }

  async checkAvailability(query: AvailabilityQueryDto, excludeReservationId?: string): Promise<boolean> {
    const result = await this.dynamoService.scan(
      'reservations',
      'reservationDate = :date AND #status IN (:confirmed, :seated)',
      { '#status': 'status' },
      { 
        ':date': query.date,
        ':confirmed': ReservationStatus.CONFIRMED,
        ':seated': ReservationStatus.SEATED
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

  private async getAvailableTables(date: string): Promise<any[]> {
    const result = await this.dynamoService.scan(
      'tables',
      '#status = :status',
      { '#status': 'status' },
      { ':status': 'available' }
    );

    return result.items || [];
  }

  async getTodaysReservations(): Promise<Reservation[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await this.dynamoService.scan(
      'reservations',
      'reservationDate = :today',
      undefined,
      { ':today': today }
    );
    
    return (result.items as Reservation[]).sort((a, b) => 
      a.reservationTime.localeCompare(b.reservationTime)
    );
  }

  async getUpcomingReservations(days: number = 7): Promise<Reservation[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    const result = await this.dynamoService.scan(
      'reservations',
      'reservationDate BETWEEN :start AND :end',
      undefined,
      {
        ':start': today.toISOString().split('T')[0],
        ':end': futureDate.toISOString().split('T')[0]
      }
    );
    
    return result.items as Reservation[];
  }

  async getAvailableTimeSlots(date: string, partySize: number, preferredSeatingArea?: string): Promise<string[]> {
    // Horarios de operación del restaurante
    const operatingHours = {
      start: '11:00',
      end: '22:00'
    };

    // Generar slots de 30 minutos
    const timeSlots = [];
    const startTime = new Date(`${date}T${operatingHours.start}`);
    const endTime = new Date(`${date}T${operatingHours.end}`);

    while (startTime < endTime) {
      const timeString = startTime.toTimeString().substring(0, 5);
      
      // Verificar disponibilidad para este slot
      const isAvailable = await this.checkAvailability({
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

  private async findCustomerByPhone(phone: string): Promise<any> {
    const result = await this.dynamoService.scan(
      'customers',
      'phone = :phone',
      undefined,
      { ':phone': phone },
      1
    );
    
    return result.items && result.items.length > 0 ? result.items[0] : null;
  }

  private async findTableById(tableId: string): Promise<any> {
    return await this.dynamoService.get('tables', { id: tableId });
  }

  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Métodos de notificación (placeholder)
  private async scheduleConfirmationNotification(reservation: Reservation): Promise<void> {
    // TODO: Implement notification scheduling
  }

  private async scheduleReminderNotification(reservation: Reservation): Promise<void> {
    // TODO: Implement reminder scheduling
  }

  private async scheduleCancellationNotification(reservation: Reservation): Promise<void> {
    // TODO: Implement cancellation notification
  }

  private async scheduleFollowUp(reservation: Reservation): Promise<void> {
    // TODO: Implement follow-up scheduling
  }

  private async updateCustomerStatistics(customerId: string, spend: number): Promise<void> {
    const customer = await this.dynamoService.get('customers', { customerId });
    if (customer) {
      const updatedCustomer = {
        ...customer,
        totalVisits: (customer.totalVisits || 0) + 1,
        totalSpent: (customer.totalSpent || 0) + spend,
        lastVisitDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.dynamoService.put('customers', updatedCustomer);
    }
  }
}