import Redis from 'ioredis';
import { env } from '@config/env';
import { logger } from '@infra/monitoring/logger';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: env?.REDIS_HOST,
      port: env?.REDIS_PORT,
      password: env?.REDIS_PASSWORD,
      db: env?.REDIS_DB,
      keyPrefix: env?.REDIS_KEY_PREFIX,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000);
        logger.warn(`[Redis] Retry attempt ${times}, next in ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err) => {
        logger.error('[Redis] Connection error:', { message: err.message });
        return true;
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => logger.info('[Redis] Connected'));
    redisClient.on('ready', () => logger.info('[Redis] Ready'));
    redisClient.on('error', (err) => logger.error('[Redis] Error:', { message: err.message }));
    redisClient.on('close', () => logger.warn('[Redis] Connection closed'));
  }
  return redisClient;
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();
  await client.connect();
  await client.ping();
  logger.info('[Redis] Ping OK');
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('[Redis] Disconnected');
  }
};

/** Convenience helpers */
export const redisSet = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
  const client = getRedisClient();
  if (ttlSeconds) {
    await client.set(key, value, 'EX', ttlSeconds);
  } else {
    await client.set(key, value);
  }
};

export const redisGet = async (key: string): Promise<string | null> => {
  return getRedisClient().get(key);
};

export const redisDel = async (key: string): Promise<void> => {
  await getRedisClient().del(key);
};
