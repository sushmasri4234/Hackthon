import { Notification, NotificationChannel, NotificationStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import logger from '../utils/logger';

/**
 * NotificationService
 *
 * Wraps Prisma queries for the Notification model.
 * The Notification model in schema.prisma is linked to Certificate, not to User
 * directly (it tracks WhatsApp/SMS/Email delivery for a certificate).
 *
 * For in-app/dashboard user notifications we use a lightweight wrapper that
 * queries recent Notification records for the calling user's certificates.
 */

/**
 * Returns unread (PENDING or FAILED) notifications for all certificates
 * belonging to the given user (via their associated batches / training centre).
 *
 * Note: The schema links Notification → Certificate → Candidate → Batch →
 * TrainingCentre → User, so we filter by trainingCentreId when available.
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  try {
    // Look up the user to get their trainingCentreId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, trainingCentreId: true },
    });

    if (!user) return [];

    const whereClause: any = {
      status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] },
    };

    // Training centre users only see their own certificates' notifications
    if (user.role === 'TRAINING_CENTRE' && user.trainingCentreId) {
      whereClause.certificate = {
        batch: { trainingCentreId: user.trainingCentreId },
      };
    }

    return await prisma.notification.findMany({
      where: whereClause,
      include: {
        certificate: {
          select: { certificateNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  } catch (err) {
    logger.error('getUnreadNotifications failed', { userId, error: (err as Error).message });
    throw err;
  }
}

/**
 * Marks a single notification as DELIVERED (read).
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
  } catch (err) {
    logger.error('markAsRead failed', { notificationId, error: (err as Error).message });
    throw err;
  }
}

/**
 * Creates a new Notification record for a certificate.
 *
 * @param certificateId  - UUID of the Certificate row
 * @param candidateId    - UUID of the Candidate row
 * @param phoneNumber    - Recipient phone number
 * @param channel        - Delivery channel (defaults to WHATSAPP)
 * @param jobId          - Optional BullMQ job ID for idempotency
 */
export async function createNotification(
  certificateId: string,
  candidateId: string,
  phoneNumber: string,
  channel: NotificationChannel = NotificationChannel.WHATSAPP,
  jobId?: string,
): Promise<Notification> {
  try {
    return await prisma.notification.create({
      data: {
        certificateId,
        candidateId,
        phoneNumber,
        channel,
        status: NotificationStatus.PENDING,
        jobId: jobId ?? null,
      },
    });
  } catch (err) {
    logger.error('createNotification failed', {
      certificateId,
      candidateId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Convenience: bulk-create PENDING notifications for all candidates in a batch
 * whose certificates have been generated but not yet notified.
 */
export async function createBatchNotifications(
  batchId: string,
  channel: NotificationChannel = NotificationChannel.WHATSAPP,
): Promise<number> {
  const certificates = await prisma.certificate.findMany({
    where: {
      batchId,
      status: 'ACTIVE',
      notifications: { none: { channel } }, // skip already-queued ones
    },
    include: {
      candidate: { select: { id: true, phone: true } },
    },
  });

  let created = 0;
  for (const cert of certificates) {
    await createNotification(
      cert.id,
      cert.candidate.id,
      cert.candidate.phone,
      channel,
      `notif-${cert.id}`, // idempotent job ID
    );
    created++;
  }

  logger.info(`createBatchNotifications: queued ${created} notifications for batch ${batchId}`);
  return created;
}
