import { IsString, IsNumber, IsOptional, IsEmail, IsPhoneNumber, IsDateString, IsEnum, IsBoolean, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus, ReservationSource, ReservationPriority } from '../../../common/enums';

export class CustomerDetailsDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsPhoneNumber()
  phone: string;
}

export class CreateReservationDto {
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customerDetails: CustomerDetailsDto;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  tableNumber?: number;

  @IsNumber()
  @Min(1)
  @Max(20)
  partySize: number;

  @IsOptional()
  @IsString()
  preferredSeatingArea?: string;

  @IsDateString()
  reservationDate: string;

  @IsString()
  reservationTime: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(480)
  duration?: number;

  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @IsOptional()
  @IsEnum(ReservationPriority)
  priority?: ReservationPriority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRequests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @IsOptional()
  @IsString()
  occasion?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedSpend?: number;
}

export class UpdateReservationDto {
  @IsOptional()
  @IsNumber()
  tableNumber?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  partySize?: number;

  @IsOptional()
  @IsString()
  preferredSeatingArea?: string;

  @IsOptional()
  @IsDateString()
  reservationDate?: string;

  @IsOptional()
  @IsString()
  reservationTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(480)
  duration?: number;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRequests?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  assignedHost?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class CreateCustomerDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsPhoneNumber()
  phone: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferences?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferences?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

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
  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  partySize: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(480)
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