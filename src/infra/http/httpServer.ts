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


export const applyRoutes = (app: Application): void => {
  const prefix = env?.API_PREFIX;

  app.use(`${prefix}/ocr`, ocrRoutes);

  app.use(notFound);
  app.use(errorHandler);
};
