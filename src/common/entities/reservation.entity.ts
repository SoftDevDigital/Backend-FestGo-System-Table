import { ReservationStatus, ReservationSource, ReservationPriority, NotificationType } from '../enums';

export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  allergies?: string[];
  dietaryRestrictions?: string[];
  preferences?: string[];
  totalVisits: number;
  totalSpent: number;
  averageSpent: number;
  lastVisit?: string;
  vipStatus: boolean;
  notes?: string[];
  tags?: string[];
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    phone: boolean;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  // Campos de auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Reservation {
  reservationId: string;
  confirmationCode: string;
  customerId: string;
  customerDetails: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
  };
  tableId?: string;
  tableNumber?: number;
  partySize: number;
  preferredSeatingArea?: string;
  reservationDate: string;
  reservationTime: string;
  duration: number; // in minutes
  status: ReservationStatus;
  source: ReservationSource;
  priority: ReservationPriority;
  specialRequests?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  occasion?: string; // birthday, anniversary, business, etc.
  notes?: string;
  internalNotes?: string[];
  tags?: string[];
  assignedHost?: string;
  seatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  noShowAt?: string;
  estimatedSpend?: number;
  actualSpend?: number;
  deposit?: {
    required: boolean;
    amount: number;
    paid: boolean;
    paidAt?: string;
    refunded?: boolean;
    refundedAt?: string;
  };
  remindersSent: string[]; // Array of reminder types sent
  lastReminderSent?: string;
  waitlistPosition?: number;
  // Campos de auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TableAvailability {
  tableId: string;
  tableNumber: number;
  capacity: number;
  minCapacity: number;
  maxCapacity: number;
  seatingArea: string;
  position: {
    x: number;
    y: number;
  };
  features: string[]; // window, patio, booth, etc.
  isAccessible: boolean;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'blocked';
  currentReservationId?: string;
  nextAvailableTime?: string;
  blockReasons?: string[];
  maintenanceNotes?: string;
  // Campos de auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TimeSlot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  maxCovers: number;
  currentBookings: number;
  availableCapacity: number;
  isBlocked: boolean;
  blockReason?: string;
  priceModifier?: number; // 1.0 = normal, 1.2 = 20% premium, etc.
  minimumPartySize?: number;
  maximumPartySize?: number;
  // Campos de auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface WaitlistEntry {
  waitlistId: string;
  customerId: string;
  customerDetails: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  partySize: number;
  requestedDate: string;
  requestedTime?: string;
  timeFlexibility: number; // minutes before/after preferred time
  position: number;
  status: 'waiting' | 'contacted' | 'converted' | 'cancelled' | 'expired';
  addedAt: string;
  contactedAt?: string;
  expiresAt: string;
  convertedReservationId?: string;
  priority?: 'low' | 'normal' | 'high';
  specialRequests?: string[];
  notificationPreferences?: string[];
  notes?: string;
  // Campos de auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ReservationNotification {
  notificationId: string;
  reservationId: string;
  customerId: string;
  type: NotificationType;
  purpose: 'confirmation' | 'reminder' | 'update' | 'cancellation';
  recipient: string; // phone number or email
  subject?: string;
  message: string;
  scheduledFor: string;
  sentAt?: string;
  deliveredAt?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  // Campos de auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}