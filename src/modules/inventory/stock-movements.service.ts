import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);
  private readonly tableName: string;

  constructor(private readonly dynamoDBService: DynamoDBService) {
    this.tableName = this.dynamoDBService.getTableName('stock_movements');
  }

  async findAll() {
    try {
      const result = await this.dynamoDBService.scan(this.tableName);
      return result.items || [];
    } catch (error) {
      // Solo loguear errores inesperados con stack trace
      this.logger.error(
        `Error inesperado obteniendo movimientos de stock: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Error al obtener movimientos de stock. Por favor, intenta nuevamente.');
    }
  }

  async findByInventoryItem(inventoryItemId: string) {
    try {
      // Validar UUID antes de consultar
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(inventoryItemId)) {
        throw new BadRequestException('El ID del artículo debe ser un UUID válido');
      }

      // Usar scan con FilterExpression ya que inventoryItemId no es la clave primaria
      const result = await this.dynamoDBService.scan(
        this.tableName,
        'inventoryItemId = :inventoryItemId',
        undefined,
        { ':inventoryItemId': inventoryItemId },
      );
      
      return result.items || [];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Solo loguear errores inesperados con stack trace
      this.logger.error(
        `Error inesperado obteniendo movimientos para artículo ${inventoryItemId}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener movimientos del artículo. Verifica que el ID sea válido.');
    }
  }

  async findByDateRange(startDate: string, endDate: string) {
    try {
      // Validar fechas
      if (!startDate || !endDate) {
        throw new BadRequestException('Las fechas de inicio y fin son requeridas');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Las fechas deben tener un formato válido (ISO string)');
      }

      if (start > end) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      const result = await this.dynamoDBService.scan(this.tableName);
      
      return (result.items || []).filter(movement => {
        const movementDate = movement.movementDate;
        return movementDate >= startDate && movementDate <= endDate;
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo movimientos por rango de fechas: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener movimientos por rango de fechas. Verifica que las fechas sean válidas.');
    }
  }

  async findByType(type: string) {
    try {
      if (!type || type.trim() === '') {
        throw new BadRequestException('El tipo de movimiento es requerido');
      }

      const result = await this.dynamoDBService.scan(this.tableName);
      return (result.items || []).filter(movement => movement.type === type);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo movimientos por tipo ${type}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener movimientos por tipo. Verifica que el tipo sea válido.');
    }
  }

  async getMovementsSummary(startDate: string, endDate: string) {
    try {
      const movements = await this.findByDateRange(startDate, endDate);
      
      const summary = {
        totalMovements: movements.length,
        byType: {} as Record<string, number>,
        totalQuantity: 0,
        totalValue: 0,
      };

      for (const movement of movements) {
        // Contar por tipo
        summary.byType[movement.type] = (summary.byType[movement.type] || 0) + 1;
        
        // Sumar cantidades
        summary.totalQuantity += (movement.quantity || 0);
        
        // Sumar valor si existe unitCost
        if (movement.unitCost) {
          summary.totalValue += (movement.quantity || 0) * movement.unitCost;
        }
      }

      return summary;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado generando resumen de movimientos: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al generar resumen de movimientos. Verifica que las fechas sean válidas.');
    }
  }

  async getInventoryItemHistory(inventoryItemId: string, limit = 50) {
    try {
      // Validar UUID antes de consultar
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(inventoryItemId)) {
        throw new BadRequestException('El ID del artículo debe ser un UUID válido');
      }

      // Validar limit
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('El parámetro limit debe ser un número entre 1 y 100');
      }

      const movements = await this.findByInventoryItem(inventoryItemId);
      
      // Validar que limit sea un número válido
      const validLimit = Math.max(1, Math.min(100, limit));
      
      // Ordenar por fecha descendente
      const sortedMovements = [...movements].sort((a, b) => {
        const dateA = a.movementDate ? new Date(a.movementDate).getTime() : 0;
        const dateB = b.movementDate ? new Date(b.movementDate).getTime() : 0;
        return dateB - dateA;
      });
      
      return sortedMovements.slice(0, validLimit);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Solo loguear errores inesperados
      this.logger.error(
        `Error inesperado obteniendo historial para artículo ${inventoryItemId}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener historial del artículo. Verifica que el ID sea válido.');
    }
  }

  async getTopMovingItems(days = 30, limit = 10) {
    try {
      // Validar parámetros
      if (isNaN(days) || days < 1 || days > 365) {
        throw new BadRequestException('El parámetro days debe ser un número entre 1 y 365');
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('El parámetro limit debe ser un número entre 1 y 100');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const movements = await this.findByDateRange(
        startDate.toISOString(),
        new Date().toISOString()
      );

      const itemMovements = movements.reduce((acc, movement) => {
        const itemId = movement.inventoryItemId;
        if (!itemId) return acc;

        if (!acc[itemId]) {
          acc[itemId] = {
            inventoryItemId: itemId,
            totalQuantity: 0,
            movementCount: 0,
            lastMovement: movement.movementDate || '',
          };
        }
        
        acc[itemId].totalQuantity += (movement.quantity || 0);
        acc[itemId].movementCount += 1;
        
        if (movement.movementDate && movement.movementDate > acc[itemId].lastMovement) {
          acc[itemId].lastMovement = movement.movementDate;
        }
        
        return acc;
      }, {} as Record<string, any>);

      const topItems = Object.values(itemMovements)
        .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
        .slice(0, limit);

      return topItems;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo artículos con más movimiento: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener artículos con más movimiento. Verifica que los parámetros sean válidos.');
    }
  }
}