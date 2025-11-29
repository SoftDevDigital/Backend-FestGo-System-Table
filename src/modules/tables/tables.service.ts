import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TablesService {
  private readonly tableName = 'grove_system_tables';

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async findAll() {
    const result = await this.dynamoDBService.scan(this.tableName);
    return result.items;
  }

  async findOne(id: string) {
    const table = await this.dynamoDBService.get(this.tableName, { id });
    if (!table) {
      throw new Error('Mesa no encontrada');
    }
    return table;
  }

  async create(createTableDto: CreateTableDto) {
    const newTable = {
      id: uuidv4(),
      ...createTableDto,
      status: 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.dynamoDBService.put(this.tableName, newTable);
    return newTable;
  }

  async update(id: string, updateTableDto: UpdateTableDto) {
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
  }

  async remove(id: string) {
    await this.findOne(id); // Verificar que existe
    await this.dynamoDBService.delete(this.tableName, { id });
    return { message: 'Mesa eliminada correctamente' };
  }
}