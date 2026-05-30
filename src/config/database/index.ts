import { env } from '@config/env';
import type { DataSourceOptions } from 'typeorm';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: env?.DB_HOST,
  port: env?.DB_PORT,
  username: env?.DB_USERNAME,
  password: env?.DB_PASSWORD,
  database: env?.DB_NAME,
  schema: env?.DB_SCHEMA,
  ssl: env?.DB_SSL ? { rejectUnauthorized: false } : false,
  synchronize: env?.DB_SYNCHRONIZE,
  logging: env?.DB_LOGGING,
  entities: [__dirname + '/../../modules/**/models/*.model.{ts,js}'],
  migrations: [__dirname + '/../../infra/database/migrations/*.{ts,js}'],
  subscribers: [],
  poolSize: env?.DB_POOL_SIZE,
  extra: {
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  },
};
