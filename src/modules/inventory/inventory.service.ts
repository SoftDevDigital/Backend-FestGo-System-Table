import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { EntityNotFoundException, InsufficientStockException } from '../../common/exceptions/business.exception';
import { CreateInventoryItemDto, UpdateInventoryItemDto, StockMovementDto, LowStockAlertDto } from './dto/inventory.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly tableName: string;
  private readonly stockMovementsTableName: string;

  constructor(private readonly dynamoDBService: DynamoDBService) {
    this.tableName = this.dynamoDBService.getTableName('inventory_items');
    this.stockMovementsTableName = this.dynamoDBService.getTableName('stock_movements');
  }

  async findAll(lowStockOnly = false) {
    try {
      const result = await this.dynamoDBService.scan(this.tableName);
      let items = result.items;

      if (lowStockOnly) {
        items = items.filter(item => item.currentStock <= item.minimumStock);
      }

      return items;
    } catch (error) {
      this.logger.error(`Error obteniendo inventario: ${error.message}`, error.stack);
      throw new Error(`Error al obtener el inventario: ${error.message || 'Error desconocido'}`);
    }
  }

  async findOne(id: string) {
    try {
      const item = await this.dynamoDBService.get(this.tableName, { id });
      if (!item) {
        throw new EntityNotFoundException('Artículo de inventario', id);
      }
      return item;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.error(`Error obteniendo artículo de inventario ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al obtener el artículo de inventario: ${error.message || 'Error desconocido'}`);
    }
  }

  async create(createInventoryItemDto: CreateInventoryItemDto) {
    try {
      const newItem = {
        id: uuidv4(),
        ...createInventoryItemDto,
        lastStockUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dynamoDBService.put(this.tableName, newItem);
      
      // Registrar movimiento inicial
      await this.recordStockMovement({
        inventoryItemId: newItem.id,
        type: 'adjustment' as any,
        quantity: newItem.currentStock,
        reason: 'inventory_count' as any,
        notes: 'Stock inicial',
      });

      return newItem;
    } catch (error) {
      this.logger.error(`Error creando artículo de inventario: ${error.message}`, error.stack);
      throw new Error(`Error al crear el artículo de inventario: ${error.message || 'Error desconocido'}`);
    }
  }

  async update(id: string, updateInventoryItemDto: UpdateInventoryItemDto) {
    try {
      await this.findOne(id); // Verificar que existe

      let updateExpression = 'SET #updatedAt = :updatedAt';
      const expressionAttributeNames = { '#updatedAt': 'updatedAt' };
      const expressionAttributeValues = { ':updatedAt': new Date().toISOString() };

      // Agregar campos a actualizar dinámicamente
      for (const [key, value] of Object.entries(updateInventoryItemDto)) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpression += `, ${attributeName} = ${attributeValue}`;
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }

      const updatedItem = await this.dynamoDBService.update(
        this.tableName,
        { id },
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      );

      return updatedItem;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.error(`Error actualizando artículo de inventario ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al actualizar el artículo de inventario: ${error.message || 'Error desconocido'}`);
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id); // Verificar que existe
      await this.dynamoDBService.delete(this.tableName, { id });
      return { message: 'Artículo de inventario eliminado correctamente' };
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.error(`Error eliminando artículo de inventario ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al eliminar el artículo de inventario: ${error.message || 'Error desconocido'}`);
    }
  }

  async adjustStock(id: string, newQuantity: number, reason: string, notes?: string) {
    const item = await this.findOne(id);
    const difference = newQuantity - item.currentStock;

    // Actualizar stock
    const updatedItem = await this.update(id, {
      currentStock: newQuantity,
      lastStockUpdate: new Date().toISOString(),
    });

    // Registrar movimiento
    await this.recordStockMovement({
      inventoryItemId: id,
      type: 'adjustment' as any,
      quantity: Math.abs(difference),
      reason: reason as any,
      notes: notes || `Ajuste de inventario: ${difference > 0 ? 'Aumento' : 'Disminución'}`,
    });

    return updatedItem;
  }

  async consumeStock(id: string, quantity: number, reference?: string) {
    try {
      const item = await this.findOne(id);
      
      if (item.currentStock < quantity) {
        throw new InsufficientStockException(item.itemName, item.currentStock, quantity);
      }

      const newStock = item.currentStock - quantity;
      
      const updatedItem = await this.update(id, {
        currentStock: newStock,
        lastStockUpdate: new Date().toISOString(),
      });

      // Registrar movimiento
      await this.recordStockMovement({
        inventoryItemId: id,
        type: 'sale' as any,
        quantity,
        reason: 'customer_sale' as any,
        reference,
        notes: `Consumo por venta`,
      });

      return updatedItem;
    } catch (error) {
      if (error instanceof EntityNotFoundException || error instanceof InsufficientStockException) {
        throw error;
      }
      this.logger.error(`Error consumiendo stock del artículo ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al consumir stock: ${error.message || 'Error desconocido'}`);
    }
  }

  async recordStockMovement(stockMovementDto: StockMovementDto) {
    try {
      const movement = {
        id: uuidv4(),
        ...stockMovementDto,
        movementDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await this.dynamoDBService.put(this.stockMovementsTableName, movement);
      this.logger.log(`Stock movement recorded: ${movement.type} - ${movement.quantity} units`);
      
      return movement;
    } catch (error) {
      // No lanzar error aquí para no interrumpir el flujo principal
      this.logger.warn(`Error registrando movimiento de stock: ${error.message}`);
      return null;
    }
  }

  async getStockMovements(inventoryItemId?: string) {
    if (inventoryItemId) {
      const result = await this.dynamoDBService.query(
        this.stockMovementsTableName,
        'inventoryItemId = :inventoryItemId',
        { '#inventoryItemId': 'inventoryItemId' },
        { ':inventoryItemId': inventoryItemId },
      );
      return result.items;
    }

    const result = await this.dynamoDBService.scan(this.stockMovementsTableName);
    return result.items;
  }

  async getLowStockItems(): Promise<LowStockAlertDto[]> {
    const allItems = await this.findAll();
    
    return allItems
      .filter(item => item.currentStock <= item.minimumStock)
      .map(item => ({
        inventoryItemId: item.id,
        itemName: item.itemName,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        stockPercentage: (item.currentStock / item.minimumStock) * 100,
      }));
  }

  async getInventoryValue() {
    const allItems = await this.findAll();
    
    return allItems.reduce((total, item) => {
      return total + (item.currentStock * item.costPerUnit);
    }, 0);
  }
}