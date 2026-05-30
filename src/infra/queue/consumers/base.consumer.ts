import { Consumer, EachMessagePayload } from 'kafkajs';
import { getKafkaClient } from '@infra/queue/kafka/kafka.client';
import { env } from '@config/env';
import { logger } from '@infra/monitoring/logger';

export abstract class BaseConsumer {
  protected consumer: Consumer;

  constructor(groupId: string="ocr-service-group") {
    this.consumer = getKafkaClient().consumer({
      groupId: groupId ?? env?.KAFKA_GROUP_ID,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    logger.info(`[Consumer] ${this.constructor.name} connected`);
  }

  async subscribe(topics: string[], fromBeginning = false): Promise<void> {
    await this.consumer.subscribe({ topics, fromBeginning });
    logger.info(`[Consumer] ${this.constructor.name} subscribed to: ${topics.join(', ')}`);
  }

  async run(): Promise<void> {
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          await this.handleMessage(payload);
        } catch (err) {
          logger.error(`[Consumer] ${this.constructor.name} failed to handle message`, {
            topic: payload.topic,
            partition: payload.partition,
            offset: payload.message.offset,
            error: (err as Error).message,
          });
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    logger.info(`[Consumer] ${this.constructor.name} disconnected`);
  }

  protected abstract handleMessage(payload: EachMessagePayload): Promise<void>;
}
