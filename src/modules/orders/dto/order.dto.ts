import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsArray, IsUUID, ValidateNested, Min, Max, ArrayNotEmpty, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OrderStatus } from '../../../common/enums';

export class OrderModifierDto {
  @ApiProperty({ description: 'Nombre del modificador', example: 'Sin cebolla' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Precio adicional del modificador', example: 0 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Tipo de modificador', enum: ['add', 'remove', 'substitute'] })
  @IsNotEmpty()
  @IsIn(['add', 'remove', 'substitute'])
  type: 'add' | 'remove' | 'substitute';
}

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsNotEmpty()
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido' })
  productId: string;

  @ApiPropertyOptional({ description: 'ID de la variante del producto' })
  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @ApiProperty({ description: 'Cantidad', example: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(20, { message: 'La cantidad no puede exceder 20 unidades por ítem' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Instrucciones especiales' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Modificadores del producto' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderModifierDto)
  modifiers?: OrderModifierDto[];
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'ID de la mesa' })
  @IsOptional()
  @IsUUID('4')
  tableId?: string;

  @ApiPropertyOptional({ 
    description: 'ID del cliente (OPCIONAL - para clientes walk-in sin registro, omitir este campo)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @ApiPropertyOptional({ description: 'ID del mesero' })
  @IsOptional()
  @IsUUID('4')
  waiterId?: string;

  @ApiProperty({ description: 'Ítems del pedido' })
  @IsNotEmpty({ message: 'Debe incluir al menos un ítem en el pedido' })
  @IsArray()
  @ArrayNotEmpty({ message: 'El pedido debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ description: 'Tipo de orden', enum: ['dine_in', 'takeaway', 'delivery'] })
  @IsNotEmpty()
  @IsIn(['dine_in', 'takeaway', 'delivery'])
  orderType: 'dine_in' | 'takeaway' | 'delivery';

  @ApiPropertyOptional({ description: 'Notas generales del pedido' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({ description: 'Solicitudes especiales' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Descuento aplicado' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Propina incluida' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tipAmount?: number;
}

export class AddItemsToOrderDto {
  @ApiProperty({ description: 'Ítems a agregar a la orden', type: [CreateOrderItemDto] })
  @IsNotEmpty({ message: 'Debe incluir al menos un ítem' })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe incluir al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiPropertyOptional({ description: 'Estado del pedido', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'ID del chef asignado' })
  @IsOptional()
  @IsUUID('4')
  chefId?: string;

  @ApiPropertyOptional({ description: 'Tiempo estimado de preparación en minutos' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(240)
  estimatedPreparationTime?: number;

  @ApiPropertyOptional({ description: 'Razón de cancelación' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Calificación del pedido (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Comentarios del cliente' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class UpdateOrderItemStatusDto {
  @ApiProperty({ description: 'ID del ítem de la orden' })
  @IsNotEmpty()
  @IsUUID('4')
  itemId: string;

  @ApiProperty({ description: 'Estado de preparación', enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'] })
  @IsNotEmpty()
  @IsIn(['pending', 'preparing', 'ready', 'served', 'cancelled'])
  preparationStatus: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ description: 'Estado del pedido' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'ID de la mesa' })
  @IsOptional()
  @IsUUID('4')
  tableId?: string;

  @ApiPropertyOptional({ description: 'ID del mesero' })
  @IsOptional()
  @IsUUID('4')
  waiterId?: string;

  @ApiPropertyOptional({ description: 'Tipo de orden' })
  @IsOptional()
  @IsIn(['dine_in', 'takeaway', 'delivery'])
  orderType?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Límite por página', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
