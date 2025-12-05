import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    logger.error('Redis connection error:', err);
    return true;
  }
});

export async function connectRedis() {
  return new Promise((resolve, reject) => {
    redis.on('connect', () => {
      logger.info('Redis connection established');
      resolve(true);
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err);
      reject(err);
    });
  });
}

export async function disconnectRedis() {
  await redis.quit();
}
