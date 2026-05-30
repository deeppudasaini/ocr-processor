import 'reflect-metadata';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import { env } from '@config/env';
import { logger } from '@infra/monitoring/logger';
import { errorHandler } from '@shared/middlewares/error/errorHandler';
import { notFound } from '@shared/middlewares/error/notFound';

import { responseHandler } from '@shared/middlewares/response/responseHandler';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  const origins = env?.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(cors({ origin: origins, credentials: env?.CORS_CREDENTIALS }));
  app.disable('x-powered-by');

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  app.use((req, _res, next) => { req.requestId = uuidv4(); next(); });

  app.use(morgan(env?.NODE_ENV === 'development' ? 'dev' : 'combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));

  app.use(responseHandler);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
