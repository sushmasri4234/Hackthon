import { Queue } from 'bullmq';
import { redisConnection } from '../db/redis';

export const QUEUES = {
  CERTIFICATE_GENERATION: 'certificate-generation',
  NOTIFICATION_DELIVERY: 'notification-delivery',
  ESCALATION_CHECK: 'escalation-check',
  OUTBOX_PROCESSOR: 'outbox-processor',
} as const;

export const certificateQueue = new Queue(QUEUES.CERTIFICATE_GENERATION, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const notificationQueue = new Queue(QUEUES.NOTIFICATION_DELIVERY, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const escalationQueue = new Queue(QUEUES.ESCALATION_CHECK, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export const outboxQueue = new Queue(QUEUES.OUTBOX_PROCESSOR, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});
