import { TableStatus } from '../enums';
import { BaseEntity } from './user.entity';

export interface Table extends BaseEntity {
  number: number;
  capacity: number;
  status: TableStatus;
  location: string;
  floor?: string;
  isVip?: boolean;
  minimumSpend?: number;
  currentOrderId?: string;
  currentReservationId?: string;
  lastCleanedAt?: string;
  notes?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  amenities?: string[];
}

export interface Reservation extends BaseEntity {
  tableId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  duration: number; // en minutos
  status: string;
  specialRequests?: string;
  confirmationCode: string;
  reminderSent?: boolean;
  actualArrivalTime?: string;
  notes?: string;
  deposit?: {
    amount: number;
    method: string;
    transactionId?: string;
  };
}