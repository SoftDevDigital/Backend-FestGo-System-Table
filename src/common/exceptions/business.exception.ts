import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    errorCode?: string,
    details?: any,
  ) {
    super(
      {
        message,
        errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

export class EntityNotFoundException extends BusinessException {
  constructor(entityName: string, id?: string) {
    super(
      `${entityName} ${id ? `con ID ${id}` : ''} no encontrado`,
      HttpStatus.NOT_FOUND,
      'ENTITY_NOT_FOUND',
      { entityName, id },
    );
  }
}

export class DuplicateEntityException extends BusinessException {
  constructor(entityName: string, field: string, value: string) {
    super(
      `Ya existe un ${entityName} con ${field}: ${value}`,
      HttpStatus.CONFLICT,
      'DUPLICATE_ENTITY',
      { entityName, field, value },
    );
  }
}

export class InsufficientStockException extends BusinessException {
  constructor(productName: string, available: number, requested: number) {
    super(
      `Stock insuficiente para ${productName}. Disponible: ${available}, Solicitado: ${requested}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INSUFFICIENT_STOCK',
      { productName, available, requested },
    );
  }
}

export class InvalidOrderStateException extends BusinessException {
  constructor(currentState: string, attemptedAction: string) {
    super(
      `No se puede ${attemptedAction} una orden en estado ${currentState}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INVALID_ORDER_STATE',
      { currentState, attemptedAction },
    );
  }
}

export class PaymentProcessingException extends BusinessException {
  constructor(reason: string, details?: any) {
    super(
      `Error procesando el pago: ${reason}`,
      HttpStatus.PAYMENT_REQUIRED,
      'PAYMENT_PROCESSING_ERROR',
      details,
    );
  }
}

export class TableNotAvailableException extends BusinessException {
  constructor(tableNumber: number, currentStatus: string) {
    super(
      `La mesa ${tableNumber} no está disponible. Estado actual: ${currentStatus}`,
      HttpStatus.CONFLICT,
      'TABLE_NOT_AVAILABLE',
      { tableNumber, currentStatus },
    );
  }
}

export class UnauthorizedOperationException extends BusinessException {
  constructor(operation: string, requiredRole?: string) {
    super(
      `No tiene permisos para realizar: ${operation}${requiredRole ? `. Rol requerido: ${requiredRole}` : ''}`,
      HttpStatus.FORBIDDEN,
      'UNAUTHORIZED_OPERATION',
      { operation, requiredRole },
    );
  }
}