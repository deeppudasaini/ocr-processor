import { Producer, ProducerRecord } from 'kafkajs';
import { getKafkaClient } from '@infra/queue/kafka/kafka.client';
import { logger } from '@infra/monitoring/logger';

export abstract class BaseProducer {
  protected producer: Producer;

  constructor() {
    this.producer = getKafkaClient().producer({
      allowAutoTopicCreation: true,
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    logger.info(`[Producer] ${this.constructor.name} connected`);
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    logger.info(`[Producer] ${this.constructor.name} disconnected`);
  }

  protected async send(record: ProducerRecord): Promise<void> {
    await this.producer.send(record);
    logger.debug(`[Producer] Sent ${record.messages.length} message(s) to topic "${record.topic}"`);
  }
}
