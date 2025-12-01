import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  async findAll() {
    try {
      return [];
    } catch (error) {
      this.logger.error(`Error obteniendo pedidos: ${error.message}`, error.stack);
      throw new Error(`Error al obtener pedidos: ${error.message || 'Error desconocido'}`);
    }
  }
}