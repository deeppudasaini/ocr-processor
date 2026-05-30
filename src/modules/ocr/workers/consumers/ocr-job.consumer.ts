import { EachMessagePayload } from 'kafkajs';
import { BaseConsumer } from '@infra/queue/consumers/base.consumer';
import { logger } from '@infra/monitoring/logger';
import { OcrProcessingMessage } from '@modules/ocr/workers/dtos/ocr-processing.message';
import ocrProcessorRegistry from '@modules/ocr/workers/registry/ocr.registry';

export class OcrJobConsumer extends BaseConsumer {
  constructor() {
    super('ocr-job-worker-group');
  }

  protected async handleMessage(payload: EachMessagePayload): Promise<void> {
    if (!payload.message.value) {
      logger.warn('[OcrJobConsumer] Received message with no value');
      return;
    }

    const value = payload.message.value.toString();

    try {
      const message = JSON.parse(value) as OcrProcessingMessage;
      logger.info(`[OcrJobConsumer] Received job ${message.jobId} for extractor ${message.extractor}`);

      await ocrProcessorRegistry.processOcrProcessing(message);

    } catch (error) {
      logger.error(`[OcrJobConsumer] Error processing message: ${(error as Error).message}`, {
        value,
      });
    }
  }
}
