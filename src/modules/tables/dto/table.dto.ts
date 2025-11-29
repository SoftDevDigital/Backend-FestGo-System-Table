import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
}

export class CreateTableDto {
  @ApiProperty({ description: 'Número de la mesa' })
  @IsNotEmpty()
  @IsNumber()
  number: number;

  @ApiProperty({ description: 'Capacidad de la mesa' })
  @IsNotEmpty()
  @IsNumber()
  capacity: number;

  @ApiProperty({ description: 'Ubicación de la mesa', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @ApiProperty({ description: 'Estado de la mesa', enum: TableStatus, required: false })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}