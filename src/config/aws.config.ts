import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => {
  // Normalizamos el prefijo para que siempre termine en "_"
  const rawPrefix = process.env.DYNAMODB_TABLES_PREFIX || 'table_system_festgo_';
  const tablesPrefix = rawPrefix.endsWith('_') ? rawPrefix : `${rawPrefix}_`;

  return {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucketName: process.env.S3_BUCKET_NAME || 'grove-system-storage',
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    },
    dynamodb: {
      region: process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT,
      tablesPrefix,
    },
  };
});