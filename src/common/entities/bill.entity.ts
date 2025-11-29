import { BillStatus, PaymentMethod } from '../enums';
import { BaseEntity } from './user.entity';

export interface PaymentDetail {
  id: string;
  method: PaymentMethod;
  amount: number;
  transactionId?: string;
  cardLastFour?: string;
  cardType?: string;
  authorizationCode?: string;
  processedAt: string;
  processorResponse?: string;
  refunded?: boolean;
  refundAmount?: number;
  refundedAt?: string;
  refundReason?: string;
}

export interface Bill extends BaseEntity {
  billNumber: string;
  orderId: string;
  tableId?: string;
  customerId?: string;
  cashierId?: string;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discountAmount?: number;
  discountPercentage?: number;
  discountReason?: string;
  tipAmount?: number;
  serviceChargeAmount?: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount?: number;
  status: BillStatus;
  paymentDetails: PaymentDetail[];
  fiscalNumber?: string;
  fiscalUrl?: string;
  printedAt?: string;
  emailSent?: boolean;
  customerEmail?: string;
  notes?: string;
  dueDate?: string;
}

export interface Receipt {
  id: string;
  billId: string;
  receiptNumber: string;
  content: string; // HTML or plain text for thermal printer
  printedAt?: string;
  reprints?: number;
  type: 'customer' | 'kitchen' | 'merchant';
}