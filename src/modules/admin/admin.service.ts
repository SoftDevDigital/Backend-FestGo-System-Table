import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  async getDashboard() {
    try {
      return { message: 'Admin Dashboard' };
    } catch (error) {
      this.logger.error(`Error obteniendo dashboard: ${error.message}`, error.stack);
      throw new Error(`Error al obtener el dashboard: ${error.message || 'Error desconocido'}`);
    }
  }
}