import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { validateExcelUpload } from '../services/excelValidationService';

function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `PSM-${year}-${random}`;
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
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const buffers: Buffer[] = [];
    doc.on('data', (b: Buffer) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = 841.89;
    const H = 595.28;

    doc.rect(0, 0, W, H).fill('#0a2342');
    doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke('#c9a84c');
    doc.rect(28, 28, W - 56, H - 56).lineWidth(1).stroke('#c9a84c');
    doc.rect(0, 0, W, 120).fill('#0d3166');
    doc.circle(60, 60, 35).fill('#c9a84c');
    doc.fontSize(8).fillColor('#0a2342').font('Helvetica-Bold').text('PSM', 44, 54);

    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('PRAGATI SKILLS MISSION', 110, 25, { align: 'left' });
    doc.fontSize(13).font('Helvetica').fillColor('#c9a84c').text('Government Certificate of Skill Completion', 110, 62, { align: 'left' });
    doc.fillColor('#c9a84c').fontSize(20).font('Helvetica-Bold').text('CERTIFICATE OF COMPLETION', 0, 140, { align: 'center' });
    doc.moveTo(80, 170).lineTo(W - 80, 170).lineWidth(1).stroke('#c9a84c');

    doc.fillColor('#ffffff').fontSize(13).font('Helvetica').text('This is to certify that', 0, 185, { align: 'center' });
    doc.fillColor('#c9a84c').fontSize(32).font('Helvetica-Bold').text(params.candidateName, 0, 205, { align: 'center' });
    doc.fillColor('#ffffff').fontSize(13).font('Helvetica').text('has successfully completed the course', 0, 250, { align: 'center' });
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text(params.courseName, 0, 270, { align: 'center' });

    const detailY = 310;
    doc.fillColor('#aabbcc').fontSize(10).font('Helvetica');
    doc.text('Training Centre:', 100, detailY);
    doc.fillColor('#ffffff').text(params.trainingCentre, 220, detailY);
    doc.fillColor('#aabbcc').text('District:', 100, detailY + 20);
    doc.fillColor('#ffffff').text(params.district, 220, detailY + 20);
    doc.fillColor('#aabbcc').text('Date of Completion:', 100, detailY + 40);
    doc.fillColor('#ffffff').text(params.completionDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), 220, detailY + 40);
    doc.fillColor('#aabbcc').text('Certificate No.:', 100, detailY + 60);
    doc.fillColor('#c9a84c').font('Helvetica-Bold').text(params.certificateNumber, 220, detailY + 60);

    doc.moveTo(100, H - 100).lineTo(300, H - 100).lineWidth(1).stroke('#c9a84c');
    doc.fillColor('#aabbcc').fontSize(10).font('Helvetica').text('Authorized Signatory', 100, H - 90);
    doc.fillColor('#ffffff').fontSize(9).text('Director, Pragati Skills Mission', 100, H - 75);

    try {
      const qrImageBuffer = Buffer.from(params.qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImageBuffer, W - 200, H - 180, { width: 100, height: 100 });
      doc.fillColor('#aabbcc').fontSize(8).font('Helvetica').text('Scan to verify authenticity', W - 220, H - 70, { align: 'center', width: 140 });
    } catch {}

    doc.end();
  });
}

const app = express();
const httpServer = createServer(app);
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const JWT_SECRET = process.env.JWT_SECRET || 'certiflow_secret_key_demo';
const CERT_DIR = path.resolve(process.env.CERTIFICATE_STORAGE_PATH || './certificates');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

export const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

function emitEvent(room: string, event: string, data: unknown) {
  io.emit(event, data);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── In-Memory Database ────────────────────────────────────────────────────────
const districts = [
  { id: 'dist-pune', name: 'Pune', stateCode: 'MH', trainingCentres: [{ id: 'tc-pune-001', name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' }] },
  { id: 'dist-nashik', name: 'Nashik', stateCode: 'MH', trainingCentres: [{ id: 'tc-nsk-001', name: 'Nashik Vocational Institute', code: 'TC-NSK-001' }] },
  { id: 'dist-aurangabad', name: 'Aurangabad', stateCode: 'MH', trainingCentres: [] },
];

const demoUsers = [
  { id: 'user-anika', name: 'Anika Sharma', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE', trainingCentreId: 'tc-pune-001', districtId: 'dist-pune', trainingCentre: { id: 'tc-pune-001', name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' }, district: { id: 'dist-pune', name: 'Pune' } },
  { id: 'user-dev', name: 'Dev Kulkarni', email: 'dev@certiflow.demo', role: 'DISTRICT_OFFICER', districtId: 'dist-pune', district: { id: 'dist-pune', name: 'Pune' } },
  { id: 'user-meera', name: 'Meera Joshi', email: 'meera@certiflow.demo', role: 'DISTRICT_OFFICER', districtId: 'dist-pune', district: { id: 'dist-pune', name: 'Pune' } },
  { id: 'user-kabir', name: 'Kabir Patel', email: 'kabir@certiflow.demo', role: 'DISTRICT_OFFICER', districtId: 'dist-nashik', district: { id: 'dist-nashik', name: 'Nashik' } },
  { id: 'user-neha', name: 'Neha Gupta', email: 'neha@certiflow.demo', role: 'QUALITY_TEAM' },
  { id: 'user-farah', name: 'Farah Khan', email: 'farah@certiflow.demo', role: 'STATE_OFFICE' },
];

let batches: any[] = [
  {
    id: 'batch-demo-1',
    trainingCentreId: 'tc-pune-001',
    districtId: 'dist-pune',
    uploadedById: 'user-anika',
    courseName: 'Basic Computer Skills',
    batchName: 'Sample Batch 2024-01',
    status: 'DRAFT',
    totalCandidates: 3,
    submissionCount: 0,
    notes: 'Demo batch ready for submission',
    isLargeBatch: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    trainingCentre: { name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' },
    district: { name: 'Pune' },
    uploadedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE' },
    candidates: [
      { id: 'cand-1', candidateExtId: 'CAND-001', fullName: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@example.com', courseName: 'Basic Computer Skills', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 85.5, status: 'PENDING', completionDate: new Date('2024-10-15') },
      { id: 'cand-2', candidateExtId: 'CAND-002', fullName: 'Priya Deshmukh', phone: '9765432109', email: 'priya@example.com', courseName: 'Basic Computer Skills', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 92.0, status: 'PENDING', completionDate: new Date('2024-10-15') },
      { id: 'cand-3', candidateExtId: 'CAND-003', fullName: 'Amit Patil', phone: '8765432108', courseName: 'Basic Computer Skills', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 78.0, status: 'PENDING', completionDate: new Date('2024-10-15') },
    ],
    submissions: [],
    certificates: [],
    escalations: [],
  }
];

let certificates: any[] = [];
let auditLogs: any[] = [];
let notifications: any[] = [];

function addAudit(action: string, userId: string, role: string, batchId?: string, reason?: string, metadata?: any) {
  const user = demoUsers.find(u => u.id === userId);
  auditLogs.push({
    id: `audit-${Date.now()}-${Math.random()}`,
    action,
    userId,
    userRole: role,
    user: user ? { id: user.id, name: user.name, role: user.role } : null,
    batchId: batchId || null,
    reason: reason || null,
    metadata: metadata || null,
    createdAt: new Date(),
  });
}

// ── Auth Middleware ──────────────────────────────────────────────────────────
function authenticate(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'standalone-demo', timestamp: new Date() }));

// ── Auth Routes ──────────────────────────────────────────────────────────────
app.get('/api/auth/demo-users', (_req, res) => res.json(demoUsers));

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = demoUsers.find(u => u.email.toLowerCase() === email?.toLowerCase());
  if (!user || password !== 'Demo@1234') {
    return res.status(401).json({ error: 'Invalid credentials. Use Demo@1234' });
  }
  const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, trainingCentreId: user.trainingCentreId, districtId: user.districtId }, JWT_SECRET, { expiresIn: '8h' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ accessToken, refreshToken, user });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  const user = demoUsers.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const user = demoUsers.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, trainingCentreId: user.trainingCentreId, districtId: user.districtId }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', (_req, res) => res.json({ message: 'Logged out' }));

// ── Districts ────────────────────────────────────────────────────────────────
app.get('/api/districts', (_req, res) => res.json(districts));

// ── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', authenticate, (req: any, res) => {
  const pendingApprovals = batches.filter(b => ['DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW'].includes(b.status)).length;
  const approvedBatches = batches.filter(b => b.status === 'APPROVED').length;
  const rejectedBatches = batches.filter(b => b.status === 'REJECTED').length;
  const returnedBatches = batches.filter(b => b.status === 'RETURNED').length;
  const certificatesIssued = certificates.filter(c => c.status === 'ACTIVE').length;
  const cancelledCertificates = certificates.filter(c => c.status === 'CANCELLED').length;
  res.json({
    totalBatches: batches.length,
    pendingApprovals,
    approvedBatches,
    rejectedBatches,
    returnedBatches,
    certificatesIssued,
    cancelledCertificates,
    delayedBatches: 0,
    pendingNotifications: 0,
    recentBatches: batches.slice(0, 5),
  });
});

app.get('/api/dashboard/delayed-batches', authenticate, (_req, res) => res.json([]));
app.get('/api/dashboard/notifications', authenticate, (_req, res) => res.json(notifications));

// ── Batches ──────────────────────────────────────────────────────────────────
app.get('/api/batches', authenticate, (req: any, res) => {
  const { status } = req.query;
  let result = [...batches];
  if (req.user.role === 'TRAINING_CENTRE') {
    result = result.filter(b => b.uploadedById === req.user.id || b.trainingCentreId === req.user.trainingCentreId);
  }
  if (status) {
    result = result.filter(b => b.status === status);
  }
  res.json({ data: result, pagination: { total: result.length, page: 1, limit: 20, totalPages: 1 } });
});

app.post('/api/batches', authenticate, (req: any, res) => {
  const { batchName, courseName, districtId, notes } = req.body;
  const district = districts.find(d => d.id === districtId) || districts[0];
  const tc = demoUsers.find(u => u.id === req.user.id)?.trainingCentre || { name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' };

  const newBatch = {
    id: `batch-${Date.now()}`,
    trainingCentreId: req.user.trainingCentreId || 'tc-pune-001',
    districtId: district.id,
    uploadedById: req.user.id,
    courseName,
    batchName,
    status: 'DRAFT',
    totalCandidates: 0,
    submissionCount: 0,
    notes: notes || null,
    isLargeBatch: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    trainingCentre: tc,
    district: { name: district.name },
    uploadedBy: { name: req.user.name, email: req.user.email, role: req.user.role },
    candidates: [],
    submissions: [],
    certificates: [],
    escalations: [],
  };

  batches.unshift(newBatch);
  addAudit('BATCH_CREATED', req.user.id, req.user.role, newBatch.id);
  res.status(201).json(newBatch);
});

app.post('/api/batches/:id/upload', authenticate, upload.single('file'), async (req: any, res) => {
  const id = req.params.id;
  const batch = batches.find(b => b.id === id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Use the REAL Excel validation service!
  const result = await validateExcelUpload(req.file.buffer);

  if (!result.valid) {
    addAudit('BATCH_VALIDATION_FAILED', req.user.id, req.user.role, id, undefined, { errorCount: result.errors.length });
    return res.status(422).json({
      valid: false,
      errors: result.errors,
      message: `Upload rejected: ${result.errors.length} error(s) found. Correct all errors and re-upload.`,
    });
  }

  const isLargeBatch = result.candidates.length >= 50;
  batch.candidates = result.candidates.map((c, i) => ({
    id: `cand-${Date.now()}-${i}`,
    ...c,
    status: 'PENDING',
  }));
  batch.totalCandidates = result.candidates.length;
  batch.isLargeBatch = isLargeBatch;
  batch.updatedAt = new Date();

  addAudit('BATCH_UPLOAD_SUCCESS', req.user.id, req.user.role, id, undefined, { candidateCount: result.candidates.length, isLargeBatch });
  res.json({
    valid: true,
    candidateCount: result.candidates.length,
    isLargeBatch,
    message: `${result.candidates.length} candidates uploaded successfully.`,
  });
});

app.post('/api/batches/:id/submit', authenticate, (req: any, res) => {
  const id = req.params.id;
  const batch = batches.find(b => b.id === id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.candidates.length === 0) return res.status(400).json({ error: 'Cannot submit empty batch. Upload candidates first.' });

  const submission = {
    id: `sub-${Date.now()}`,
    batchId: id,
    submittedById: req.user.id,
    submittedBy: { name: req.user.name, email: req.user.email },
    submissionNum: (batch.submissionCount || 0) + 1,
    submittedAt: new Date(),
    districtApprovals: [],
    qualityReview: null,
    stateApproval: null,
  };

  batch.submissions.unshift(submission);
  batch.submissionCount = submission.submissionNum;
  batch.status = 'DISTRICT_REVIEW';
  batch.updatedAt = new Date();

  addAudit('BATCH_SUBMITTED', req.user.id, req.user.role, id);
  emitEvent('batches', 'batch:updated', { batchId: id, status: 'DISTRICT_REVIEW' });
  res.json({ message: 'Batch submitted for district review', status: 'DISTRICT_REVIEW' });
});

// ── District Approval (Requires 2 Distinct Officers) ─────────────────────────
app.post('/api/batches/:id/district-approve', authenticate, (req: any, res) => {
  const id = req.params.id;
  const { decision, reason } = req.body;
  const batch = batches.find(b => b.id === id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.status !== 'DISTRICT_REVIEW') return res.status(400).json({ error: `Cannot review batch in ${batch.status} state` });

  const submission = batch.submissions[0];
  if (!submission) return res.status(400).json({ error: 'No active submission found' });

  // Guard: Same officer cannot approve twice
  if (submission.districtApprovals.some((a: any) => a.officerId === req.user.id)) {
    return res.status(409).json({ error: 'You have already reviewed this submission' });
  }

  const approval = {
    id: `da-${Date.now()}`,
    officerId: req.user.id,
    officer: { name: req.user.name, email: req.user.email },
    decision,
    reason: reason || null,
    decidedAt: new Date(),
  };

  submission.districtApprovals.push(approval);
  addAudit(`DISTRICT_${decision}`, req.user.id, req.user.role, id, reason);

  if (decision === 'REJECTED') {
    batch.status = 'REJECTED';
  } else if (decision === 'RETURNED') {
    batch.status = 'RETURNED';
  } else {
    // Check if 2 distinct officers have approved
    const approvals = submission.districtApprovals.filter((a: any) => a.decision === 'APPROVED');
    if (approvals.length >= 2) {
      batch.status = batch.isLargeBatch ? 'QUALITY_REVIEW' : 'STATE_REVIEW';
    }
  }

  batch.updatedAt = new Date();
  emitEvent('batches', 'batch:updated', { batchId: id, status: batch.status });
  res.json({ message: `Decision recorded: ${decision}`, status: batch.status });
});

// ── Quality Review ───────────────────────────────────────────────────────────
app.post('/api/batches/:id/quality-review', authenticate, (req: any, res) => {
  const id = req.params.id;
  const { decision, notes } = req.body;
  const batch = batches.find(b => b.id === id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const submission = batch.submissions[0];
  submission.qualityReview = {
    reviewerId: req.user.id,
    reviewer: { name: req.user.name },
    decision,
    notes,
    reviewedAt: new Date(),
  };

  addAudit('QUALITY_REVIEWED', req.user.id, req.user.role, id, notes);

  if (decision === 'APPROVED') batch.status = 'STATE_REVIEW';
  else if (decision === 'REJECTED') batch.status = 'REJECTED';
  else if (decision === 'RETURNED') batch.status = 'RETURNED';

  batch.updatedAt = new Date();
  emitEvent('batches', 'batch:updated', { batchId: id, status: batch.status });
  res.json({ message: `Quality decision recorded: ${decision}`, status: batch.status });
});

// ── State Final Approval (Triggers Real PDF & QR Generation) ─────────────────
app.post('/api/batches/:id/state-approve', authenticate, async (req: any, res) => {
  const id = req.params.id;
  const { decision, reason } = req.body;
  const batch = batches.find(b => b.id === id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const submission = batch.submissions[0];
  submission.stateApproval = {
    approvedById: req.user.id,
    approvedBy: { name: req.user.name },
    decision,
    reason,
    decidedAt: new Date(),
  };

  addAudit(`STATE_${decision}`, req.user.id, req.user.role, id, reason);

  if (decision === 'APPROVED') {
    batch.status = 'APPROVED';
    // Generate real PDF & QR certificates for all candidates!
    for (const cand of batch.candidates) {
      const certNum = generateCertificateNumber();
      const verifyUrl = `http://localhost:5173/verify/${certNum}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      const pdfBuffer = await generateCertificatePDF({
        candidateName: cand.fullName,
        courseName: cand.courseName || batch.courseName,
        trainingCentre: cand.trainingCentre || batch.trainingCentre?.name || 'Skill Centre',
        district: cand.district || batch.district?.name || 'Pune',
        completionDate: cand.completionDate ? new Date(cand.completionDate) : new Date(),
        certificateNumber: certNum,
        qrDataUrl,
      });
      const fileName = `${certNum}.pdf`;
      fs.writeFileSync(path.join(CERT_DIR, fileName), pdfBuffer);

      const cert = {
        id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        certificateNumber: certNum,
        candidateId: cand.id,
        candidateName: cand.fullName,
        candidate: { ...cand },
        batchId: id,
        status: 'ACTIVE',
        pdfPath: fileName,
        qrCodeData: verifyUrl,
        generatedAt: new Date(),
      };

      cand.status = 'CERTIFIED';
      cand.certificate = { certificateNumber: certNum, status: 'ACTIVE' };
      certificates.unshift(cert);
      batch.certificates.push(cert);
    }
  } else if (decision === 'REJECTED') {
    batch.status = 'REJECTED';
  } else if (decision === 'RETURNED') {
    batch.status = 'RETURNED';
  }

  batch.updatedAt = new Date();
  emitEvent('batches', 'batch:updated', { batchId: id, status: batch.status });
  res.json({ message: `State decision recorded: ${decision}`, status: batch.status });
});

// ── Resubmit Returned Batch ──────────────────────────────────────────────────
app.post('/api/batches/:id/resubmit', authenticate, (req: any, res) => {
  const id = req.params.id;
  const batch = batches.find(b => b.id === id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.status !== 'RETURNED') return res.status(400).json({ error: 'Only returned batches can be resubmitted' });

  const submission = {
    id: `sub-${Date.now()}`,
    batchId: id,
    submittedById: req.user.id,
    submittedBy: { name: req.user.name },
    submissionNum: batch.submissionCount + 1,
    submittedAt: new Date(),
    districtApprovals: [], // Reset! Requires fresh dual approvals
    qualityReview: null,
    stateApproval: null,
  };

  batch.submissions.unshift(submission);
  batch.submissionCount = submission.submissionNum;
  batch.status = 'DISTRICT_REVIEW';
  batch.updatedAt = new Date();

  addAudit('BATCH_RESUBMITTED', req.user.id, req.user.role, id, req.body.notes);
  emitEvent('batches', 'batch:updated', { batchId: id, status: 'DISTRICT_REVIEW' });
  res.json({ message: 'Batch resubmitted for fresh district review', status: 'DISTRICT_REVIEW' });
});

app.get('/api/batches/:id', authenticate, (req, res) => {
  const batch = batches.find(b => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
});

app.get('/api/batches/:id/candidates', authenticate, (req, res) => {
  const batch = batches.find(b => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch.candidates);
});

app.get('/api/batches/:id/audit', authenticate, (req, res) => {
  const logs = auditLogs.filter(a => a.batchId === req.params.id);
  res.json(logs);
});

// ── Certificates ─────────────────────────────────────────────────────────────
app.get('/api/certificates', authenticate, (_req, res) => {
  res.json({ data: certificates, pagination: { total: certificates.length, page: 1, limit: 20, totalPages: 1 } });
});

app.get('/api/certificates/:id/download', (req, res) => {
  const cert = certificates.find(c => c.id === req.params.id || c.certificateNumber === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  if (cert.status === 'CANCELLED') return res.status(410).json({ error: 'Certificate has been cancelled' });

  const filePath = path.join(CERT_DIR, cert.pdfPath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF file not found on disk' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateNumber}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});

app.post('/api/certificates/:id/cancel', authenticate, (req: any, res) => {
  if (req.user.role !== 'STATE_OFFICE') return res.status(403).json({ error: 'Forbidden' });
  const { reason } = req.body;
  const cert = certificates.find(c => c.id === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  cert.status = 'CANCELLED';
  cert.cancelledAt = new Date();
  cert.cancelledBy = { name: req.user.name, role: req.user.role };
  cert.cancellationReason = reason;

  addAudit('CERTIFICATE_CANCELLED', req.user.id, req.user.role, cert.batchId, reason);
  res.json({ message: 'Certificate cancelled successfully', status: 'CANCELLED' });
});

// ── Public Verification (Zero Auth, Privacy Protected) ──────────────────────
app.get('/api/verify/:certNumber', (req, res) => {
  const certNumber = req.params.certNumber?.toUpperCase();
  const cert = certificates.find(c => c.certificateNumber === certNumber);

  if (!cert) {
    return res.json({ status: 'INVALID', message: 'Certificate ID does not exist in our records.' });
  }

  if (cert.status === 'CANCELLED') {
    return res.json({
      status: 'CANCELLED',
      certificateNumber: cert.certificateNumber,
      message: 'This certificate was previously issued but has been cancelled by the state office.',
      cancelledAt: cert.cancelledAt,
      reason: cert.cancellationReason,
    });
  }

  // VALID: Never expose phone, email, marks or internal IDs
  res.json({
    status: 'VALID',
    certificateNumber: cert.certificateNumber,
    holder: cert.candidate?.fullName || cert.candidateName,
    course: cert.candidate?.courseName || 'Skills Training',
    trainingCentre: cert.candidate?.trainingCentre || 'Pune Skill Development Centre',
    district: cert.candidate?.district || 'Pune',
    completionDate: cert.candidate?.completionDate || new Date(),
    issuedAt: cert.generatedAt,
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 CertiFlow API running in Standalone Mode on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
});
