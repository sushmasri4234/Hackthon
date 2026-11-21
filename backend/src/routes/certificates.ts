import { Router, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { cancelCertificateSchema } from '../validators/schemas';
import { createAuditLog } from '../services/auditService';

const router = Router();
const STORAGE_PATH = process.env.CERTIFICATE_STORAGE_PATH || './certificates';

// ─── Public Verification (no auth required) ───────────────────────────────────

router.get('/verify/:certificateNumber', async (req: any, res: Response, next: NextFunction) => {
  try {
    const certificateNumber = req.params.certificateNumber as string;

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        candidate: {
          select: {
            fullName: true,
            courseName: true,
            trainingCentre: true,
            district: true,
            completionDate: true,
            // NEVER expose: phone, email
          },
        },
        batch: { select: { batchName: true } },
      },
    });

    if (!certificate) {
      res.json({
        status: 'INVALID',
        message: 'Certificate not found. This certificate ID does not exist in our records.',
      });
      return;
    }

    if (certificate.status === 'CANCELLED') {
      res.json({
        status: 'CANCELLED',
        message: 'This certificate has been cancelled and is no longer valid.',
        certificateNumber,
        cancelledAt: certificate.cancelledAt,
        // Limited public info only
        holder: certificate.candidate.fullName,
        course: certificate.candidate.courseName,
      });
      return;
    }

    res.json({
      status: 'VALID',
      message: 'Certificate is authentic and currently active.',
      certificateNumber,
      holder: certificate.candidate.fullName,
      course: certificate.candidate.courseName,
      trainingCentre: certificate.candidate.trainingCentre,
      district: certificate.candidate.district,
      completionDate: certificate.candidate.completionDate,
      issuedAt: certificate.generatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// All routes below require auth
router.use(authenticate);

// ─── List Certificates ────────────────────────────────────────────────────────

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { role, trainingCentreId } = req.user!;
    const { status, batchId, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (role === 'TRAINING_CENTRE') {
      where.batch = { trainingCentreId };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          candidate: { select: { fullName: true, courseName: true, district: true, trainingCentre: true } },
          batch: { select: { batchName: true, trainingCentre: { select: { name: true } } } },
          notifications: { select: { status: true, channel: true, attemptCount: true, deliveredAt: true } },
        },
        orderBy: { generatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.certificate.count({ where }),
    ]);

    res.json({
      data: certificates,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Certificate Detail ───────────────────────────────────────────────────

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        candidate: true,
        batch: { include: { trainingCentre: true, district: true } },
        notifications: { orderBy: { createdAt: 'desc' } },
        cancelledBy: { select: { name: true, role: true } },
      },
    });
    if (!certificate) { res.status(404).json({ error: 'Certificate not found' }); return; }
    res.json(certificate);
  } catch (err) {
    next(err);
  }
});

// ─── Download Certificate PDF ─────────────────────────────────────────────────

router.get('/:id/download', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: { candidate: { select: { fullName: true } } },
    });

    if (!certificate) { res.status(404).json({ error: 'Certificate not found' }); return; }
    if (certificate.status === 'CANCELLED') { res.status(410).json({ error: 'Certificate has been cancelled and cannot be downloaded' }); return; }
    if (!certificate.pdfPath) { res.status(404).json({ error: 'Certificate PDF not yet generated' }); return; }

    const pdfPath = path.join(STORAGE_PATH, certificate.pdfPath);
    if (!fs.existsSync(pdfPath)) { res.status(404).json({ error: 'Certificate file not found on server' }); return; }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateNumber}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    next(err);
  }
});

// ─── Cancel Certificate ───────────────────────────────────────────────────────

router.post('/:id/cancel', authorize('STATE_OFFICE'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = cancelCertificateSchema.parse(req.body);
    const id = req.params.id as string;

    const certificate = await prisma.certificate.findUnique({ where: { id } });
    if (!certificate) { res.status(404).json({ error: 'Certificate not found' }); return; }
    if (certificate.status === 'CANCELLED') { res.status(400).json({ error: 'Certificate is already cancelled' }); return; }

    await prisma.certificate.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: req.user!.id,
        cancellationReason: reason,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'CERTIFICATE_CANCELLED',
      entityType: 'CERTIFICATE',
      entityId: id,
      prevStatus: 'ACTIVE',
      newStatus: 'CANCELLED',
      reason,
    });

    res.json({ message: 'Certificate cancelled successfully', status: 'CANCELLED' });
  } catch (err) {
    next(err);
  }
});

// ─── Retry Notification ───────────────────────────────────────────────────────

router.post('/:id/retry-notification', authorize('STATE_OFFICE'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: { candidate: true, notifications: true },
    });
    if (!certificate) { res.status(404).json({ error: 'Certificate not found' }); return; }

    const { notificationQueue } = await import('../utils/queues');
    await notificationQueue.add('send-whatsapp', {
      certificateId: certificate.id,
      candidateId: certificate.candidateId,
      phone: certificate.candidate.phone,
      candidateName: certificate.candidate.fullName,
      courseName: certificate.candidate.courseName,
      certificateNumber: certificate.certificateNumber,
      verificationUrl: certificate.qrCodeData,
    }, { jobId: `notif-retry-${certificate.id}-${Date.now()}` });

    res.json({ message: 'Notification retry queued' });
  } catch (err) {
    next(err);
  }
});

export default router;
