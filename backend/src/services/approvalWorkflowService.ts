import { prisma } from '../db/prisma';
import { BatchStatus, ApprovalDecision, Prisma } from '@prisma/client';
import { createAuditLog } from './auditService';
import { certificateQueue } from '../utils/queues';
import logger from '../utils/logger';

const LARGE_BATCH_THRESHOLD = parseInt(process.env.LARGE_BATCH_THRESHOLD || '50', 10);

export interface WorkflowError extends Error {
  statusCode: number;
}

function workflowError(message: string, statusCode: number): WorkflowError {
  const err = new Error(message) as WorkflowError;
  err.statusCode = statusCode;
  return err;
}

// ─── District Approval ───────────────────────────────────────────────────────

export async function processDistrictApproval(
  batchId: string,
  officerId: string,
  officerRole: string,
  decision: ApprovalDecision,
  reason?: string
) {
  return prisma.$transaction(async (tx) => {
    // Load batch with lock to prevent race conditions
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      include: {
        submissions: {
          orderBy: { submissionNum: 'desc' },
          take: 1,
          include: {
            districtApprovals: true,
          },
        },
      },
    });

    if (!batch) throw workflowError('Batch not found', 404);
    if (batch.status !== 'DISTRICT_REVIEW') {
      throw workflowError(`Batch is not in DISTRICT_REVIEW state. Current: ${batch.status}`, 400);
    }

    const latestSubmission = batch.submissions[0];
    if (!latestSubmission) throw workflowError('No submission found for this batch', 404);

    // Prevent duplicate approval from same officer
    const existingApproval = latestSubmission.districtApprovals.find(
      (a) => a.officerId === officerId
    );
    if (existingApproval) {
      throw workflowError('You have already reviewed this batch submission', 409);
    }

    // Create district approval record
    await tx.districtApproval.create({
      data: {
        batchSubmissionId: latestSubmission.id,
        officerId,
        decision,
        reason,
      },
    });

    // Determine next state
    if (decision === 'REJECTED') {
      await tx.batch.update({ where: { id: batchId }, data: { status: 'REJECTED' } });
      await createAuditLog({
        userId: officerId,
        userRole: officerRole as any,
        action: 'DISTRICT_REJECTED',
        entityType: 'BATCH',
        entityId: batchId,
        prevStatus: 'DISTRICT_REVIEW',
        newStatus: 'REJECTED',
        reason,
        batchId,
      });
      return { status: 'REJECTED', message: 'Batch rejected' };
    }

    if (decision === 'RETURNED') {
      await tx.batch.update({ where: { id: batchId }, data: { status: 'RETURNED' } });
      await createAuditLog({
        userId: officerId,
        userRole: officerRole as any,
        action: 'DISTRICT_RETURNED',
        entityType: 'BATCH',
        entityId: batchId,
        prevStatus: 'DISTRICT_REVIEW',
        newStatus: 'RETURNED',
        reason,
        batchId,
      });
      return { status: 'RETURNED', message: 'Batch returned for correction' };
    }

    // APPROVED – check if we have 2 distinct approvals
    const allApprovals = await tx.districtApproval.findMany({
      where: {
        batchSubmissionId: latestSubmission.id,
        decision: 'APPROVED',
      },
    });

    await createAuditLog({
      userId: officerId,
      userRole: officerRole as any,
      action: 'DISTRICT_APPROVED',
      entityType: 'BATCH',
      entityId: batchId,
      prevStatus: 'DISTRICT_REVIEW',
      newStatus: allApprovals.length >= 2 ? (batch.isLargeBatch ? 'QUALITY_REVIEW' : 'STATE_REVIEW') : 'DISTRICT_REVIEW',
      batchId,
      metadata: { approvalCount: allApprovals.length },
    });

    if (allApprovals.length >= 2) {
      // Two approvals received – advance workflow
      const nextStatus: BatchStatus = batch.isLargeBatch ? 'QUALITY_REVIEW' : 'STATE_REVIEW';
      await tx.batch.update({ where: { id: batchId }, data: { status: nextStatus } });
      logger.info(`Batch ${batchId} advanced to ${nextStatus} after 2 district approvals`);
      return { status: nextStatus, message: `Batch advanced to ${nextStatus}` };
    }

    // Still waiting for second approval
    return { status: 'DISTRICT_REVIEW', message: 'Approval recorded. Waiting for second district officer.' };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

// ─── Quality Review ───────────────────────────────────────────────────────────

export async function processQualityReview(
  batchId: string,
  reviewerId: string,
  reviewerRole: string,
  decision: ApprovalDecision,
  notes?: string,
  flags?: unknown
) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      include: {
        submissions: { orderBy: { submissionNum: 'desc' }, take: 1 },
      },
    });

    if (!batch) throw workflowError('Batch not found', 404);
    if (batch.status !== 'QUALITY_REVIEW') {
      throw workflowError(`Batch is not in QUALITY_REVIEW state. Current: ${batch.status}`, 400);
    }

    const latestSubmission = batch.submissions[0];
    const existing = await tx.qualityReview.findUnique({
      where: { batchSubmissionId: latestSubmission.id },
    });
    if (existing) throw workflowError('Quality review already submitted for this submission', 409);

    await tx.qualityReview.create({
      data: {
        batchSubmissionId: latestSubmission.id,
        reviewerId,
        decision,
        notes,
        flags: flags as any,
      },
    });

    let nextStatus: BatchStatus;
    let auditAction: any;

    if (decision === 'APPROVED') {
      nextStatus = 'STATE_REVIEW';
      auditAction = 'QUALITY_REVIEWED';
    } else if (decision === 'REJECTED') {
      nextStatus = 'REJECTED';
      auditAction = 'QUALITY_REVIEWED';
    } else {
      nextStatus = 'RETURNED';
      auditAction = 'QUALITY_REVIEWED';
    }

    await tx.batch.update({ where: { id: batchId }, data: { status: nextStatus } });
    await createAuditLog({
      userId: reviewerId,
      userRole: reviewerRole as any,
      action: auditAction,
      entityType: 'BATCH',
      entityId: batchId,
      prevStatus: 'QUALITY_REVIEW',
      newStatus: nextStatus,
      reason: notes,
      batchId,
    });

    return { status: nextStatus };
  });
}

// ─── State Approval ───────────────────────────────────────────────────────────

export async function processStateApproval(
  batchId: string,
  approverId: string,
  approverRole: string,
  decision: ApprovalDecision,
  reason?: string
) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      include: {
        submissions: { orderBy: { submissionNum: 'desc' }, take: 1 },
        candidates: { where: { status: 'PENDING' } },
      },
    });

    if (!batch) throw workflowError('Batch not found', 404);
    if (batch.status !== 'STATE_REVIEW') {
      throw workflowError(`Batch is not in STATE_REVIEW state. Current: ${batch.status}`, 400);
    }

    const latestSubmission = batch.submissions[0];
    const existing = await tx.stateApproval.findUnique({
      where: { batchSubmissionId: latestSubmission.id },
    });
    if (existing) throw workflowError('State approval already submitted for this submission', 409);

    await tx.stateApproval.create({
      data: {
        batchSubmissionId: latestSubmission.id,
        approvedById: approverId,
        decision,
        reason,
      },
    });

    let nextStatus: BatchStatus;

    if (decision === 'APPROVED') {
      nextStatus = 'APPROVED';
      await tx.batch.update({ where: { id: batchId }, data: { status: nextStatus } });

      // Queue certificate generation (idempotent job ID)
      await certificateQueue.add(
        'generate-certificates',
        { batchId, triggeredBy: approverId },
        { jobId: `cert-gen-${batchId}` } // idempotent: same jobId = no duplicate
      );

      logger.info(`Batch ${batchId} approved. Certificate generation queued.`);
    } else if (decision === 'REJECTED') {
      nextStatus = 'REJECTED';
      await tx.batch.update({ where: { id: batchId }, data: { status: nextStatus } });
    } else {
      nextStatus = 'RETURNED';
      await tx.batch.update({ where: { id: batchId }, data: { status: nextStatus } });
    }

    await createAuditLog({
      userId: approverId,
      userRole: approverRole as any,
      action: decision === 'APPROVED' ? 'STATE_APPROVED' : decision === 'REJECTED' ? 'STATE_REJECTED' : 'STATE_RETURNED',
      entityType: 'BATCH',
      entityId: batchId,
      prevStatus: 'STATE_REVIEW',
      newStatus: nextStatus,
      reason,
      batchId,
    });

    return { status: nextStatus };
  });
}

// ─── Resubmit ─────────────────────────────────────────────────────────────────

export async function resubmitBatch(batchId: string, submittedById: string, role: string, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw workflowError('Batch not found', 404);
    if (!['RETURNED', 'DRAFT'].includes(batch.status)) {
      throw workflowError(`Cannot resubmit a batch in ${batch.status} state`, 400);
    }

    const newSubmissionNum = batch.submissionCount + 1;

    const submission = await tx.batchSubmission.create({
      data: {
        batchId,
        submittedById,
        submissionNum: newSubmissionNum,
        notes,
      },
    });

    await tx.batch.update({
      where: { id: batchId },
      data: {
        status: 'DISTRICT_REVIEW',
        submissionCount: newSubmissionNum,
      },
    });

    await createAuditLog({
      userId: submittedById,
      userRole: role as any,
      action: 'BATCH_RESUBMITTED',
      entityType: 'BATCH',
      entityId: batchId,
      prevStatus: batch.status,
      newStatus: 'DISTRICT_REVIEW',
      reason: notes,
      batchId,
      metadata: { submissionNum: newSubmissionNum },
    });

    return submission;
  });
}
