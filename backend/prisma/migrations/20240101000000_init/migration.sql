-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRAINING_CENTRE', 'DISTRICT_OFFICER', 'QUALITY_TEAM', 'STATE_OFFICE', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('BATCH_CREATED', 'BATCH_UPLOAD_SUCCESS', 'BATCH_UPLOAD_FAILED', 'BATCH_VALIDATION_FAILED', 'BATCH_SUBMITTED', 'BATCH_RESUBMITTED', 'DISTRICT_APPROVED', 'DISTRICT_REJECTED', 'DISTRICT_RETURNED', 'QUALITY_REVIEWED', 'STATE_APPROVED', 'STATE_REJECTED', 'STATE_RETURNED', 'CERTIFICATE_GENERATED', 'CERTIFICATE_CANCELLED', 'NOTIFICATION_SENT', 'NOTIFICATION_FAILED', 'NOTIFICATION_RETRIED', 'ESCALATION_CREATED', 'ESCALATION_RESOLVED', 'USER_LOGIN', 'USER_LOGOUT', 'BATCH_CANCELLED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('BATCH', 'CANDIDATE', 'CERTIFICATE', 'NOTIFICATION', 'USER', 'ESCALATION', 'BATCH_SUBMISSION');

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL DEFAULT 'MH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCentre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "trainingCentreId" TEXT,
    "districtId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "trainingCentreId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCandidates" INTEGER NOT NULL DEFAULT 0,
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isLargeBatch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "candidateExtId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "courseName" TEXT NOT NULL,
    "trainingCentre" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSubmission" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submissionNum" INTEGER NOT NULL,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictApproval" (
    "id" TEXT NOT NULL,
    "batchSubmissionId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistrictApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReview" (
    "id" TEXT NOT NULL,
    "batchSubmissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "notes" TEXT,
    "flags" JSONB,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateApproval" (
    "id" TEXT NOT NULL,
    "batchSubmissionId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
    "pdfPath" TEXT,
    "qrCodeData" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "phoneNumber" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "UserRole",
    "action" "AuditAction" NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "prevStatus" TEXT,
    "newStatus" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "notifiedUserId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCentre_code_key" ON "TrainingCentre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Batch_trainingCentreId_idx" ON "Batch"("trainingCentreId");

-- CreateIndex
CREATE INDEX "Batch_districtId_idx" ON "Batch"("districtId");

-- CreateIndex
CREATE INDEX "Batch_createdAt_idx" ON "Batch"("createdAt");

-- CreateIndex
CREATE INDEX "Candidate_batchId_idx" ON "Candidate"("batchId");

-- CreateIndex
CREATE INDEX "Candidate_phone_idx" ON "Candidate"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_batchId_candidateExtId_key" ON "Candidate"("batchId", "candidateExtId");

-- CreateIndex
CREATE INDEX "BatchSubmission_batchId_idx" ON "BatchSubmission"("batchId");

-- CreateIndex
CREATE INDEX "DistrictApproval_batchSubmissionId_idx" ON "DistrictApproval"("batchSubmissionId");

-- CreateIndex
CREATE INDEX "DistrictApproval_officerId_idx" ON "DistrictApproval"("officerId");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictApproval_batchSubmissionId_officerId_key" ON "DistrictApproval"("batchSubmissionId", "officerId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityReview_batchSubmissionId_key" ON "QualityReview"("batchSubmissionId");

-- CreateIndex
CREATE INDEX "QualityReview_batchSubmissionId_idx" ON "QualityReview"("batchSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "StateApproval_batchSubmissionId_key" ON "StateApproval"("batchSubmissionId");

-- CreateIndex
CREATE INDEX "StateApproval_batchSubmissionId_idx" ON "StateApproval"("batchSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_candidateId_key" ON "Certificate"("candidateId");

-- CreateIndex
CREATE INDEX "Certificate_certificateNumber_idx" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE INDEX "Certificate_batchId_idx" ON "Certificate"("batchId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_certificateId_idx" ON "Notification"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_certificateId_channel_key" ON "Notification"("certificateId", "channel");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_batchId_idx" ON "AuditLog"("batchId");

-- CreateIndex
CREATE INDEX "Escalation_batchId_idx" ON "Escalation"("batchId");

-- CreateIndex
CREATE INDEX "Escalation_escalatedAt_idx" ON "Escalation"("escalatedAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_idx" ON "OutboxEvent"("processedAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "TrainingCentre" ADD CONSTRAINT "TrainingCentre_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_trainingCentreId_fkey" FOREIGN KEY ("trainingCentreId") REFERENCES "TrainingCentre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_trainingCentreId_fkey" FOREIGN KEY ("trainingCentreId") REFERENCES "TrainingCentre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSubmission" ADD CONSTRAINT "BatchSubmission_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSubmission" ADD CONSTRAINT "BatchSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistrictApproval" ADD CONSTRAINT "DistrictApproval_batchSubmissionId_fkey" FOREIGN KEY ("batchSubmissionId") REFERENCES "BatchSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistrictApproval" ADD CONSTRAINT "DistrictApproval_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReview" ADD CONSTRAINT "QualityReview_batchSubmissionId_fkey" FOREIGN KEY ("batchSubmissionId") REFERENCES "BatchSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReview" ADD CONSTRAINT "QualityReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateApproval" ADD CONSTRAINT "StateApproval_batchSubmissionId_fkey" FOREIGN KEY ("batchSubmissionId") REFERENCES "BatchSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateApproval" ADD CONSTRAINT "StateApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_notifiedUserId_fkey" FOREIGN KEY ("notifiedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

