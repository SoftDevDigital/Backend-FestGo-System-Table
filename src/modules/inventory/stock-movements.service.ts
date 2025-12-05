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
      // Usar scan con FilterExpression ya que inventoryItemId no es la clave primaria
      const result = await this.dynamoDBService.scan(
        this.tableName,
        'inventoryItemId = :inventoryItemId',
        undefined,
        { ':inventoryItemId': inventoryItemId },
      );
      
      return result.items || [];
    } catch (error) {
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
      const result = await this.dynamoDBService.scan(this.tableName);
      
      return result.items.filter(movement => {
        const movementDate = movement.movementDate;
        return movementDate >= startDate && movementDate <= endDate;
      });
    } catch (error) {
      this.logger.error(`Error obteniendo movimientos por rango de fechas: ${error.message}`, error.stack);
      throw new Error(`Error al obtener movimientos por rango de fechas: ${error.message || 'Error desconocido'}`);
    }
  }

  async findByType(type: string) {
    try {
      const result = await this.dynamoDBService.scan(this.tableName);
      return result.items.filter(movement => movement.type === type);
    } catch (error) {
      this.logger.error(`Error obteniendo movimientos por tipo ${type}: ${error.message}`, error.stack);
      throw new Error(`Error al obtener movimientos por tipo: ${error.message || 'Error desconocido'}`);
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
        summary.totalQuantity += movement.quantity;
        
        // Sumar valor si existe unitCost
        if (movement.unitCost) {
          summary.totalValue += movement.quantity * movement.unitCost;
        }
      }

      return summary;
    } catch (error) {
      this.logger.error(`Error generando resumen de movimientos: ${error.message}`, error.stack);
      throw new Error(`Error al generar resumen de movimientos: ${error.message || 'Error desconocido'}`);
    }
  }

  async getInventoryItemHistory(inventoryItemId: string, limit = 50) {
    try {
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const movements = await this.findByDateRange(
      startDate.toISOString(),
      new Date().toISOString()
    );

    const itemMovements = movements.reduce((acc, movement) => {
      const itemId = movement.inventoryItemId;
      if (!acc[itemId]) {
        acc[itemId] = {
          inventoryItemId: itemId,
          totalQuantity: 0,
          movementCount: 0,
          lastMovement: movement.movementDate,
        };
      }
      
      acc[itemId].totalQuantity += movement.quantity;
      acc[itemId].movementCount += 1;
      
      if (movement.movementDate > acc[itemId].lastMovement) {
        acc[itemId].lastMovement = movement.movementDate;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const topItems = Object.values(itemMovements)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);

    return topItems;
  }
}