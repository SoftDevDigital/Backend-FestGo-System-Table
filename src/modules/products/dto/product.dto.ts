import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, IsUrl, Min, Max, IsUUID, ValidateNested, ArrayNotEmpty, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductStatus } from '../../../common/enums';

// DTOs de respuesta para Swagger
export class NutritionalInfoResponseDto {
  @ApiPropertyOptional({ description: 'Proteína en gramos', example: 12 })
  protein?: number;

  @ApiPropertyOptional({ description: 'Carbohidratos en gramos', example: 30 })
  carbs?: number;

  @ApiPropertyOptional({ description: 'Grasa en gramos', example: 8 })
  fat?: number;

  @ApiPropertyOptional({ description: 'Fibra en gramos', example: 2 })
  fiber?: number;

  @ApiPropertyOptional({ description: 'Sodio en miligramos', example: 500 })
  sodium?: number;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'ID del producto', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Nombre del producto', example: 'Pizza Margherita' })
  name: string;

  @ApiProperty({ description: 'Código de 3 letras', example: 'CCM' })
  code: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  description?: string;

  @ApiProperty({ description: 'Precio del producto', example: 15.99 })
  price: number;

  @ApiPropertyOptional({ description: 'Precio de costo', example: 8.50 })
  costPrice?: number;

  @ApiProperty({ description: 'ID de la categoría', example: '42088847-c2a6-401f-854c-1e1a336626c5' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'SKU del producto' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Código de barras' })
  barcode?: string;

  @ApiProperty({ description: 'Estado del producto', enum: ProductStatus, example: ProductStatus.AVAILABLE })
  status: ProductStatus;

  @ApiPropertyOptional({ description: 'URL de la imagen principal' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'URLs de imágenes adicionales', type: [String] })
  images?: string[];

  @ApiProperty({ description: 'Disponibilidad del producto', example: true })
  isAvailable: boolean;

  @ApiPropertyOptional({ description: 'Tiempo de preparación en minutos', example: 15 })
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Calorías del producto', example: 250 })
  calories?: number;

  @ApiPropertyOptional({ description: 'Lista de alérgenos', type: [String], example: ['gluten', 'lactose'] })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Lista de ingredientes', type: [String] })
  ingredients?: string[];

  @ApiPropertyOptional({ description: 'Información nutricional', type: NutritionalInfoResponseDto })
  nutritionalInfo?: NutritionalInfoResponseDto;

  @ApiPropertyOptional({ description: 'Etiquetas del producto', type: [String] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Es vegano', example: false })
  isVegan?: boolean;

  @ApiPropertyOptional({ description: 'Es libre de gluten', example: false })
  isGlutenFree?: boolean;

  @ApiPropertyOptional({ description: 'Es picante', example: false })
  isSpicy?: boolean;

  @ApiPropertyOptional({ description: 'Nivel de picante (1-5)', example: 2 })
  spicyLevel?: number;

  @ApiPropertyOptional({ description: 'Es producto popular', example: false })
  isPopular?: boolean;

  @ApiPropertyOptional({ description: 'Porcentaje de descuento', example: 0 })
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Edad mínima requerida', example: 0 })
  minimumAge?: number;

  @ApiProperty({ description: 'Fecha de creación', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de actualización', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Creado por', example: 'system' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Actualizado por', example: 'system' })
  updatedBy?: string;
}

export class CategoryResponseDto {
  @ApiProperty({ description: 'ID de la categoría', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Nombre de la categoría', example: 'Pizzas' })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría' })
  description?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen' })
  imageUrl?: string;

  @ApiProperty({ description: 'Estado activo', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Orden de visualización', example: 1 })
  sortOrder: number;

  @ApiPropertyOptional({ description: 'ID de categoría padre' })
  parentCategoryId?: string;

  @ApiPropertyOptional({ description: 'Color representativo', example: '#FF6B6B' })
  color?: string;

  @ApiPropertyOptional({ description: 'Icono representativo', example: '🍕' })
  icon?: string;

  @ApiProperty({ description: 'Fecha de creación', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de actualización', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Creado por', example: 'system' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Actualizado por', example: 'system' })
  updatedBy?: string;
}

export class NutritionalInfoDto {
  @ApiPropertyOptional({ description: 'Proteína en gramos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @ApiPropertyOptional({ description: 'Carbohidratos en gramos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @ApiPropertyOptional({ description: 'Grasa en gramos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @ApiPropertyOptional({ description: 'Fibra en gramos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @ApiPropertyOptional({ description: 'Sodio en miligramos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium?: number;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Nombre del producto', example: 'Pizza Margherita' })
  @IsNotEmpty({ message: 'El nombre del producto es requerido' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: 'Código de 3 letras para pedidos rápidos', example: 'CCM' })
  @IsNotEmpty({ message: 'El código del producto es requerido' })
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'El código debe ser exactamente 3 letras mayúsculas' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  code: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({ description: 'Precio del producto', example: 15.99 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe tener máximo 2 decimales' })
  @Min(0.01, { message: 'El precio debe ser mayor a 0' })
  price: number;

  @ApiPropertyOptional({ description: 'Precio de costo', example: 8.50 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number;

  @ApiProperty({ description: 'ID de la categoría' })
  @IsNotEmpty()
  @IsUUID('4', { message: 'El ID de categoría debe ser un UUID válido' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'SKU del producto' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Código de barras' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Estado del producto', enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: 'URL de la imagen principal' })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'URLs de imágenes adicionales' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Todas las imágenes deben ser URLs válidas' })
  images?: string[];

  @ApiPropertyOptional({ description: 'Disponibilidad del producto', default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Tiempo de preparación en minutos', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'El tiempo de preparación debe ser al menos 1 minuto' })
  @Max(180, { message: 'El tiempo de preparación no puede exceder 180 minutos' })
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Calorías del producto' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ description: 'Lista de alérgenos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Lista de ingredientes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @ApiPropertyOptional({ description: 'Información nutricional' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionalInfoDto)
  nutritionalInfo?: NutritionalInfoDto;

  @ApiPropertyOptional({ description: 'Etiquetas del producto' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Es vegano', default: false })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @ApiPropertyOptional({ description: 'Es libre de gluten', default: false })
  @IsOptional()
  @IsBoolean()
  isGlutenFree?: boolean;

  @ApiPropertyOptional({ description: 'Es picante', default: false })
  @IsOptional()
  @IsBoolean()
  isSpicy?: boolean;

  @ApiPropertyOptional({ description: 'Nivel de picante (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  spicyLevel?: number;

  @ApiPropertyOptional({ description: 'Es producto popular', default: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional({ description: 'Porcentaje de descuento' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Edad mínima requerida' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99)
  minimumAge?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nombre de la categoría', example: 'Pizzas' })
  @IsNotEmpty({ message: 'El nombre de la categoría es requerido' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'ID de categoría padre' })
  @IsOptional()
  @IsUUID('4')
  parentCategoryId?: string;

  @ApiPropertyOptional({ description: 'Color representativo' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Icono representativo' })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ description: 'Estado activo de la categoría' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateInventoryDto {
  @ApiPropertyOptional({ description: 'ID del producto asociado' })
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @ApiProperty({ description: 'Nombre del artículo de inventario' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  itemName: string;

  @ApiPropertyOptional({ description: 'SKU del artículo' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Stock actual', example: 50 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  currentStock: number;

  @ApiProperty({ description: 'Stock mínimo', example: 10 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  minimumStock: number;

  @ApiProperty({ description: 'Stock máximo', example: 100 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  maximumStock: number;

  @ApiProperty({ description: 'Unidad de medida', example: 'kg' })
  @IsNotEmpty()
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Costo por unidad', example: 2.50 })
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
  @IsString()
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

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {}