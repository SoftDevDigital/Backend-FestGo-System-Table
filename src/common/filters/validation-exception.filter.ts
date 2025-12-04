import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as any;
    
    let message: string;
    let validationErrors: any;

    if (Array.isArray(exceptionResponse.message)) {
      // Class-validator errors
      message = 'Errores de validación en los datos enviados';
      validationErrors = this.formatValidationErrors(exceptionResponse.message);
    } else {
      message = exceptionResponse.message || 'Solicitud inválida';
      validationErrors = exceptionResponse;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      errorCode: 'VALIDATION_ERROR',
      validationErrors,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Solo loguear errores de validación en desarrollo o si son críticos
    // No loguear errores de validación normales (son esperados del cliente)
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `Validation Error: ${request.method} ${request.url} - ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(errors: string[]): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    errors.forEach(error => {
      // Extract property name from error message
      const propertyMatch = error.match(/property (\w+)/);
      const property = propertyMatch ? propertyMatch[1] : 'unknown';

      if (!formattedErrors[property]) {
        formattedErrors[property] = [];
      }
      formattedErrors[property].push(error);
    });

    return formattedErrors;
  }
}