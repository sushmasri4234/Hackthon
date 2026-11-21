import { Worker, Job } from 'bullmq';
import { redisConnection } from '../db/redis';
import { QUEUES } from '../utils/queues';
import { generateCertificatesForBatch } from '../services/certificateService';
import { prisma } from '../db/prisma';
import { createAuditLog } from '../services/auditService';
import logger from '../utils/logger';

// ─── Certificate Generation Worker ─────────────────────────────────────────

export const certificateWorker = new Worker(
  QUEUES.CERTIFICATE_GENERATION,
  async (job: Job) => {
    const { batchId } = job.data;
    logger.info(`[CertWorker] Processing batch ${batchId}`, { jobId: job.id });
    await generateCertificatesForBatch(batchId);
    logger.info(`[CertWorker] Done for batch ${batchId}`);
  },
  { connection: redisConnection, concurrency: 2 }
);

certificateWorker.on('completed', (job) => {
  logger.info(`[CertWorker] Job ${job.id} completed`);
});

certificateWorker.on('failed', (job, err) => {
  logger.error(`[CertWorker] Job ${job?.id} failed`, { error: err.message });
});

// ─── WhatsApp Notification Worker ──────────────────────────────────────────

function simulateWhatsAppDelivery(phone: string): Promise<boolean> {
  return new Promise((resolve) => {
    const delay = 500 + Math.random() * 2000; // 0.5-2.5 seconds
    setTimeout(() => {
      // 80% success, 20% failure simulation
      const success = Math.random() > 0.2;
      resolve(success);
    }, delay);
  });
}

export const notificationWorker = new Worker(
  QUEUES.NOTIFICATION_DELIVERY,
  async (job: Job) => {
    const { certificateId, candidateId, phone, candidateName, courseName, certificateNumber, verificationUrl } = job.data;
    logger.info(`[NotifWorker] Sending WhatsApp to ${phone} for cert ${certificateNumber}`, { jobId: job.id });

    // Find or create notification record
    let notification = await prisma.notification.findUnique({
      where: { certificateId_channel: { certificateId, channel: 'WHATSAPP' } },
    });

    if (!notification) {
      notification = await prisma.notification.create({
        data: {
          certificateId,
          candidateId,
          channel: 'WHATSAPP',
          phoneNumber: phone,
          status: 'RETRYING',
          jobId: job.id?.toString(),
        },
      });
    }

    // Update attempt count
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        status: 'RETRYING',
      },
    });

    const success = await simulateWhatsAppDelivery(phone);

    if (success) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });

      await createAuditLog({
        action: 'NOTIFICATION_SENT',
        entityType: 'NOTIFICATION',
        entityId: notification.id,
        newStatus: 'DELIVERED',
        metadata: { phone, certificateNumber, channel: 'WHATSAPP' },
      });

      logger.info(`[NotifWorker] WhatsApp delivered to ${phone} for ${certificateNumber}`);
    } else {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED', errorMessage: 'Simulated delivery failure' },
      });

      await createAuditLog({
        action: 'NOTIFICATION_FAILED',
        entityType: 'NOTIFICATION',
        entityId: notification.id,
        newStatus: 'FAILED',
        metadata: { phone, certificateNumber, attempt: job.attemptsMade },
      });

      logger.warn(`[NotifWorker] WhatsApp delivery failed for ${phone} (attempt ${job.attemptsMade})`);
      throw new Error('WhatsApp delivery simulation failed'); // triggers retry
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

notificationWorker.on('completed', (job) => {
  logger.info(`[NotifWorker] Job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`[NotifWorker] Job ${job?.id} failed permanently`, { error: err.message });
});

// ─── Escalation Check Worker ────────────────────────────────────────────────

export const escalationWorker = new Worker(
  QUEUES.ESCALATION_CHECK,
  async (job: Job) => {
    const deadlineHours = parseInt(process.env.APPROVAL_DEADLINE_HOURS || '48', 10);
    const deadlineMs = deadlineHours * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - deadlineMs);

    logger.info(`[EscalationWorker] Checking for batches pending > ${deadlineHours}h`);

    // Find batches stuck in approval states beyond the deadline
    const staleBatches = await prisma.batch.findMany({
      where: {
        status: { in: ['DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW'] },
        updatedAt: { lt: cutoff },
        escalations: { none: { resolvedAt: null } }, // Not already escalated
      },
      include: { trainingCentre: true, district: true },
    });

    logger.info(`[EscalationWorker] Found ${staleBatches.length} stale batches`);

    for (const batch of staleBatches) {
      // Find state office user to notify
      const stateUser = await prisma.user.findFirst({ where: { role: 'STATE_OFFICE' } });

      await prisma.escalation.create({
        data: {
          batchId: batch.id,
          reason: `Batch has been in ${batch.status} for more than ${deadlineHours} hours without action.`,
          notifiedUserId: stateUser?.id,
          metadata: {
            batchName: batch.batchName,
            district: batch.district.name,
            status: batch.status,
            pendingSince: batch.updatedAt,
          } as any,
        },
      });

      await createAuditLog({
        action: 'ESCALATION_CREATED',
        entityType: 'ESCALATION',
        entityId: batch.id,
        batchId: batch.id,
        prevStatus: batch.status,
        metadata: { deadlineHours, pendingSince: batch.updatedAt },
      });

      logger.warn(`[EscalationWorker] Escalated batch ${batch.id} (${batch.batchName})`);
    }
  },
  { connection: redisConnection }
);
