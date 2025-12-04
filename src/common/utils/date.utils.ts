/**
 * Utilidades para manejo de fechas con timezone de Argentina
 */

export class DateUtils {
  private static readonly ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

  /**
   * Obtiene la fecha actual en Argentina
   */
  static getCurrentDateArgentina(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: this.ARGENTINA_TIMEZONE }));
  }

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD en Argentina
   */
  static getCurrentDateStringArgentina(): string {
    const now = this.getCurrentDateArgentina();
    return now.toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha y hora actual en Argentina en formato ISO
   */
  static getCurrentDateTimeArgentina(): string {
    return this.getCurrentDateArgentina().toISOString();
  }

  /**
   * Convierte una fecha a timezone de Argentina
   */
  static toArgentinaTimezone(date: Date): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: this.ARGENTINA_TIMEZONE }));
  }

  /**
   * Obtiene la fecha máxima permitida para reservas (2 semanas desde hoy)
   */
  static getMaxReservationDate(): Date {
    const today = this.getCurrentDateArgentina();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 14); // 2 semanas = 14 días
    return maxDate;
  }

  /**
   * Obtiene la fecha máxima permitida para reservas en formato YYYY-MM-DD
   */
  static getMaxReservationDateString(): string {
    return this.getMaxReservationDate().toISOString().split('T')[0];
  }

  /**
   * Verifica si una fecha está dentro del rango permitido (hoy hasta 2 semanas)
   */
  static isDateInValidRange(dateString: string): boolean {
    const today = this.getCurrentDateStringArgentina();
    const maxDate = this.getMaxReservationDateString();
    return dateString >= today && dateString <= maxDate;
  }

  /**
   * Verifica si una reserva ya terminó (considerando duración)
   */
  static isReservationEnded(reservationDate: string, reservationTime: string, duration: number): boolean {
    const reservationStart = new Date(`${reservationDate}T${reservationTime}`);
    const reservationEnd = new Date(reservationStart.getTime() + duration * 60000);
    const now = this.getCurrentDateArgentina();
    return now > reservationEnd;
  }

  /**
   * Obtiene el horario de fin de una reserva
   */
  static getReservationEndTime(reservationDate: string, reservationTime: string, duration: number): Date {
    const reservationStart = new Date(`${reservationDate}T${reservationTime}`);
    return new Date(reservationStart.getTime() + duration * 60000);
  }
}


