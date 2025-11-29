import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  // Normalizamos el prefijo para que siempre termine en "_"
  const rawPrefix = process.env.DYNAMODB_TABLES_PREFIX || 'table_system_festgo_';
  const tablesPrefix = rawPrefix.endsWith('_') ? rawPrefix : `${rawPrefix}_`;

  return {
    dynamodb: {
      region: process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT,
      tablesPrefix,
      tables: {
        users: `${tablesPrefix}users`,
        tables: `${tablesPrefix}tables`,
        products: `${tablesPrefix}products`,
        orders: `${tablesPrefix}orders`,
        bills: `${tablesPrefix}bills`,
        movements: `${tablesPrefix}movements`,
        categories: `${tablesPrefix}categories`,
        settings: `${tablesPrefix}settings`,
      },
    },
  };
});