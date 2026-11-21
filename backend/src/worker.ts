import 'dotenv/config';
import logger from './utils/logger';
import { certificateWorker, notificationWorker, escalationWorker } from './workers';
import { escalationQueue } from './utils/queues';

logger.info('CertiFlow Worker starting...');

// Schedule escalation check every hour
async function scheduleEscalationCheck() {
  await escalationQueue.add(
    'check-escalations',
    {},
    {
      repeat: { pattern: '0 * * * *' },
      jobId: 'escalation-check-recurring',
    } as any
  );
  logger.info('Escalation check scheduled every hour');
}

scheduleEscalationCheck().catch((err) => {
  logger.error('Failed to schedule escalation check', { error: err.message });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Worker shutting down...');
  await Promise.all([
    certificateWorker.close(),
    notificationWorker.close(),
    escalationWorker.close(),
  ]);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('Workers started: certificate, notification, escalation');
