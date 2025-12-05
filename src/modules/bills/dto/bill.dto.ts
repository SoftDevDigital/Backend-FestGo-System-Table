import { IsNotEmpty, IsEnum, IsNumber, IsOptional, IsUUID, Min, IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../common/enums';

export class CreateBillDto {
  @ApiProperty({ 
    description: 'ID de la orden a facturar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty({ message: 'El ID de la orden es requerido' })
  @IsUUID('4', { message: 'El ID de la orden debe ser un UUID válido' })
  orderId: string;

  @ApiProperty({ 
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.CASH
  })
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ 
    description: 'Monto pagado por el cliente',
    example: 65.50,
    minimum: 0.01
  })
  @IsNotEmpty({ message: 'El monto pagado es requerido' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe tener máximo 2 decimales' })
  @Min(0.01, { message: 'El monto pagado debe ser mayor a 0' })
  paidAmount: number;

  @ApiPropertyOptional({ 
    description: 'ID del cajero que procesa el pago',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID('4')
  cashierId?: string;

  @ApiPropertyOptional({ 
    description: 'Descuento adicional a aplicar',
    example: 5.00,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Propina adicional',
    example: 10.00,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tipAmount?: number;
}

export class DirectSaleItemDto {
  @ApiProperty({ 
    description: 'ID del producto',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido' })
  productId: string;

  @ApiProperty({ 
    description: 'Cantidad del producto',
    example: 2,
    minimum: 1
  })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;
}

export class CreateDirectSaleDto {
  @ApiProperty({ 
    description: 'Productos a vender',
    type: [DirectSaleItemDto],
    example: [
      { productId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 },
      { productId: '987e6543-e21b-43c5-8765-432109876543', quantity: 2 }
    ]
  })
  @IsNotEmpty({ message: 'Debe incluir al menos un producto' })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe incluir al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => DirectSaleItemDto)
  items: DirectSaleItemDto[];

  @ApiProperty({ 
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.CASH
  })
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ 
    description: 'Monto pagado por el cliente',
    example: 25.50,
    minimum: 0.01
  })
  @IsNotEmpty({ message: 'El monto pagado es requerido' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe tener máximo 2 decimales' })
  @Min(0.01, { message: 'El monto pagado debe ser mayor a 0' })
  paidAmount: number;

  @ApiPropertyOptional({ 
    description: 'ID del cliente (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'ID del cajero/empleado que procesa la venta',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID('4')
  cashierId?: string;

  @ApiPropertyOptional({ 
    description: 'Descuento a aplicar',
    example: 2.00,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Notas adicionales',
    example: 'Venta para llevar'
  })
  @IsOptional()
  notes?: string;
}

