import { Injectable } from '@nestjs/common';

@Injectable()
export class S3Service {
  async uploadFile(file: any) {
    // Implementar lógica de S3
    return { url: 'https://example.com/file.jpg' };
  }
}