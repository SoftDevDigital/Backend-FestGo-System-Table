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
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });

    const result = await this.docClient.send(command);
    return result.Item;
  }

  async put(tableName: string, item: Record<string, any>) {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await this.docClient.send(command);
    return item;
  }

  async update(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
  ) {
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
  }

  async delete(tableName: string, key: Record<string, any>) {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });

    await this.docClient.send(command);
  }

  async scan(
    tableName: string,
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    limit?: number,
    exclusiveStartKey?: Record<string, any>,
  ) {
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
  }

  async batchGet(requestItems: Record<string, any>) {
    const command = new BatchGetCommand({
      RequestItems: requestItems,
    });

    const result = await this.docClient.send(command);
    return result.Responses;
  }

  async batchWrite(requestItems: Record<string, any>) {
    const command = new BatchWriteCommand({
      RequestItems: requestItems,
    });

    const result = await this.docClient.send(command);
    return result.UnprocessedItems;
  }

  getTableName(tableKey: string): string {
    return this.configService.get(`database.dynamodb.tables.${tableKey}`);
  }
}