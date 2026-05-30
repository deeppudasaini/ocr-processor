import { Kafka, logLevel } from 'kafkajs';
import { env } from '@config/env';
import { logger } from '@infra/monitoring/logger';

const toKafkaLogLevel = (level: logLevel): string => {
  const map: Record<number, string> = {
    [logLevel.ERROR]: 'error',
    [logLevel.WARN]: 'warn',
    [logLevel.INFO]: 'info',
    [logLevel.DEBUG]: 'debug',
    [logLevel.NOTHING]: 'silent',
  };
  return map[level] ?? 'info';
};

const kafkaLogger = () =>
  ({ level, log: { message, ...extra } }: { level: logLevel; log: { message: string } & Record<string, unknown> }) => {
    const lvl = toKafkaLogLevel(level);
    (logger as unknown as Record<string, (msg: string, meta?: unknown) => void>)[lvl]?.(`[Kafka] ${message}`, extra);
  };

let _kafka: Kafka | null = null;

export const getKafkaClient = (): Kafka => {
  if (!_kafka) {
    _kafka = new Kafka({
      clientId: env?.KAFKA_CLIENT_ID || "ocr-service",
      brokers: env?.KAFKA_BROKERS.split(',').map((b) => b.trim()) || ['localhost:9092'],
      ssl: env?.KAFKA_SSL || false,
      sasl:
        env?.KAFKA_SASL_MECHANISM && env?.KAFKA_SASL_USERNAME && env?.KAFKA_SASL_PASSWORD
          ? {
              mechanism: env?.KAFKA_SASL_MECHANISM as 'plain',
              username: env?.KAFKA_SASL_USERNAME || '',
              password: env?.KAFKA_SASL_PASSWORD || '',
            }
          : undefined,
      logCreator: () => kafkaLogger(),
    });
  }
  return _kafka;
};
