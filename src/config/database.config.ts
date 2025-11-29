import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  dynamodb: {
    region: process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT,
    tablesPrefix: process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_',
    tables: {
      users: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}users`,
      tables: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}tables`,
      products: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}products`,
      orders: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}orders`,
      bills: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}bills`,
      movements: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}movements`,
      categories: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}categories`,
      settings: `${process.env.DYNAMODB_TABLES_PREFIX || 'grove_system_'}settings`,
    },
  },
}));