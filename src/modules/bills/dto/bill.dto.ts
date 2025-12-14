import { IsNotEmpty, IsEnum, IsNumber, IsOptional, IsUUID, Min, IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, BillStatus } from '../../../common/enums';

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

// DTOs de respuesta para Swagger
export class PaymentDetailResponseDto {
  @ApiProperty({ description: 'ID del detalle de pago' })
  id: string;

  @ApiProperty({ description: 'Método de pago', enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ description: 'Monto pagado', example: 65.50 })
  amount: number;

  @ApiPropertyOptional({ description: 'ID de transacción' })
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Últimos 4 dígitos de la tarjeta' })
  cardLastFour?: string;

  @ApiPropertyOptional({ description: 'Tipo de tarjeta' })
  cardType?: string;

  @ApiPropertyOptional({ description: 'Código de autorización' })
  authorizationCode?: string;

  @ApiProperty({ description: 'Fecha de procesamiento' })
  processedAt: string;

  @ApiPropertyOptional({ description: 'Respuesta del procesador' })
  processorResponse?: string;

  @ApiPropertyOptional({ description: 'Indica si fue reembolsado', example: false })
  refunded?: boolean;

  @ApiPropertyOptional({ description: 'Monto reembolsado' })
  refundAmount?: number;

  @ApiPropertyOptional({ description: 'Fecha de reembolso' })
  refundedAt?: string;

  @ApiPropertyOptional({ description: 'Razón del reembolso' })
  refundReason?: string;
}

export class OrderItemResponseDto {
  @ApiProperty({ description: 'ID del item' })
  id: string;

  @ApiProperty({ description: 'ID del producto' })
  productId: string;

  @ApiProperty({ description: 'Nombre del producto', example: 'Pizza Margherita' })
  productName: string;

  @ApiPropertyOptional({ description: 'ID de la variante' })
  variantId?: string;

  @ApiPropertyOptional({ description: 'Nombre de la variante' })
  variantName?: string;

  @ApiProperty({ description: 'Cantidad', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', example: 15.99 })
  unitPrice: number;

  @ApiProperty({ description: 'Precio total', example: 31.98 })
  totalPrice: number;

  @ApiPropertyOptional({ description: 'Instrucciones especiales' })
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Estado de preparación' })
  preparationStatus?: string;
}

export class BillResponseDto {
  @ApiProperty({ description: 'ID de la factura' })
  id: string;

  @ApiProperty({ description: 'Número de factura', example: 'BILL-1234567890-ABCD' })
  billNumber: string;

  @ApiProperty({ description: 'ID de la orden original' })
  orderId: string;

  @ApiPropertyOptional({ description: 'ID de la mesa' })
  tableId?: string;

  @ApiPropertyOptional({ description: 'ID del cliente' })
  customerId?: string;

  @ApiPropertyOptional({ description: 'ID del cajero' })
  cashierId?: string;

  @ApiProperty({ description: 'Subtotal', example: 50.00 })
  subtotal: number;

  @ApiProperty({ description: 'Monto de impuestos (siempre 0)', example: 0 })
  taxAmount: number;

  @ApiProperty({ description: 'Tasa de impuestos (siempre 0)', example: 0 })
  taxRate: number;

  @ApiPropertyOptional({ description: 'Monto de descuento', example: 5.00 })
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de descuento' })
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Razón del descuento' })
  discountReason?: string;

  @ApiPropertyOptional({ description: 'Monto de propina', example: 10.00 })
  tipAmount?: number;

  @ApiPropertyOptional({ description: 'Cargo por servicio' })
  serviceChargeAmount?: number;

  @ApiProperty({ description: 'Total a pagar', example: 55.00 })
  totalAmount: number;

  @ApiProperty({ description: 'Monto pagado', example: 60.00 })
  paidAmount: number;

  @ApiPropertyOptional({ description: 'Cambio devuelto', example: 5.00 })
  changeAmount?: number;

  @ApiProperty({ description: 'Estado de la factura', enum: BillStatus, example: BillStatus.PAID })
  status: BillStatus;

  @ApiProperty({ description: 'Detalles de pago', type: [PaymentDetailResponseDto] })
  paymentDetails: PaymentDetailResponseDto[];

  @ApiPropertyOptional({ description: 'Número fiscal' })
  fiscalNumber?: string;

  @ApiPropertyOptional({ description: 'URL del comprobante fiscal' })
  fiscalUrl?: string;

  @ApiPropertyOptional({ description: 'Fecha de impresión' })
  printedAt?: string;

  @ApiPropertyOptional({ description: 'Indica si se envió por email', example: false })
  emailSent?: boolean;

  @ApiPropertyOptional({ description: 'Email del cliente' })
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento' })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Items de la orden guardados', type: [OrderItemResponseDto] })
  items?: OrderItemResponseDto[];

  @ApiPropertyOptional({ description: 'Número de orden original', example: 'ORD-1234567890-ABCD' })
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'ID del mesero' })
  waiterId?: string;

  @ApiPropertyOptional({ 
    description: 'Tipo de orden original (dine_in, takeaway, delivery). Usado para liberar mesa automáticamente.',
    enum: ['dine_in', 'takeaway', 'delivery'],
    example: 'dine_in'
  })
  orderType?: 'dine_in' | 'takeaway' | 'delivery';

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Creado por', example: 'system' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Actualizado por', example: 'system' })
  updatedBy?: string;
}

