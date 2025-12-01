import { Injectable, Logger } from '@nestjs/common';
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
      return result.items;
    } catch (error) {
      this.logger.error(`Error obteniendo movimientos de stock: ${error.message}`, error.stack);
      throw new Error(`Error al obtener movimientos de stock: ${error.message || 'Error desconocido'}`);
    }
  }

  async findByInventoryItem(inventoryItemId: string) {
    try {
      const result = await this.dynamoDBService.query(
        this.tableName,
        'inventoryItemId = :inventoryItemId',
        { '#inventoryItemId': 'inventoryItemId' },
        { ':inventoryItemId': inventoryItemId },
      );
      
      return result.items;
    } catch (error) {
      this.logger.error(`Error obteniendo movimientos para artículo ${inventoryItemId}: ${error.message}`, error.stack);
      throw new Error(`Error al obtener movimientos del artículo: ${error.message || 'Error desconocido'}`);
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
    const movements = await this.findByInventoryItem(inventoryItemId);
    
    // Ordenar por fecha descendente
    const sortedMovements = [...movements].sort((a, b) => 
      new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
    );
    
    return sortedMovements.slice(0, limit);
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