import { createApp } from './app';
import { logger } from '@infra/monitoring/logger';
import { AppDataSource } from '@infra/database/typeorm/data-source';
import { OcrJobConsumer } from '@modules/ocr/workers/consumers/ocr-job.consumer';
import { env } from '@config/env';
import { ocrRoutes } from '@modules/ocr/routes/ocr.routes';
import { responseHandler } from '@shared/middlewares/response/responseHandler';
import { notFound } from '@shared/middlewares/error/notFound';
import { errorHandler } from '@shared/middlewares/error/errorHandler';

async function main() {
  try {
    await AppDataSource.initialize();
    logger.info('Database initialized successfully');

    const consumer = new OcrJobConsumer();
    const topic = env?.OCR_KAFKA_TOPIC ?? 'ocr.processing';

    await consumer.connect();
    await consumer.subscribe([topic]);
    await consumer.run();

    logger.info(`Kafka consumer connected and subscribed to ${topic}`);

    const app = createApp();


    const prefix = env?.API_PREFIX;

    app.use(`${prefix}/ocr`, ocrRoutes);
    app.use(responseHandler);
    app.use(notFound);
    app.use(errorHandler);

    const port = env?.PORT || 3000;

    app.listen(port, () => {
      logger.info(`[Server] Listening on port ${port}`);
    });

  } catch (err: any) {
    logger.error('Fatal startup error:', err.message);
    process.exit(1);
  }
}

main();
