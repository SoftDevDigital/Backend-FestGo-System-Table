import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  async findAll() {
    try {
      return [];
    } catch (error) {
      this.logger.error(`Error obteniendo facturas: ${error.message}`, error.stack);
      throw new Error(`Error al obtener facturas: ${error.message || 'Error desconocido'}`);
    }
  }
}