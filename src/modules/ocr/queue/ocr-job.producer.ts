import { BaseProducer } from '@infra/queue/producers/base.producer';
import { OcrProcessingMessage } from '@modules/ocr/types/ocr.types';
import { env } from '@config/env';

export class OcrJobProducer extends BaseProducer {
  private readonly topic = env?.OCR_KAFKA_TOPIC ?? 'ocr.processing';

  async publishOcrJob(message: OcrProcessingMessage): Promise<void> {
    await this.send({
      topic: this.topic,
      messages: [
        {
          key: message.jobId,
          value: JSON.stringify(message),
        },
      ],
    });
  }
}
