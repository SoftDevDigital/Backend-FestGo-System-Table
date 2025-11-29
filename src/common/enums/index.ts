export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  WAITER = 'waiter',
  CHEF = 'chef',
  CASHIER = 'cashier',
}

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
  OUT_OF_SERVICE = 'out_of_service',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  TRANSFER = 'transfer',
  DIGITAL_WALLET = 'digital_wallet',
}

export enum BillStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum ProductStatus {
  AVAILABLE = 'available',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  SEASONAL = 'seasonal',
}

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  ARRIVED = 'arrived',
  NO_SHOW = 'no_show',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum MovementType {
  SALE = 'sale',
  EXPENSE = 'expense',
  INVENTORY_PURCHASE = 'inventory_purchase',
  SALARY_PAYMENT = 'salary_payment',
  UTILITY_PAYMENT = 'utility_payment',
  TAX_PAYMENT = 'tax_payment',
  CASH_WITHDRAWAL = 'cash_withdrawal',
  CASH_DEPOSIT = 'cash_deposit',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
}

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
  FULL_DAY = 'full_day',
}

export enum ReservationSource {
  PHONE = 'phone',
  WEBSITE = 'website',
  WALK_IN = 'walk_in',
  THIRD_PARTY = 'third_party',
  MOBILE_APP = 'mobile_app'
}

export enum ReservationPriority {
  NORMAL = 'normal',
  HIGH = 'high',
  VIP = 'vip'
}

export enum NotificationType {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  WHATSAPP = 'whatsapp'
}

export enum ReminderType {
  CONFIRMATION = 'confirmation',
  REMINDER_24H = 'reminder_24h',
  REMINDER_2H = 'reminder_2h',
  SEATING_READY = 'seating_ready',
  FOLLOW_UP = 'follow_up'
}