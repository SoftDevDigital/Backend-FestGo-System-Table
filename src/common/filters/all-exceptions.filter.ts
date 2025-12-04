import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let message: string;
    let errorCode: string | undefined;
    let details: any;

    if (exception instanceof BusinessException) {
      const errorResponse = exception.getResponse() as any;
      status = exception.getStatus();
      message = errorResponse.message;
      errorCode = errorResponse.errorCode;
      details = errorResponse.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      
      if (typeof errorResponse === 'object' && errorResponse !== null) {
        message = (errorResponse as any).message || exception.message;
        details = errorResponse;
      } else {
        message = errorResponse as string;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor'
        : exception.message;
      details = process.env.NODE_ENV !== 'production' ? {
        stack: exception.stack,
        name: exception.name,
      } : undefined;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor';
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      errorCode,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(process.env.NODE_ENV !== 'production' && {
        requestId: request.headers['x-request-id'],
      }),
    };

    // Log error details
    // Solo loguear errores del servidor (5xx) con stack traces
    // Errores del cliente (4xx) son esperados y no necesitan stack traces
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else if (status >= 400 && process.env.NODE_ENV !== 'production') {
      // En desarrollo, loguear errores 4xx como debug (sin stack trace)
      this.logger.debug(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}