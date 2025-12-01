import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private readonly logger = new Logger(DynamoDBService.name);

  constructor(private configService: ConfigService) {
    this.logger.log('🔧 Iniciando configuración de DynamoDBClient...');
    const region = this.configService.get('aws.region');
    const endpoint = this.configService.get('aws.dynamodb.endpoint');

    this.client = new DynamoDBClient({
      region,
      ...(endpoint && { endpoint }),
      ...(process.env.AWS_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }),
    });

    this.docClient = DynamoDBDocumentClient.from(this.client);
    this.logger.log(
      `✅ DynamoDBClient configurado (region=${region}, endpoint=${endpoint ?? 'default'})`,
    );
  }

  async get(tableName: string, key: Record<string, any>) {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key,
      });

      const result = await this.docClient.send(command);
      return result.Item;
    } catch (error) {
      this.logger.error(`Error obteniendo item de tabla ${tableName}`, error.stack);
      throw new Error(`Error al obtener registro de la tabla ${tableName}: ${error.message || 'Error desconocido'}`);
    }
  }

  async put(tableName: string, item: Record<string, any>) {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item,
      });

      await this.docClient.send(command);
      return item;
    } catch (error) {
      this.logger.error(`Error insertando item en tabla ${tableName}`, error.stack);
      throw new Error(`Error al insertar registro en la tabla ${tableName}: ${error.message || 'Error desconocido'}`);
    }
  }

  async update(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
  ) {
    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.docClient.send(command);
      return result.Attributes;
    } catch (error) {
      this.logger.error(`Error actualizando item en tabla ${tableName}`, error.stack);
      throw new Error(`Error al actualizar registro en la tabla ${tableName}: ${error.message || 'Error desconocido'}`);
    }
  }

  async delete(tableName: string, key: Record<string, any>) {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key,
      });

      await this.docClient.send(command);
    } catch (error) {
      this.logger.error(`Error eliminando item de tabla ${tableName}`, error.stack);
      throw new Error(`Error al eliminar registro de la tabla ${tableName}: ${error.message || 'Error desconocido'}`);
    }
  }

  async scan(
    tableName: string,
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    limit?: number,
    exclusiveStartKey?: Record<string, any>,
  ) {
    try {
      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      });

      const result = await this.docClient.send(command);
      return {
        items: result.Items,
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count,
      };
    } catch (error) {
      this.logger.error(`Error escaneando tabla ${tableName}`, error.stack);
      throw new Error(`Error al escanear la tabla ${tableName}: ${error.message || 'Error desconocido'}`);
    }
  }

  async query(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    filterExpression?: string,
    indexName?: string,
    limit?: number,
    exclusiveStartKey?: Record<string, any>,
    scanIndexForward?: boolean,
  ) {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
        ScanIndexForward: scanIndexForward,
      });

      const result = await this.docClient.send(command);
      return {
        items: result.Items,
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count,
      };
    } catch (error) {
      this.logger.error(`Error consultando tabla ${tableName}`, error.stack);
      throw new Error(`Error al consultar la tabla ${tableName}: ${error.message || 'Error desconocido'}`);
    }
  }

  async batchGet(requestItems: Record<string, any>) {
    try {
      const command = new BatchGetCommand({
        RequestItems: requestItems,
      });

      const result = await this.docClient.send(command);
      return result.Responses;
    } catch (error) {
      this.logger.error('Error en operación batchGet', error.stack);
      throw new Error(`Error al obtener múltiples registros: ${error.message || 'Error desconocido'}`);
    }
  }

  async batchWrite(requestItems: Record<string, any>) {
    try {
      const command = new BatchWriteCommand({
        RequestItems: requestItems,
      });

      const result = await this.docClient.send(command);
      return result.UnprocessedItems;
    } catch (error) {
      this.logger.error('Error en operación batchWrite', error.stack);
      throw new Error(`Error al escribir múltiples registros: ${error.message || 'Error desconocido'}`);
    }
  }

  getTableName(tableKey: string): string {
    return this.configService.get(`database.dynamodb.tables.${tableKey}`);
  }
}