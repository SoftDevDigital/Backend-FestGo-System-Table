import { ProductStatus } from '../enums';
import { BaseEntity } from './user.entity';

export interface Category extends BaseEntity {
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  parentCategoryId?: string;
  color?: string;
  icon?: string;
}

export interface Product extends BaseEntity {
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  categoryId: string;
  sku?: string;
  barcode?: string;
  status: ProductStatus;
  imageUrl?: string;
  images?: string[];
  isAvailable: boolean;
  preparationTime: number; // en minutos
  calories?: number;
  allergens?: string[];
  ingredients?: string[];
  nutritionalInfo?: {
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
  };
  tags?: string[];
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  spicyLevel?: number; // 1-5
  isPopular?: boolean;
  discountPercentage?: number;
  minimumAge?: number;
}

export interface ProductVariant extends BaseEntity {
  productId: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

export interface Inventory extends BaseEntity {
  productId?: string;
  itemName: string;
  sku?: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string; // kg, liters, pieces, etc.
  costPerUnit: number;
  supplierId?: string;
  lastStockUpdate: string;
  expirationDate?: string;
  location?: string;
  notes?: string;
}