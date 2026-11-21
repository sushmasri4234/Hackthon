import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../db/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { createBatchSchema, districtApprovalSchema, qualityReviewSchema, stateApprovalSchema, resubmitBatchSchema } from '../validators/schemas';
import { validateExcelUpload } from '../services/excelValidationService';
import { processDistrictApproval, processQualityReview, processStateApproval, resubmitBatch } from '../services/approvalWorkflowService';
import { createAuditLog } from '../services/auditService';
import logger from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All batch routes require auth
router.use(authenticate);

// ─── Create Batch ─────────────────────────────────────────────────────────────

router.post('/', authorize('TRAINING_CENTRE'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createBatchSchema.parse(req.body);

    if (!req.user!.trainingCentreId) {
      res.status(400).json({ error: 'User is not associated with a training centre' });
      return;
    }

    const batch = await prisma.batch.create({
      data: {
        trainingCentreId: req.user!.trainingCentreId,
        districtId: data.districtId,
        uploadedById: req.user!.id,
        courseName: data.courseName,
        batchName: data.batchName,
        notes: data.notes,
        status: 'DRAFT',
      },
      include: { trainingCentre: true, district: true, uploadedBy: { select: { name: true, email: true, role: true } } },
    });

    await createAuditLog({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'BATCH_CREATED',
      entityType: 'BATCH',
      entityId: batch.id,
      newStatus: 'DRAFT',
      batchId: batch.id,
    });

    res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
});

// ─── Upload Excel ─────────────────────────────────────────────────────────────

router.post('/:id/upload', authorize('TRAINING_CENTRE'), upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const ext = req.file.originalname.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      res.status(400).json({ error: 'Invalid file type. Only .xlsx, .xls, and .csv files are accepted.' });
      return;
    }

    const batch = await prisma.batch.findUnique({ where: { id } });
    if (!batch) { res.status(404).json({ error: 'Batch not found' }); return; }
    if (batch.uploadedById !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (!['DRAFT', 'RETURNED'].includes(batch.status)) {
      res.status(400).json({ error: `Cannot upload to a batch in ${batch.status} state` });
      return;
    }

    const result = await validateExcelUpload(req.file.buffer);

    if (!result.valid) {
      await createAuditLog({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'BATCH_VALIDATION_FAILED',
        entityType: 'BATCH',
        entityId: id,
        batchId: id,
        metadata: { errorCount: result.errors.length, fileName: req.file.originalname },
      });
      res.status(422).json({
        valid: false,
        errors: result.errors,
        message: `Upload rejected: ${result.errors.length} error(s) found. Correct all errors and re-upload.`,
      });
      return;
    }

    // ATOMIC: Delete existing candidates and insert new ones in a transaction
    const LARGE_BATCH_THRESHOLD = parseInt(process.env.LARGE_BATCH_THRESHOLD || '50', 10);
    const isLargeBatch = result.candidates.length >= LARGE_BATCH_THRESHOLD;

    await prisma.$transaction(async (tx) => {
      // Remove old candidates (safe – not yet certified)
      await tx.candidate.deleteMany({ where: { batchId: id } });

      // Insert all new candidates
      await tx.candidate.createMany({
        data: result.candidates.map((c) => ({
          batchId: id,
          candidateExtId: c.candidateExtId,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email,
          courseName: c.courseName,
          trainingCentre: c.trainingCentre,
          district: c.district,
          marks: c.marks,
          completionDate: c.completionDate,
          status: 'PENDING',
        })),
      });

      await tx.batch.update({
        where: { id },
        data: { totalCandidates: result.candidates.length, isLargeBatch },
      });
    });

    await createAuditLog({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'BATCH_UPLOAD_SUCCESS',
      entityType: 'BATCH',
      entityId: id,
      batchId: id,
      metadata: { candidateCount: result.candidates.length, isLargeBatch, fileName: req.file.originalname },
    });

    res.json({
      valid: true,
      candidateCount: result.candidates.length,
      isLargeBatch,
      message: `${result.candidates.length} candidates uploaded successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Submit Batch ─────────────────────────────────────────────────────────────

router.post('/:id/submit', authorize('TRAINING_CENTRE'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { _count: { select: { candidates: true } } },
    });

    if (!batch) { res.status(404).json({ error: 'Batch not found' }); return; }
    if (batch.uploadedById !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (batch.status !== 'DRAFT') { res.status(400).json({ error: `Cannot submit a batch in ${batch.status} state` }); return; }
    if (batch._count.candidates === 0) { res.status(400).json({ error: 'Cannot submit an empty batch. Upload candidates first.' }); return; }

    await prisma.$transaction(async (tx) => {
      await tx.batchSubmission.create({
        data: { batchId: id, submittedById: req.user!.id, submissionNum: 1, notes: req.body.notes },
      });
      await tx.batch.update({
        where: { id },
        data: { status: 'DISTRICT_REVIEW', submissionCount: 1 },
      });
    });

    await createAuditLog({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'BATCH_SUBMITTED',
      entityType: 'BATCH',
      entityId: id,
      prevStatus: 'DRAFT',
      newStatus: 'DISTRICT_REVIEW',
      batchId: id,
    });

    res.json({ message: 'Batch submitted for district review', status: 'DISTRICT_REVIEW' });
  } catch (err) {
    next(err);
  }
});

// ─── Resubmit Batch ───────────────────────────────────────────────────────────

router.post('/:id/resubmit', authorize('TRAINING_CENTRE'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = resubmitBatchSchema.parse(req.body);
    await resubmitBatch(id, req.user!.id, req.user!.role, data.notes);
    res.json({ message: 'Batch resubmitted for district review', status: 'DISTRICT_REVIEW' });
  } catch (err: any) {
    if (err.statusCode) { res.status(err.statusCode).json({ error: err.message }); return; }
    next(err);
  }
});

// ─── District Approval ────────────────────────────────────────────────────────

router.post('/:id/district-approve', authorize('DISTRICT_OFFICER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = districtApprovalSchema.parse(req.body);
    const result = await processDistrictApproval(id, req.user!.id, req.user!.role, data.decision as any, data.reason);
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) { res.status(err.statusCode).json({ error: err.message }); return; }
    next(err);
  }
});

// ─── Quality Review ───────────────────────────────────────────────────────────

router.post('/:id/quality-review', authorize('QUALITY_TEAM'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = qualityReviewSchema.parse(req.body);
    const result = await processQualityReview(id, req.user!.id, req.user!.role, data.decision as any, data.notes, data.flags);
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) { res.status(err.statusCode).json({ error: err.message }); return; }
    next(err);
  }
});

// ─── State Approval ───────────────────────────────────────────────────────────

router.post('/:id/state-approve', authorize('STATE_OFFICE'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = stateApprovalSchema.parse(req.body);
    const result = await processStateApproval(id, req.user!.id, req.user!.role, data.decision as any, data.reason);
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) { res.status(err.statusCode).json({ error: err.message }); return; }
    next(err);
  }
});

// ─── List Batches ─────────────────────────────────────────────────────────────

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { role, id: userId, trainingCentreId } = req.user!;
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;

    // Role-based filtering
    if (role === 'TRAINING_CENTRE') {
      where.trainingCentreId = trainingCentreId;
    }
    // District officers, quality team, state office see all batches relevant to their queue
    // (additional filtering on the frontend by status)

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          trainingCentre: { select: { name: true, code: true } },
          district: { select: { name: true } },
          uploadedBy: { select: { name: true, email: true } },
          _count: { select: { candidates: true, certificates: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.batch.count({ where }),
    ]);

    res.json({
      data: batches,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Batch Detail ─────────────────────────────────────────────────────────

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        trainingCentre: true,
        district: true,
        uploadedBy: { select: { id: true, name: true, email: true, role: true } },
        candidates: { orderBy: { fullName: 'asc' } },
        certificates: { select: { id: true, certificateNumber: true, status: true, generatedAt: true } },
        escalations: true,
        submissions: {
          orderBy: { submissionNum: 'desc' },
          include: {
            districtApprovals: {
              include: { officer: { select: { id: true, name: true, email: true } } },
            },
            qualityReview: {
              include: { reviewer: { select: { id: true, name: true, email: true } } },
            },
            stateApproval: {
              include: { approvedBy: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    if (!batch) { res.status(404).json({ error: 'Batch not found' }); return; }

    // Training Centre can only see their own batches
    if (req.user!.role === 'TRAINING_CENTRE' && batch.trainingCentreId !== req.user!.trainingCentreId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    res.json(batch);
  } catch (err) {
    next(err);
  }
});

// ─── Get Batch Candidates ─────────────────────────────────────────────────────

router.get('/:id/candidates', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const candidates = await prisma.candidate.findMany({
      where: { batchId: id },
      include: { certificate: { select: { certificateNumber: true, status: true } } },
      orderBy: { fullName: 'asc' },
    });
    res.json(candidates);
  } catch (err) {
    next(err);
  }
});

// ─── Get Batch Audit History ──────────────────────────────────────────────────

router.get('/:id/audit', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const audit = await prisma.auditLog.findMany({
      where: { batchId: id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

export default router;
