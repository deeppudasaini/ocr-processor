import 'dotenv/config';
import { z } from 'zod';
import * as process from 'process';
import * as console from 'console';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('my-api'),
  APP_VERSION: z.string().default('1.0.0'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('my_api_db'),
  DB_SCHEMA: z.string().default('public'),
  DB_SSL: z.coerce.boolean().default(false),
  DB_SYNCHRONIZE: z.coerce.boolean().default(false),
  DB_LOGGING: z.coerce.boolean().default(false),
  DB_POOL_SIZE: z.coerce.number().default(10),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TTL: z.coerce.number().default(3600),
  REDIS_KEY_PREFIX: z.string().default('my-api:'),

  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('my-api'),
  KAFKA_GROUP_ID: z.string().default('my-api-group'),
  KAFKA_SSL: z.coerce.boolean().default(false),
  KAFKA_SASL_MECHANISM: z.string().optional(),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),

  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().default('my-api-bucket'),
  MINIO_ENDPOINT: z.string().optional(),

  LOCAL_STORAGE_PATH: z.string().default('./uploads'),
  LOCAL_STORAGE_BASE_URL: z.string().default('http://localhost:3000/uploads'),

  STORAGE_TYPE: z.enum(['local', 'minio']).default('local'),
  VEDAS_OCR_API_URL: z.string().default('https://pos-ocr.vedastudios.com.np/api/v1/extract'),
  OCR_KAFKA_TOPIC: z.string().default('ocr.processing'),
  OCR_JOB_CACHE_TTL: z.coerce.number().default(86400),


  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('debug'),
  LOG_DIR: z.string().default('logs'),
  LOG_MAX_FILES: z.string().default('14d'),
  LOG_MAX_SIZE: z.string().default('20m'),
});

const _env = envSchema.safeParse(process.env);

if (!_env?.success) {
  console.log('Invalid environment variables:');
  console.log(JSON.stringify(_env?.error.format(), null, 2));
  process.exit(1);
}

export const env = _env?.data;

export type Env = z.infer<typeof envSchema>;
