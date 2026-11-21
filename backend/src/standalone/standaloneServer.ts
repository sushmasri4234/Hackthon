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

    // Elegant Pastel / Royal styling
    doc.rect(0, 0, W, H).fill('#0f2444');
    doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke('#d4af37');
    doc.rect(26, 26, W - 52, H - 52).lineWidth(1).stroke('#d4af37');
    doc.rect(0, 0, W, 115).fill('#132f58');
    doc.circle(60, 58, 32).fill('#d4af37');
    doc.fontSize(9).fillColor('#0f2444').font('Helvetica-Bold').text('PSM', 45, 52);

    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('PRAGATI SKILLS MISSION', 110, 26, { align: 'left' });
    doc.fontSize(12).font('Helvetica').fillColor('#f5d77f').text('Government Certificate of Skill Competence & Training', 110, 60, { align: 'left' });
    doc.fillColor('#d4af37').fontSize(19).font('Helvetica-Bold').text('CERTIFICATE OF COMPLETION', 0, 138, { align: 'center' });
    doc.moveTo(80, 166).lineTo(W - 80, 166).lineWidth(1).stroke('#d4af37');

    doc.fillColor('#e2e8f0').fontSize(12).font('Helvetica').text('This is proudly presented to', 0, 180, { align: 'center' });
    doc.fillColor('#f8fafc').fontSize(30).font('Helvetica-Bold').text(params.candidateName, 0, 200, { align: 'center' });
    doc.fillColor('#cbd5e1').fontSize(12).font('Helvetica').text('for successfully completing the approved vocational training programme in', 0, 242, { align: 'center' });
    doc.fillColor('#fde047').fontSize(17).font('Helvetica-Bold').text(params.courseName, 0, 262, { align: 'center' });

    const detailY = 300;
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica');
    doc.text('Training Centre:', 100, detailY);
    doc.fillColor('#f8fafc').text(params.trainingCentre, 220, detailY);

    doc.fillColor('#94a3b8').text('District:', 100, detailY + 20);
    doc.fillColor('#f8fafc').text(params.district, 220, detailY + 20);

    doc.fillColor('#94a3b8').text('Date of Completion:', 100, detailY + 40);
    doc.fillColor('#f8fafc').text(params.completionDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), 220, detailY + 40);

    doc.fillColor('#94a3b8').text('Certificate ID:', 100, detailY + 60);
    doc.fillColor('#fde047').font('Helvetica-Bold').text(params.certificateNumber, 220, detailY + 60);

    doc.moveTo(100, H - 95).lineTo(280, H - 95).lineWidth(1).stroke('#d4af37');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('Authorized Signatory', 100, H - 85);
    doc.fillColor('#e2e8f0').fontSize(8.5).text('Mission Director, Pragati Skills Mission', 100, H - 72);

    try {
      const qrImageBuffer = Buffer.from(params.qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImageBuffer, W - 190, H - 175, { width: 95, height: 95 });
      doc.fillColor('#cbd5e1').fontSize(7.5).font('Helvetica').text('Scan to verify authenticity', W - 210, H - 70, { align: 'center', width: 135 });
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
  { id: 'dist-aurangabad', name: 'Aurangabad', stateCode: 'MH', trainingCentres: [{ id: 'tc-aur-001', name: 'Marathwada Skill Hub', code: 'TC-AUR-001' }] },
];

const demoUsers: any[] = [
  { id: 'user-anika', name: 'Anika Sharma', email: 'anika@certiflow.demo', password: 'Demo@1234', role: 'TRAINING_CENTRE', trainingCentreId: 'tc-pune-001', districtId: 'dist-pune', trainingCentre: { id: 'tc-pune-001', name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' }, district: { id: 'dist-pune', name: 'Pune' } },
  { id: 'user-dev', name: 'Dev Kulkarni', email: 'dev@certiflow.demo', password: 'Demo@1234', role: 'DISTRICT_OFFICER', districtId: 'dist-pune', district: { id: 'dist-pune', name: 'Pune' } },
  { id: 'user-meera', name: 'Meera Joshi', email: 'meera@certiflow.demo', password: 'Demo@1234', role: 'DISTRICT_OFFICER', districtId: 'dist-pune', district: { id: 'dist-pune', name: 'Pune' } },
  { id: 'user-kabir', name: 'Kabir Patel', email: 'kabir@certiflow.demo', password: 'Demo@1234', role: 'DISTRICT_OFFICER', districtId: 'dist-nashik', district: { id: 'dist-nashik', name: 'Nashik' } },
  { id: 'user-neha', name: 'Neha Gupta', email: 'neha@certiflow.demo', password: 'Demo@1234', role: 'QUALITY_TEAM' },
  { id: 'user-farah', name: 'Farah Khan', email: 'farah@certiflow.demo', password: 'Demo@1234', role: 'STATE_OFFICE' },
];

let batches: any[] = [];
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

// ── Pre-Seed Comprehensive Workflow Data ──────────────────────────────────────
async function seedInitialData() {
  const tc1 = { name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' };
  const tc2 = { name: 'Nashik Vocational Institute', code: 'TC-NSK-001' };

  // 1. Batch in DISTRICT_REVIEW (Awaiting Dev & Meera)
  const batch1 = {
    id: 'batch-pune-01',
    trainingCentreId: 'tc-pune-001',
    districtId: 'dist-pune',
    uploadedById: 'user-anika',
    courseName: 'Basic Computer Skills',
    batchName: 'Basic Computer Skills – Batch 2024-01',
    status: 'DISTRICT_REVIEW',
    totalCandidates: 3,
    submissionCount: 1,
    notes: 'Submitted for district review',
    isLargeBatch: false,
    createdAt: new Date(Date.now() - 3600000 * 24),
    updatedAt: new Date(Date.now() - 3600000 * 12),
    trainingCentre: tc1,
    district: { name: 'Pune' },
    uploadedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE' },
    candidates: [
      { id: 'c-101', candidateExtId: 'CAND-001', fullName: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@example.com', courseName: 'Basic Computer Skills', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 85.5, status: 'PENDING', completionDate: new Date('2024-10-15') },
      { id: 'c-102', candidateExtId: 'CAND-002', fullName: 'Priya Deshmukh', phone: '9765432109', email: 'priya@example.com', courseName: 'Basic Computer Skills', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 92.0, status: 'PENDING', completionDate: new Date('2024-10-15') },
      { id: 'c-103', candidateExtId: 'CAND-003', fullName: 'Amit Patil', phone: '8765432108', courseName: 'Basic Computer Skills', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 78.0, status: 'PENDING', completionDate: new Date('2024-10-15') },
    ],
    submissions: [
      {
        id: 'sub-pune-01',
        batchId: 'batch-pune-01',
        submittedById: 'user-anika',
        submittedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo' },
        submissionNum: 1,
        submittedAt: new Date(Date.now() - 3600000 * 12),
        districtApprovals: [], // Awaiting Officer 1 and 2
        qualityReview: null,
        stateApproval: null,
      }
    ],
    certificates: [],
    escalations: [],
  };

  // 2. Batch in DISTRICT_REVIEW (Officer 1 already approved, awaiting Officer 2 Meera)
  const batch2 = {
    id: 'batch-nsk-02',
    trainingCentreId: 'tc-nsk-001',
    districtId: 'dist-pune',
    uploadedById: 'user-anika',
    courseName: 'Solar PV Technician',
    batchName: 'Solar PV Technician – Batch 2024-02',
    status: 'DISTRICT_REVIEW',
    totalCandidates: 3,
    submissionCount: 1,
    notes: 'Approved by Dev, awaiting second district officer',
    isLargeBatch: false,
    createdAt: new Date(Date.now() - 3600000 * 48),
    updatedAt: new Date(Date.now() - 3600000 * 6),
    trainingCentre: tc1,
    district: { name: 'Pune' },
    uploadedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE' },
    candidates: [
      { id: 'c-201', candidateExtId: 'CAND-021', fullName: 'Suresh Raina', phone: '9822334455', email: 'suresh@example.com', courseName: 'Solar PV Technician', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 88.0, status: 'PENDING', completionDate: new Date('2024-10-20') },
      { id: 'c-202', candidateExtId: 'CAND-022', fullName: 'Kavita Shinde', phone: '9822334456', email: 'kavita@example.com', courseName: 'Solar PV Technician', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 91.5, status: 'PENDING', completionDate: new Date('2024-10-20') },
      { id: 'c-203', candidateExtId: 'CAND-023', fullName: 'Ganesh More', phone: '9822334457', email: 'ganesh@example.com', courseName: 'Solar PV Technician', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 82.0, status: 'PENDING', completionDate: new Date('2024-10-20') },
    ],
    submissions: [
      {
        id: 'sub-nsk-02',
        batchId: 'batch-nsk-02',
        submittedById: 'user-anika',
        submittedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo' },
        submissionNum: 1,
        submittedAt: new Date(Date.now() - 3600000 * 24),
        districtApprovals: [
          {
            id: 'da-dev-01',
            officerId: 'user-dev',
            officer: { name: 'Dev Kulkarni', email: 'dev@certiflow.demo' },
            decision: 'APPROVED',
            reason: 'Candidate records verified with attendance logs.',
            decidedAt: new Date(Date.now() - 3600000 * 6),
          }
        ],
        qualityReview: null,
        stateApproval: null,
      }
    ],
    certificates: [],
    escalations: [],
  };

  // 3. Large Batch in QUALITY_REVIEW (Awaiting Neha Gupta)
  const batch3 = {
    id: 'batch-large-03',
    trainingCentreId: 'tc-pune-001',
    districtId: 'dist-pune',
    uploadedById: 'user-anika',
    courseName: 'Advanced IT & Cloud Skills',
    batchName: 'Advanced Cloud & Web – Batch 2024-03',
    status: 'QUALITY_REVIEW',
    totalCandidates: 60,
    submissionCount: 1,
    notes: 'Large batch requiring quality scrutiny',
    isLargeBatch: true,
    createdAt: new Date(Date.now() - 3600000 * 36),
    updatedAt: new Date(Date.now() - 3600000 * 4),
    trainingCentre: tc1,
    district: { name: 'Pune' },
    uploadedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE' },
    candidates: Array.from({ length: 60 }, (_, i) => ({
      id: `c-lg-${i + 1}`,
      candidateExtId: `CAND-LG-${String(i + 1).padStart(3, '0')}`,
      fullName: `Candidate ${i + 1} Cloud`,
      phone: `98${String(10000000 + i + 1)}`,
      email: `cand${i + 1}@cloudskill.org`,
      courseName: 'Advanced IT & Cloud Skills',
      trainingCentre: 'Pune Skill Development Centre',
      district: 'Pune',
      marks: 75 + (i % 20),
      status: 'PENDING',
      completionDate: new Date('2024-11-01'),
    })),
    submissions: [
      {
        id: 'sub-lg-03',
        batchId: 'batch-large-03',
        submittedById: 'user-anika',
        submissionNum: 1,
        submittedAt: new Date(Date.now() - 3600000 * 20),
        districtApprovals: [
          { id: 'da-1', officerId: 'user-dev', officer: { name: 'Dev Kulkarni' }, decision: 'APPROVED', decidedAt: new Date() },
          { id: 'da-2', officerId: 'user-meera', officer: { name: 'Meera Joshi' }, decision: 'APPROVED', decidedAt: new Date() },
        ],
        qualityReview: null,
        stateApproval: null,
      }
    ],
    certificates: [],
    escalations: [],
  };

  // 4. Batch in STATE_REVIEW (Awaiting Farah Khan)
  const batch4 = {
    id: 'batch-state-04',
    trainingCentreId: 'tc-nsk-001',
    districtId: 'dist-nashik',
    uploadedById: 'user-anika',
    courseName: 'Healthcare General Duty Assistant',
    batchName: 'Healthcare Assistant – Batch 2024-04',
    status: 'STATE_REVIEW',
    totalCandidates: 3,
    submissionCount: 1,
    notes: 'Dual district approved, awaiting final state authorization',
    isLargeBatch: false,
    createdAt: new Date(Date.now() - 3600000 * 40),
    updatedAt: new Date(Date.now() - 3600000 * 2),
    trainingCentre: tc2,
    district: { name: 'Nashik' },
    uploadedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE' },
    candidates: [
      { id: 'c-401', candidateExtId: 'CAND-041', fullName: 'Pooja Jadhav', phone: '9988776611', email: 'pooja@health.org', courseName: 'Healthcare General Duty Assistant', trainingCentre: 'Nashik Vocational Institute', district: 'Nashik', marks: 95.0, status: 'PENDING', completionDate: new Date('2024-10-25') },
      { id: 'c-402', candidateExtId: 'CAND-042', fullName: 'Rahul Tambe', phone: '9988776622', email: 'rahul@health.org', courseName: 'Healthcare General Duty Assistant', trainingCentre: 'Nashik Vocational Institute', district: 'Nashik', marks: 87.5, status: 'PENDING', completionDate: new Date('2024-10-25') },
      { id: 'c-403', candidateExtId: 'CAND-043', fullName: 'Deepak Salve', phone: '9988776633', email: 'deepak@health.org', courseName: 'Healthcare General Duty Assistant', trainingCentre: 'Nashik Vocational Institute', district: 'Nashik', marks: 89.0, status: 'PENDING', completionDate: new Date('2024-10-25') },
    ],
    submissions: [
      {
        id: 'sub-st-04',
        batchId: 'batch-state-04',
        submittedById: 'user-anika',
        submissionNum: 1,
        districtApprovals: [
          { id: 'da-k1', officerId: 'user-kabir', officer: { name: 'Kabir Patel' }, decision: 'APPROVED', decidedAt: new Date() },
          { id: 'da-k2', officerId: 'user-dev', officer: { name: 'Dev Kulkarni' }, decision: 'APPROVED', decidedAt: new Date() },
        ],
        qualityReview: null,
        stateApproval: null,
      }
    ],
    certificates: [],
    escalations: [],
  };

  // 5. Already APPROVED Batch with Real Pre-Generated Certificates!
  const batch5 = {
    id: 'batch-app-05',
    trainingCentreId: 'tc-pune-001',
    districtId: 'dist-pune',
    uploadedById: 'user-anika',
    courseName: 'Automotive Maintenance & Diagnostics',
    batchName: 'Automotive Diagnostics – Batch 2024-05',
    status: 'APPROVED',
    totalCandidates: 3,
    submissionCount: 1,
    notes: 'Fully approved and certificates issued',
    isLargeBatch: false,
    createdAt: new Date(Date.now() - 3600000 * 72),
    updatedAt: new Date(Date.now() - 3600000 * 24),
    trainingCentre: tc1,
    district: { name: 'Pune' },
    uploadedBy: { name: 'Anika Sharma', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE' },
    candidates: [
      { id: 'c-501', candidateExtId: 'CAND-051', fullName: 'Tanmay Kothari', phone: '9811223344', email: 'tanmay@example.com', courseName: 'Automotive Maintenance & Diagnostics', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 93.0, status: 'CERTIFIED', completionDate: new Date('2024-10-10') },
      { id: 'c-502', candidateExtId: 'CAND-052', fullName: 'Snehal Bhise', phone: '9811223355', email: 'snehal@example.com', courseName: 'Automotive Maintenance & Diagnostics', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 89.5, status: 'CERTIFIED', completionDate: new Date('2024-10-10') },
      { id: 'c-503', candidateExtId: 'CAND-053', fullName: 'Rohit Thorat', phone: '9811223366', email: 'rohit@example.com', courseName: 'Automotive Maintenance & Diagnostics', trainingCentre: 'Pune Skill Development Centre', district: 'Pune', marks: 86.0, status: 'CERTIFIED', completionDate: new Date('2024-10-10') },
    ],
    submissions: [],
    certificates: [],
    escalations: [],
  };

  batches = [batch1, batch2, batch3, batch4, batch5];

  // Pre-generate PDF & QR codes for batch 5
  console.log('Generating initial demo certificate PDFs...');
  for (const cand of batch5.candidates) {
    const certNum = generateCertificateNumber();
    const verifyUrl = `http://localhost:5173/verify/${certNum}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const pdfBuffer = await generateCertificatePDF({
      candidateName: cand.fullName,
      courseName: cand.courseName,
      trainingCentre: cand.trainingCentre,
      district: cand.district,
      completionDate: cand.completionDate,
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
      course: cand.courseName,
      candidate: { ...cand },
      batchId: batch5.id,
      batch: { batchName: batch5.batchName, courseName: batch5.courseName },
      trainingCentre: { name: cand.trainingCentre },
      status: 'ACTIVE',
      pdfPath: fileName,
      qrCodeData: verifyUrl,
      generatedAt: new Date(Date.now() - 3600000 * 24),
      issuedDate: new Date(Date.now() - 3600000 * 24).toISOString(),
    };

    (cand as any).certificate = { certificateNumber: certNum, status: 'ACTIVE' };
    certificates.push(cert);
    batch5.certificates.push(cert);
  }
  console.log(`✓ ${certificates.length} demo certificates generated and available for download!`);
}

seedInitialData().catch(console.error);

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

// Sign In
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = demoUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'No account found with this email. Please click "Create Account" below.' });
  }
  // Allow Demo@1234 or the user's password
  if (password !== 'Demo@1234' && user.password && user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password. (For demo accounts, use Demo@1234)' });
  }
  const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, trainingCentreId: user.trainingCentreId, districtId: user.districtId }, JWT_SECRET, { expiresIn: '8h' });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ accessToken, token: accessToken, refreshToken, user });
});

// Sign Up / Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, districtId, trainingCentreName, trainingCentreCode } = req.body;
  if (!name?.trim() || !email?.trim() || !password || !role) {
    return res.status(400).json({ error: 'Full name, email, password, and role are required' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = demoUsers.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  let tc = undefined;
  if (role === 'TRAINING_CENTRE') {
    tc = {
      id: `tc-${Date.now()}`,
      name: trainingCentreName?.trim() || `${name}'s Vocational Centre`,
      code: trainingCentreCode?.trim() || `TC-${Date.now().toString().slice(-4)}`,
    };
  }

  const dist = districts.find(d => d.id === districtId) || (districtId ? { id: districtId, name: 'Pune' } : districts[0]);

  const newUser: any = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
    trainingCentreId: tc?.id,
    trainingCentre: tc,
    districtId: dist?.id,
    district: dist ? { id: dist.id, name: dist.name } : undefined,
  };

  demoUsers.push(newUser);
  addAudit('USER_REGISTERED', newUser.id, newUser.role, undefined, `Registered new account as ${newUser.role}`);

  const accessToken = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, trainingCentreId: newUser.trainingCentreId, districtId: newUser.districtId }, JWT_SECRET, { expiresIn: '8h' });
  const refreshToken = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ accessToken, token: accessToken, refreshToken, user: newUser });
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
  if (submission.districtApprovals?.some((a: any) => a.officerId === req.user.id)) {
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

  if (!submission.districtApprovals) submission.districtApprovals = [];
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
        course: cand.courseName || batch.courseName,
        candidate: { ...cand },
        batchId: id,
        batch: { batchName: batch.batchName, courseName: batch.courseName },
        trainingCentre: { name: cand.trainingCentre || batch.trainingCentre?.name || 'Skill Centre' },
        status: 'ACTIVE',
        pdfPath: fileName,
        qrCodeData: verifyUrl,
        generatedAt: new Date(),
        issuedDate: new Date().toISOString(),
      };

      cand.status = 'CERTIFIED';
      (cand as any).certificate = { certificateNumber: certNum, status: 'ACTIVE' };
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

// ── Batches Pending Approval ─────────────────────────────────────────────────
app.get('/api/batches/pending-approval', authenticate, (req: any, res) => {
  const user = req.user;
  let pending: any[] = [];

  if (user.role === 'DISTRICT_OFFICER') {
    // Batches in DISTRICT_REVIEW where this officer hasn't approved yet
    pending = batches.filter(b => {
      if (b.status !== 'DISTRICT_REVIEW') return false;
      const latestSub = b.submissions?.[0];
      const hasApproved = latestSub?.districtApprovals?.some((a: any) => a.officerId === user.id);
      return !hasApproved;
    });
  } else if (user.role === 'QUALITY_TEAM') {
    // Batches in QUALITY_REVIEW
    pending = batches.filter(b => b.status === 'QUALITY_REVIEW');
  } else if (user.role === 'STATE_OFFICE') {
    // Batches in STATE_REVIEW
    pending = batches.filter(b => b.status === 'STATE_REVIEW');
  } else if (user.role === 'TRAINING_CENTRE') {
    // Batches that are RETURNED or DRAFT
    pending = batches.filter(b => (b.uploadedById === user.id || b.trainingCentreId === user.trainingCentreId) && ['RETURNED', 'DRAFT'].includes(b.status));
  }

  res.json({ data: pending, pagination: { total: pending.length, page: 1, limit: 20, totalPages: 1 } });
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
    course: cert.candidate?.courseName || cert.course || 'Skills Training',
    trainingCentre: cert.trainingCentre?.name || cert.candidate?.trainingCentre || 'Pune Skill Development Centre',
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
