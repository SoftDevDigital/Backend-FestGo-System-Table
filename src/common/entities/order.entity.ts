import { OrderStatus } from '../enums';
import { BaseEntity } from './user.entity';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
  modifiers?: OrderModifier[];
  preparationStatus?: string;
  startedPreparingAt?: string;
  finishedPreparingAt?: string;
  servedAt?: string;
}

export interface OrderModifier {
  id: string;
  name: string;
  price: number;
  type: 'add' | 'remove' | 'substitute';
}

export interface Order extends BaseEntity {
  orderNumber: string;
  tableId?: string;
  customerId?: string;
  waiterId?: string;
  chefId?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  tipAmount?: number;
  totalAmount: number;
  status: OrderStatus;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  estimatedPreparationTime?: number;
  actualPreparationTime?: number;
  notes?: string;
  specialRequests?: string;
  startedAt?: string;
  completedAt?: string;
  servedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  rating?: number;
  feedback?: string;
}