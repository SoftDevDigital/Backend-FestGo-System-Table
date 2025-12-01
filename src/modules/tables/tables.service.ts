import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);
  private readonly tableName: string;

  constructor(private readonly dynamoDBService: DynamoDBService) {
    // Usamos el prefijo configurado (DYNAMODB_TABLES_PREFIX) en lugar de un nombre fijo
    this.tableName = this.dynamoDBService.getTableName('tables');
  }

  async findAll() {
    try {
      const result = await this.dynamoDBService.scan(this.tableName);
      return result.items;
    } catch (error) {
      this.logger.error(`Error obteniendo todas las mesas: ${error.message}`, error.stack);
      throw new Error(`Error al obtener la lista de mesas: ${error.message || 'Error desconocido'}`);
    }
  }

  async findOne(id: string) {
    try {
      const table = await this.dynamoDBService.get(this.tableName, { id });
      if (!table) {
        throw new NotFoundException(`Mesa con ID ${id} no encontrada`);
      }
      return table;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error obteniendo mesa ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al obtener la mesa: ${error.message || 'Error desconocido'}`);
    }
  }

  async create(createTableDto: CreateTableDto) {
    try {
      const newTable = {
        id: uuidv4(),
        ...createTableDto,
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dynamoDBService.put(this.tableName, newTable);
      return newTable;
    } catch (error) {
      this.logger.error(`Error creando mesa: ${error.message}`, error.stack);
      throw new Error(`Error al crear la mesa: ${error.message || 'Error desconocido'}`);
    }
  }

  async update(id: string, updateTableDto: UpdateTableDto) {
    try {
      await this.findOne(id); // Verificar que existe
      
      let updateExpression = 'SET #updatedAt = :updatedAt';
      const expressionAttributeNames = { '#updatedAt': 'updatedAt' };
      const expressionAttributeValues = { ':updatedAt': new Date().toISOString() };

      // Agregar campos a actualizar dinámicamente
      for (const [key, value] of Object.entries(updateTableDto)) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpression += `, ${attributeName} = ${attributeValue}`;
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }

      const updatedTable = await this.dynamoDBService.update(
        this.tableName,
        { id },
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      );

      return updatedTable;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error actualizando mesa ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al actualizar la mesa: ${error.message || 'Error desconocido'}`);
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id); // Verificar que existe
      await this.dynamoDBService.delete(this.tableName, { id });
      return { message: 'Mesa eliminada correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error eliminando mesa ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al eliminar la mesa: ${error.message || 'Error desconocido'}`);
    }
  }
}