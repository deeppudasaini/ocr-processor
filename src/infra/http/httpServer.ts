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

  // ─── Security Headers ──────────────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ──────────────────────────────────────────────────────────────
  app.use(cors(serverConfig.cors));

  // ─── Body Parsing ──────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── Compression ───────────────────────────────────────────────────────
  app.use(compression(serverConfig.compression));

  // ─── HTTP Request Logging ──────────────────────────────────────────────
  if (env?.NODE_ENV !== 'test') {
    app.use(
      morgan(env?.NODE_ENV === 'development' ? 'dev' : 'combined', {
        stream: httpLogStream,
      }),
    );
  }

  // ─── Rate Limiting ─────────────────────────────────────────────────────
  // (Removed as requested)

  // ─── Trust Proxy (for rate limiting / IP behind reverse proxy) ─────────
  app.set('trust proxy', 1);

  // ─── Request ID Injection ──────────────────────────────────────────────
  app.use((req, _res, next) => {
    req.headers['x-request-id'] ??= crypto.randomUUID();
    next();
  });

  return app;
};

export const applyRoutes = (app: Application): void => {
  const prefix = env?.API_PREFIX;

  // ─── Module Routes ──────────────────────────────────────────────────────
  app.use(`${prefix}/ocr`, ocrRoutes);
  // app.use(`${prefix}/auth`, authRoutes);   // wire when module is ready
  // app.use(`${prefix}/users`, userRoutes);  // wire when module is ready

  // ─── 404 + Error Handling (must be last) ────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);
};
