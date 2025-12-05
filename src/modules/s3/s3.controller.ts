import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiCreatedResponse, ApiBadRequestResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { S3Service } from './s3.service';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@ApiTags('files')
@Controller('files')
export class S3Controller {
  private readonly logger = new Logger(S3Controller.name);

  constructor(private readonly s3Service: S3Service) {}

  @Post('upload')
  @AdminOrEmployee()
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: '📤 Subir archivo 🔐',
    description: `**🔐 PROTEGIDO - Autenticación JWT requerida**
    **👥 Roles permitidos:** Admin, Empleado
    
    Sube un archivo a S3 y retorna la URL del archivo subido.
    
    **Nota:** Debes autenticarte primero usando el endpoint POST /auth/login y luego usar el token en el botón "Authorize" de Swagger.`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir (imagen, documento, etc.)',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: '✅ Archivo subido exitosamente',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        message: 'Archivo subido exitosamente',
        data: {
          url: 'https://example.com/file.jpg',
          filename: 'imagen.jpg',
          size: 1024,
        },
      },
    },
  })
  @ApiBadRequestResponse({ 
    description: '❌ Error: Archivo no proporcionado o inválido',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'No se proporcionó ningún archivo',
        errorCode: 'VALIDATION_ERROR',
      },
    },
  })
  @ApiUnauthorizedResponse({ 
    description: '❌ Error: Token inválido o expirado',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        message: 'Token inválido o expirado',
        errorCode: 'UNAUTHORIZED',
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<SuccessResponse<any>> {
    try {
      if (!file) {
        throw new BadRequestException('No se proporcionó ningún archivo. Asegúrate de seleccionar un archivo en el campo "file".');
      }

      const result = await this.s3Service.uploadFile(file);
      return {
        success: true,
        message: 'Archivo subido exitosamente',
        data: {
          url: result.url,
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error subiendo archivo: ${error.message}`, error instanceof Error ? error.stack : undefined);
      throw new BadRequestException('Error al subir el archivo. Verifica que el archivo sea válido.');
    }
  }
}