import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, IsDateString, IsEnum, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum StockMovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  WASTE = 'waste',
  RETURN = 'return',
}

export enum StockMovementReason {
  SUPPLIER_DELIVERY = 'supplier_delivery',
  CUSTOMER_SALE = 'customer_sale',
  INVENTORY_COUNT = 'inventory_count',
  DAMAGED_GOODS = 'damaged_goods',
  EXPIRED_GOODS = 'expired_goods',
  THEFT = 'theft',
  OTHER = 'other',
}

export class CreateInventoryItemDto {
  @ApiPropertyOptional({ description: 'ID del producto asociado' })
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @ApiProperty({ description: 'Nombre del artículo' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  itemName: string;

  @ApiPropertyOptional({ description: 'SKU del artículo' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Stock actual' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  currentStock: number;

  @ApiProperty({ description: 'Stock mínimo' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  minimumStock: number;

  @ApiProperty({ description: 'Stock máximo' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  maximumStock: number;

  @ApiProperty({ description: 'Unidad de medida' })
  @IsNotEmpty()
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Costo por unidad' })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPerUnit: number;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Fecha de expiración' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Ubicación en almacén' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {
  @ApiPropertyOptional({ description: 'Última actualización de stock' })
  @IsOptional()
  @IsDateString()
  lastStockUpdate?: string;
}

export class StockMovementDto {
  @ApiProperty({ description: 'ID del artículo de inventario' })
  @IsNotEmpty()
  @IsUUID('4')
  inventoryItemId: string;

  @ApiProperty({ description: 'Tipo de movimiento', enum: StockMovementType })
  @IsNotEmpty()
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ description: 'Cantidad del movimiento' })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Razón del movimiento', enum: StockMovementReason })
  @IsOptional()
  @IsEnum(StockMovementReason)
  reason?: StockMovementReason;

  @ApiPropertyOptional({ description: 'Referencia externa' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Notas del movimiento' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Costo unitario en el movimiento' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitCost?: number;
}

export class AddressDto {
  @ApiProperty({ description: 'Calle' })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({ description: 'Ciudad' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ description: 'Estado/Provincia' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ description: 'Código postal' })
  @IsNotEmpty()
  @IsString()
  zipCode: string;

  @ApiProperty({ description: 'País' })
  @IsNotEmpty()
  @IsString()
  country: string;
}

export class CreateSupplierDto {
  @ApiProperty({ description: 'Nombre del proveedor' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: 'Nombre del contacto' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Email del proveedor' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del proveedor' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección completa' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Términos de pago en días' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentTerms?: number;

  @ApiPropertyOptional({ description: 'Descuento por volumen' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  volumeDiscount?: number;

  @ApiPropertyOptional({ description: 'Notas del proveedor' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional({ description: 'Estado activo del proveedor' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Total de órdenes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalOrders?: number;

  @ApiPropertyOptional({ description: 'Monto total de órdenes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Fecha de la última orden' })
  @IsOptional()
  @IsDateString()
  lastOrderDate?: string;
}

export class LowStockAlertDto {
  @ApiProperty({ description: 'ID del artículo' })
  @IsNotEmpty()
  @IsUUID('4')
  inventoryItemId: string;

  @ApiProperty({ description: 'Nombre del artículo' })
  @IsNotEmpty()
  @IsString()
  itemName: string;

  @ApiProperty({ description: 'Stock actual' })
  @IsNotEmpty()
  @IsNumber()
  currentStock: number;

  @ApiProperty({ description: 'Stock mínimo' })
  @IsNotEmpty()
  @IsNumber()
  minimumStock: number;

  @ApiProperty({ description: 'Porcentaje de stock restante' })
  @IsNotEmpty()
  @IsNumber()
  stockPercentage: number;
}