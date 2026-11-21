import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { prisma } from '../db/prisma';
import { notificationQueue } from '../utils/queues';
import { createAuditLog } from './auditService';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

const STORAGE_PATH = process.env.CERTIFICATE_STORAGE_PATH || './certificates';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `PSM-${year}-${random}`;
}

async function ensureUniqueNumber(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const num = generateCertificateNumber();
    const exists = await prisma.certificate.findUnique({ where: { certificateNumber: num } });
    if (!exists) return num;
    attempts++;
  }
  throw new Error('Failed to generate unique certificate number after 10 attempts');
}

async function generateQRCode(verificationUrl: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl);
}

async function generateCertificatePDF(params: {
  candidateName: string;
  courseName: string;
  trainingCentre: string;
  district: string;
  completionDate: Date;
  certificateNumber: string;
  qrDataUrl: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (b: Buffer) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = 841.89; // A4 landscape width in points
    const H = 595.28; // A4 landscape height in points

    // Background gradient (simulated with rectangles)
    doc.rect(0, 0, W, H).fill('#0a2342');

    // Decorative border
    doc.rect(20, 20, W - 40, H - 40)
      .lineWidth(3)
      .stroke('#c9a84c');

    doc.rect(28, 28, W - 56, H - 56)
      .lineWidth(1)
      .stroke('#c9a84c');

    // Header background bar
    doc.rect(0, 0, W, 120).fill('#0d3166');

    // Programme logo area
    doc.circle(60, 60, 35).fill('#c9a84c');
    doc.fontSize(8).fillColor('#0a2342').font('Helvetica-Bold').text('PSM', 44, 54);

    // Header text
    doc.fillColor('#ffffff')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('PRAGATI SKILLS MISSION', 110, 25, { align: 'left' });

    doc.fontSize(13)
      .font('Helvetica')
      .fillColor('#c9a84c')
      .text('Government Certificate of Skill Completion', 110, 62, { align: 'left' });

    // Certificate title
    doc.fillColor('#c9a84c')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('CERTIFICATE OF COMPLETION', 0, 140, { align: 'center' });

    // Divider
    doc.moveTo(80, 170).lineTo(W - 80, 170).lineWidth(1).stroke('#c9a84c');

    // Body text
    doc.fillColor('#ffffff')
      .fontSize(13)
      .font('Helvetica')
      .text('This is to certify that', 0, 185, { align: 'center' });

    // Candidate name
    doc.fillColor('#c9a84c')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text(params.candidateName, 0, 205, { align: 'center' });

    // Course info
    doc.fillColor('#ffffff')
      .fontSize(13)
      .font('Helvetica')
      .text('has successfully completed the course', 0, 250, { align: 'center' });

    doc.fillColor('#ffffff')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(params.courseName, 0, 270, { align: 'center' });

    // Details grid
    const detailY = 310;
    doc.fillColor('#aabbcc').fontSize(10).font('Helvetica');

    doc.text('Training Centre:', 100, detailY);
    doc.fillColor('#ffffff').text(params.trainingCentre, 220, detailY);

    doc.fillColor('#aabbcc').text('District:', 100, detailY + 20);
    doc.fillColor('#ffffff').text(params.district, 220, detailY + 20);

    doc.fillColor('#aabbcc').text('Date of Completion:', 100, detailY + 40);
    doc.fillColor('#ffffff').text(params.completionDate.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    }), 220, detailY + 40);

    doc.fillColor('#aabbcc').text('Certificate No.:', 100, detailY + 60);
    doc.fillColor('#c9a84c').font('Helvetica-Bold').text(params.certificateNumber, 220, detailY + 60);

    // Signature line
    doc.moveTo(100, H - 100).lineTo(300, H - 100).lineWidth(1).stroke('#c9a84c');
    doc.fillColor('#aabbcc').fontSize(10).font('Helvetica')
      .text('Director, Pragati Skills Mission', 100, H - 90);

    // QR Code
    if (params.qrDataUrl) {
      try {
        const qrBuffer = Buffer.from(params.qrDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, W - 160, H - 160, { width: 110 });
        doc.fillColor('#aabbcc').fontSize(8)
          .text('Scan to verify', W - 155, H - 50, { width: 100, align: 'center' });
      } catch {
        // QR image fallback
      }
    }

    // Footer
    doc.rect(0, H - 30, W, 30).fill('#0d3166');
    doc.fillColor('#aabbcc').fontSize(8).font('Helvetica')
      .text(`Verify at: ${FRONTEND_URL}/verify/${params.certificateNumber}  |  Issued by Pragati Skills Mission  |  Certificate No: ${params.certificateNumber}`,
        0, H - 22, { align: 'center' });

    doc.end();
  });
}

export async function generateCertificatesForBatch(batchId: string): Promise<void> {
  logger.info(`Starting certificate generation for batch ${batchId}`);

  // Get pending candidates (without certificates)
  const candidates = await prisma.candidate.findMany({
    where: {
      batchId,
      certificate: null, // Not yet certified
    },
    include: { batch: true },
  });

  if (candidates.length === 0) {
    logger.info(`No pending candidates for batch ${batchId}. Possibly already generated.`);
    return;
  }

  // Ensure storage directory exists
  fs.mkdirSync(STORAGE_PATH, { recursive: true });

  let generated = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      // Check again (idempotent) – another worker might have processed this
      const existing = await prisma.certificate.findUnique({
        where: { candidateId: candidate.id },
      });
      if (existing) {
        logger.info(`Certificate already exists for candidate ${candidate.id}`);
        continue;
      }

      const certNumber = await ensureUniqueNumber();
      const verificationUrl = `${FRONTEND_URL}/verify/${certNumber}`;
      const qrDataUrl = await generateQRCode(verificationUrl);

      const pdfBuffer = await generateCertificatePDF({
        candidateName: candidate.fullName,
        courseName: candidate.courseName,
        trainingCentre: candidate.trainingCentre,
        district: candidate.district,
        completionDate: candidate.completionDate,
        certificateNumber: certNumber,
        qrDataUrl,
      });

      const pdfFileName = `${certNumber}.pdf`;
      const pdfPath = path.join(STORAGE_PATH, pdfFileName);
      fs.writeFileSync(pdfPath, pdfBuffer);

      // Save certificate record
      const certificate = await prisma.certificate.create({
        data: {
          certificateNumber: certNumber,
          candidateId: candidate.id,
          batchId,
          status: 'ACTIVE',
          pdfPath: pdfFileName,
          qrCodeData: verificationUrl,
          generatedAt: new Date(),
        },
      });

      // Update candidate status
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { status: 'CERTIFIED' },
      });

      await createAuditLog({
        action: 'CERTIFICATE_GENERATED',
        entityType: 'CERTIFICATE',
        entityId: certificate.id,
        newStatus: 'ACTIVE',
        batchId,
        metadata: { certificateNumber: certNumber, candidateId: candidate.id },
      });

      // Queue notification (idempotent job ID)
      await notificationQueue.add(
        'send-whatsapp',
        {
          certificateId: certificate.id,
          candidateId: candidate.id,
          phone: candidate.phone,
          candidateName: candidate.fullName,
          courseName: candidate.courseName,
          certificateNumber: certNumber,
          verificationUrl,
        },
        { jobId: `notif-${certificate.id}` } // idempotent
      );

      generated++;
    } catch (err) {
      logger.error(`Failed to generate certificate for candidate ${candidate.id}`, { error: (err as Error).message });
      failed++;
    }
  }

  logger.info(`Certificate generation complete for batch ${batchId}: ${generated} generated, ${failed} failed`);

  if (generated > 0) {
    await createAuditLog({
      action: 'CERTIFICATE_GENERATED',
      entityType: 'BATCH',
      entityId: batchId,
      batchId,
      metadata: { generated, failed, total: candidates.length },
    });
  }
}
