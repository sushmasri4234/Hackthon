import { prisma } from '../db/prisma';
import { AuditAction, EntityType, UserRole } from '@prisma/client';

export interface AuditLogEntry {
  userId?: string;
  userRole?: UserRole;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  prevStatus?: string;
  newStatus?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  batchId?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      userRole: entry.userRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      prevStatus: entry.prevStatus,
      newStatus: entry.newStatus,
      reason: entry.reason,
      metadata: entry.metadata as any,
      batchId: entry.batchId,
    },
  });
}

export async function getAuditHistory(entityType: EntityType, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: {
      user: { select: { id: true, name: true, role: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
