import 'tsconfig-paths/register';
import { createApp } from './app';
import { logger } from '@infra/monitoring/logger';
import { AppDataSource } from '@infra/database/typeorm/data-source';
import { OcrJobConsumer } from '@modules/ocr/workers/consumers/ocr-job.consumer';
import { env } from '@config/env';
import { applyRoutes } from '@infra/http/httpServer';

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

    applyRoutes(app);

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
