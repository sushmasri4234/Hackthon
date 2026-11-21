import IORedis from 'ioredis';
import logger from '../utils/logger';

// IORedis client for BullMQ
export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redisConnection.on('connect', () => {
  logger.info('Redis connected');
});

export default redisConnection;
