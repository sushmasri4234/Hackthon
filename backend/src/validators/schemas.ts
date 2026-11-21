import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createBatchSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  batchName: z.string().min(1, 'Batch name is required'),
  notes: z.string().optional(),
  districtId: z.string().uuid('Invalid district ID'),
});

export const districtApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'RETURNED']),
  reason: z.string().optional(),
});

export const qualityReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'RETURNED']),
  notes: z.string().optional(),
  flags: z.array(z.object({
    candidateId: z.string(),
    reason: z.string(),
  })).optional(),
});

export const stateApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'RETURNED']),
  reason: z.string().optional(),
});

export const cancelCertificateSchema = z.object({
  reason: z.string().min(10, 'Cancellation reason must be at least 10 characters'),
});

export const resubmitBatchSchema = z.object({
  notes: z.string().optional(),
});
