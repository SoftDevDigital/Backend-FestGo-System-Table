import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  async findAll() {
    try {
      return [];
    } catch (error) {
      this.logger.error(`Error obteniendo productos: ${error.message}`, error.stack);
      throw new Error(`Error al obtener productos: ${error.message || 'Error desconocido'}`);
    }
  }
}