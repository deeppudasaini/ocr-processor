import 'reflect-metadata';
import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import 'express-async-errors';

import { serverConfig } from '@config/server';
import { env } from '@config/env';
import { httpLogStream } from '@infra/monitoring/logger';
import { errorHandler } from '@shared/middlewares/error/errorHandler';
import { notFound } from '@shared/middlewares/error/notFound';
import { ocrRoutes } from '@modules/ocr/routes/ocr.routes';

export const createExpressApp = (): Application => {
  const app = express();

  app.use(helmet());

  app.use(cors(serverConfig.cors));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(compression(serverConfig.compression));

  if (env?.NODE_ENV !== 'test') {
    app.use(
      morgan(env?.NODE_ENV === 'development' ? 'dev' : 'combined', {
        stream: httpLogStream,
      }),
    );
  }





  return app;
};

export const applyRoutes = (app: Application): void => {
  const prefix = env?.API_PREFIX;

  app.use(`${prefix}/ocr`, ocrRoutes);

  app.use(notFound);
  app.use(errorHandler);
};
