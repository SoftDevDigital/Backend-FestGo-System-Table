import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  async getSales() {
    try {
      return [];
    } catch (error) {
      this.logger.error(`Error obteniendo reporte de ventas: ${error.message}`, error.stack);
      throw new Error(`Error al obtener reporte de ventas: ${error.message || 'Error desconocido'}`);
    }
  }
}