import { IsString, IsNumber, IsOptional, IsEmail, IsPhoneNumber, IsDateString, IsEnum, IsBoolean, IsArray, ValidateNested, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus, ReservationSource, ReservationPriority } from '../../../common/enums';

export class CustomerDetailsDto {
  @ApiProperty({ 
    description: 'Nombre del cliente',
    example: 'Juan',
    required: true
  })
  @IsString()
  firstName: string;

  @ApiProperty({ 
    description: 'Apellido del cliente',
    example: 'Pérez',
    required: true
  })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ 
    description: 'Email del cliente (opcional, pero recomendado para notificaciones)',
    example: 'juan.perez@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ 
    description: 'Teléfono del cliente (formato: +541198765432 o +5491112345678)',
    example: '+541198765432',
    required: true
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener un formato válido (ej: +541198765432)'
  })
  phone: string;
}

export class CreateReservationDto {
  @ApiProperty({ 
    description: 'Datos del cliente que realiza la reserva. Incluye nombre, apellido, email (opcional) y teléfono.',
    type: CustomerDetailsDto,
    required: true
  })
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customerDetails: CustomerDetailsDto;

  @ApiPropertyOptional({ 
    description: 'ID del cliente si ya está registrado en el sistema. Si se proporciona, se vincula la reserva al cliente existente.',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'Número de mesa específica que el cliente desea reservar. Se puede usar tableNumber o tableId. Si no se proporciona ninguno, el sistema asignará automáticamente una mesa disponible según el tamaño del grupo.',
    example: 5,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  tableNumber?: number;

  @ApiPropertyOptional({ 
    description: 'ID único de la mesa específica que el cliente desea reservar. Se puede usar tableId o tableNumber. Si no se proporciona ninguno, el sistema asignará automáticamente una mesa disponible según el tamaño del grupo.',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiProperty({ 
    description: 'Número de personas que asistirán a la reserva. Mínimo 1, máximo 20.',
    example: 4,
    minimum: 1,
    maximum: 20,
    required: true
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  partySize: number;

  @ApiPropertyOptional({ 
    description: 'Área preferida para sentarse (ej: "terraza", "interior", "ventana"). El sistema intentará asignar una mesa en esta área si está disponible.',
    example: 'terraza'
  })
  @IsOptional()
  @IsString()
  preferredSeatingArea?: string;

  @ApiProperty({ 
    description: 'Fecha de la reserva en formato YYYY-MM-DD. Debe estar entre hoy y máximo 2 semanas en el futuro. Horario del restaurante: 8:00 AM - 10:00 PM.',
    example: '2025-12-15',
    format: 'date',
    required: true
  })
  @IsDateString()
  reservationDate: string;

  @ApiProperty({ 
    description: 'Hora de la reserva en formato HH:mm (24 horas). Debe estar dentro del horario del restaurante (8:00 - 22:00).',
    example: '20:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
    required: true
  })
  @IsString()
  reservationTime: string;

  @ApiPropertyOptional({ 
    description: 'Duración estimada de la reserva en minutos. Por defecto 120 minutos (2 horas). Mínimo 30, máximo 480 (8 horas).',
    example: 120,
    default: 120,
    minimum: 30,
    maximum: 480
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(480)
  duration?: number;

  @ApiPropertyOptional({ 
    description: 'Origen de la reserva (website, phone, walk_in, etc.). Usado para estadísticas.',
    enum: ReservationSource,
    example: ReservationSource.WEBSITE
  })
  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @ApiPropertyOptional({ 
    description: 'Prioridad de la reserva (normal, high, vip). Las reservas de alta prioridad tienen preferencia en asignación de mesas.',
    enum: ReservationPriority,
    example: ReservationPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(ReservationPriority)
  priority?: ReservationPriority;

  @ApiPropertyOptional({ 
    description: 'Solicitudes especiales del cliente (ej: ["mesa cerca de la ventana", "silla alta para bebé"]).',
    type: [String],
    example: ['mesa cerca de la ventana', 'silla alta para bebé']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRequests?: string[];

  @ApiPropertyOptional({ 
    description: 'Alergias alimentarias del cliente (ej: ["nueces", "mariscos"]). Importante para la seguridad del cliente.',
    type: [String],
    example: ['nueces', 'mariscos']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ 
    description: 'Restricciones dietéticas del cliente (ej: ["vegetariano", "sin gluten", "vegano"]).',
    type: [String],
    example: ['vegetariano', 'sin gluten']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @ApiPropertyOptional({ 
    description: 'Ocasión especial de la reserva (ej: "cumpleaños", "aniversario", "reunión de negocios").',
    example: 'cumpleaños'
  })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ 
    description: 'Notas adicionales sobre la reserva que el cliente desea comunicar al restaurante.',
    example: 'Celebración de cumpleaños, traer pastel'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Gasto estimado en la reserva. Usado para planificación y estadísticas.',
    example: 250.50,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedSpend?: number;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ 
    description: 'Cambiar el número de mesa asignada. El sistema verificará disponibilidad de la nueva mesa.',
    example: 5,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  tableNumber?: number;

  @ApiPropertyOptional({ 
    description: 'Actualizar el número de personas. Si cambia, el sistema puede reasignar una mesa más adecuada.',
    example: 6,
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  partySize?: number;

  @ApiPropertyOptional({ 
    description: 'Cambiar el área preferida de asiento.',
    example: 'interior'
  })
  @IsOptional()
  @IsString()
  preferredSeatingArea?: string;

  @ApiPropertyOptional({ 
    description: 'Cambiar la fecha de la reserva. Debe estar entre hoy y máximo 2 semanas en el futuro.',
    example: '2025-12-16',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  reservationDate?: string;

  @ApiPropertyOptional({ 
    description: 'Cambiar la hora de la reserva. Formato HH:mm (24 horas).',
    example: '21:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsOptional()
  @IsString()
  reservationTime?: string;

  @ApiPropertyOptional({ 
    description: 'Cambiar la duración estimada en minutos.',
    example: 150,
    minimum: 30,
    maximum: 480
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(480)
  duration?: number;

  @ApiPropertyOptional({ 
    description: 'Cambiar el estado de la reserva (solo admin/empleado). Estados: pending, confirmed, seated, completed, cancelled, no_show.',
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({ 
    description: 'Actualizar solicitudes especiales.',
    type: [String],
    example: ['mesa cerca de la ventana']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRequests?: string[];

  @ApiPropertyOptional({ 
    description: 'Notas visibles para el cliente.',
    example: 'Cliente confirmó asistencia'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Notas internas solo visibles para el personal del restaurante.',
    example: 'Cliente VIP, atención especial'
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ 
    description: 'ID del host/mesero asignado a la reserva.',
    example: 'host-123'
  })
  @IsOptional()
  @IsString()
  assignedHost?: string;

  @ApiPropertyOptional({ 
    description: 'Motivo de cancelación si se cancela la reserva.',
    example: 'Cambio de planes del cliente'
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class CreateCustomerDto {
  @ApiProperty({ 
    description: 'Nombre del cliente',
    example: 'Juan',
    required: true
  })
  @IsString()
  firstName: string;

  @ApiProperty({ 
    description: 'Apellido del cliente',
    example: 'Pérez',
    required: true
  })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ 
    description: 'Email del cliente. Debe ser único en el sistema. Si no se proporciona, el cliente puede registrarse solo con teléfono.',
    example: 'juan.perez@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ 
    description: 'Teléfono del cliente en formato internacional (ej: +1234567890). Debe ser único en el sistema.',
    example: '+1234567890',
    required: true
  })
  @IsPhoneNumber()
  phone: string;

  @ApiPropertyOptional({ 
    description: 'Fecha de nacimiento del cliente en formato YYYY-MM-DD. Usado para ofertas especiales de cumpleaños.',
    example: '1990-05-15',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ 
    description: 'Lista de alergias alimentarias del cliente. Importante para la seguridad.',
    type: [String],
    example: ['nueces', 'mariscos', 'lactosa']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ 
    description: 'Restricciones dietéticas del cliente.',
    type: [String],
    example: ['vegetariano', 'sin gluten']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @ApiPropertyOptional({ 
    description: 'Preferencias del cliente (ej: ["mesa cerca de la ventana", "música suave"]).',
    type: [String],
    example: ['mesa cerca de la ventana', 'música suave']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferences?: string[];

  @ApiPropertyOptional({ 
    description: 'Notas adicionales sobre el cliente.',
    example: 'Cliente frecuente, prefiere mesa 5'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ 
    description: 'Actualizar nombre del cliente.',
    example: 'Juan Carlos'
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ 
    description: 'Actualizar apellido del cliente.',
    example: 'Pérez González'
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ 
    description: 'Actualizar email del cliente. Debe ser único. Si ya existe otro cliente con ese email, se rechazará la actualización.',
    example: 'nuevo.email@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Actualizar teléfono del cliente. Debe ser único. Si ya existe otro cliente con ese teléfono, se rechazará la actualización.',
    example: '+9876543210'
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Actualizar fecha de nacimiento.',
    example: '1990-05-15',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ 
    description: 'Actualizar lista de alergias.',
    type: [String],
    example: ['nueces']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ 
    description: 'Actualizar restricciones dietéticas.',
    type: [String],
    example: ['vegano']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @ApiPropertyOptional({ 
    description: 'Actualizar preferencias.',
    type: [String],
    example: ['mesa tranquila']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferences?: string[];

  @ApiPropertyOptional({ 
    description: 'Actualizar notas del cliente.',
    example: 'Cliente VIP desde 2024'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Cambiar estado VIP del cliente (solo admin). Los clientes VIP tienen beneficios especiales.',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  vipStatus?: boolean;
}

export class CreateWaitlistEntryDto {
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customerDetails: CustomerDetailsDto;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  partySize: number;

  @IsDateString()
  requestedDate: string;

  @IsOptional()
  @IsString()
  requestedTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(240)
  timeFlexibility?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AvailabilityQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  time?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  partySize: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(180)
  duration?: number;

  @IsOptional()
  @IsString()
  preferredSeatingArea?: string;
}

export class ReservationFilterDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  tableNumber?: number;

  @IsOptional()
  @IsString()
  assignedHost?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}