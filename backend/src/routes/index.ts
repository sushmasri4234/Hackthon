import { Express, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

import authRouter from './auth';
import batchesRouter from './batches';
import certificatesRouter from './certificates';
import dashboardRouter from './dashboard';
import districtsRouter from './districts';

/**
 * Mounts all API routes onto the Express application.
 * Call this once from server.ts after middleware setup.
 */
export function setupRoutes(app: Express): void {
  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API routes ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/certificates', certificatesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/districts', districtsRouter);

  // ── Global Audit Route ───────────────────────────────────────────────────
  app.get('/api/audit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId, action, limit } = req.query;
      const where: any = {};
      if (batchId && batchId !== 'all') where.batchId = batchId as string;
      if (action && action !== 'all') where.action = action as string;
      const take = limit ? parseInt(limit as string, 10) : 200;

      const logs = await prisma.auditLog.findMany({
        where,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, role: true } },
          batch: { select: { id: true, batchName: true } },
        },
      });

      res.json({ data: logs, auditLog: logs, total: logs.length });
    } catch (err) {
      next(err);
    }
  });

  // ── Public verify shorthand (for QR code URLs) ────────────────────────────
  // e.g. GET /api/verify/PSM-2024-00012345
  app.get('/api/verify/:certNumber', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certNumber = req.params.certNumber as string;

      const certificate = await prisma.certificate.findUnique({
        where: { certificateNumber: certNumber },
        include: {
          candidate: {
            select: {
              fullName: true,
              courseName: true,
              trainingCentre: true,
              district: true,
              completionDate: true,
            },
          },
        },
      });

      if (!certificate) {
        res.json({ status: 'INVALID', message: 'Certificate not found.' });
        return;
      }

      if (certificate.status === 'CANCELLED') {
        res.json({
          status: 'CANCELLED',
          message: 'This certificate has been cancelled.',
          certificateNumber: certNumber,
          cancelledAt: certificate.cancelledAt,
          reason: certificate.cancellationReason,
        });
        return;
      }

      res.json({
        status: 'VALID',
        certificateNumber: certNumber,
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
}
