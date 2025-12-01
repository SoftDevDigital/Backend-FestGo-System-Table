import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);

  async uploadFile(file: any) {
    try {
      // Implementar lógica de S3
      return { url: 'https://example.com/file.jpg' };
    } catch (error) {
      this.logger.error(`Error subiendo archivo a S3: ${error.message}`, error.stack);
      throw new Error(`Error al subir archivo: ${error.message || 'Error desconocido'}`);
    }
  }
}