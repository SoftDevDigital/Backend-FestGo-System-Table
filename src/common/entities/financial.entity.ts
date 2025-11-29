import { MovementType } from '../enums';
import { BaseEntity } from './user.entity';

export interface FinancialMovement extends BaseEntity {
  movementNumber: string;
  type: MovementType;
  amount: number;
  description: string;
  category?: string;
  subcategory?: string;
  reference?: string;
  billId?: string;
  orderId?: string;
  employeeId?: string;
  supplierId?: string;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
}

export interface CashRegister extends BaseEntity {
  registerId: string;
  openedBy: string;
  closedBy?: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  discrepancy?: number;
  openedAt: string;
  closedAt?: string;
  shift: string;
  movements: string[]; // Array of movement IDs
  notes?: string;
  status: 'open' | 'closed';
}

export interface DailySummary extends BaseEntity {
  date: string;
  totalSales: number;
  totalExpenses: number;
  netIncome: number;
  orderCount: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  paymentMethodBreakdown: Record<string, number>;
  hourlyBreakdown: Array<{
    hour: number;
    sales: number;
    orders: number;
  }>;
  employeePerformance: Array<{
    employeeId: string;
    employeeName: string;
    ordersServed: number;
    totalSales: number;
    tips: number;
  }>;
}