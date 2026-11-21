import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { role, trainingCentreId } = req.user!;

    const batchWhere: any = {};
    if (role === 'TRAINING_CENTRE') batchWhere.trainingCentreId = trainingCentreId;

    const [
      totalBatches,
      pendingApprovals,
      approvedBatches,
      rejectedBatches,
      returnedBatches,
      certificatesIssued,
      cancelledCertificates,
      delayedBatches,
      pendingNotifications,
    ] = await Promise.all([
      prisma.batch.count({ where: batchWhere }),
      prisma.batch.count({ where: { ...batchWhere, status: { in: ['DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW'] } } }),
      prisma.batch.count({ where: { ...batchWhere, status: 'APPROVED' } }),
      prisma.batch.count({ where: { ...batchWhere, status: 'REJECTED' } }),
      prisma.batch.count({ where: { ...batchWhere, status: 'RETURNED' } }),
      prisma.certificate.count({ where: { status: 'ACTIVE' } }),
      prisma.certificate.count({ where: { status: 'CANCELLED' } }),
      prisma.escalation.count({ where: { resolvedAt: null } }),
      prisma.notification.count({ where: { status: { in: ['PENDING', 'FAILED'] } } }),
    ]);

    // Recent activity
    const recentBatches = await prisma.batch.findMany({
      where: batchWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        trainingCentre: { select: { name: true } },
        district: { select: { name: true } },
      },
    });

    res.json({
      totalBatches,
      pendingApprovals,
      approvedBatches,
      rejectedBatches,
      returnedBatches,
      certificatesIssued,
      cancelledCertificates,
      delayedBatches,
      pendingNotifications,
      recentBatches,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/delayed', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const escalations = await prisma.escalation.findMany({
      where: { resolvedAt: null },
      include: {
        batch: {
          include: {
            trainingCentre: { select: { name: true } },
            district: { select: { name: true } },
          },
        },
        notifiedUser: { select: { name: true, role: true } },
      },
      orderBy: { escalatedAt: 'desc' },
    });
    res.json(escalations);
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      include: {
        certificate: { select: { certificateNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

export default router;
