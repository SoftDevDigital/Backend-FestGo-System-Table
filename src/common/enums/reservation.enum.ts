export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
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