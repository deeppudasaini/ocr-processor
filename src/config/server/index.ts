import { env } from '@config/env';

export const serverConfig = {
  port: env?.PORT,
  apiPrefix: env?.API_PREFIX,
  cors: {
    origins: env?.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: env?.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID'] as string[],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'] as string[],
  },
  compression: {
    level: 6,
    threshold: 1024,
  },
} as const;
