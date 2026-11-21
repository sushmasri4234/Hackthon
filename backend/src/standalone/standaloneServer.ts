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

// ── Nationwide States & Districts Database ──────────────────────────────────
const states = [
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi NCR' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TS', name: 'Telangana' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'PB', name: 'Punjab' },
  { code: 'HR', name: 'Haryana' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'BR', name: 'Bihar' },
  { code: 'OD', name: 'Odisha' },
];

const districts = [
  // Maharashtra
  { id: 'dist-pune', name: 'Pune', stateCode: 'MH', stateName: 'Maharashtra', trainingCentres: [{ id: 'tc-pune-001', name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' }] },
  { id: 'dist-nashik', name: 'Nashik', stateCode: 'MH', stateName: 'Maharashtra', trainingCentres: [{ id: 'tc-nsk-001', name: 'Nashik Vocational Institute', code: 'TC-NSK-001' }] },
  { id: 'dist-mumbai', name: 'Mumbai City', stateCode: 'MH', stateName: 'Maharashtra', trainingCentres: [{ id: 'tc-mum-001', name: 'Mumbai Metro Skilling Hub', code: 'TC-MUM-001' }] },
  { id: 'dist-nagpur', name: 'Nagpur', stateCode: 'MH', stateName: 'Maharashtra', trainingCentres: [{ id: 'tc-nag-001', name: 'Vidarbha Technical Institute', code: 'TC-NAG-001' }] },
  { id: 'dist-aurangabad', name: 'Chhatrapati Sambhajinagar', stateCode: 'MH', stateName: 'Maharashtra', trainingCentres: [{ id: 'tc-aur-001', name: 'Marathwada Skill Hub', code: 'TC-AUR-001' }] },
  { id: 'dist-thane', name: 'Thane', stateCode: 'MH', stateName: 'Maharashtra', trainingCentres: [{ id: 'tc-thn-001', name: 'Thane Industrial Training Centre', code: 'TC-THN-001' }] },

  // Karnataka
  { id: 'dist-bengaluru', name: 'Bengaluru Urban', stateCode: 'KA', stateName: 'Karnataka', trainingCentres: [{ id: 'tc-blr-001', name: 'Bengaluru Tech Skill Centre', code: 'TC-BLR-001' }] },
  { id: 'dist-mysuru', name: 'Mysuru', stateCode: 'KA', stateName: 'Karnataka', trainingCentres: [{ id: 'tc-mys-001', name: 'Mysuru Heritage Skill Academy', code: 'TC-MYS-001' }] },
  { id: 'dist-hubballi', name: 'Hubballi-Dharwad', stateCode: 'KA', stateName: 'Karnataka', trainingCentres: [{ id: 'tc-hub-001', name: 'North Karnataka Vocational Hub', code: 'TC-HUB-001' }] },

  // Delhi NCR
  { id: 'dist-newdelhi', name: 'New Delhi', stateCode: 'DL', stateName: 'Delhi NCR', trainingCentres: [{ id: 'tc-del-001', name: 'Capital Skill Academy', code: 'TC-DEL-001' }] },
  { id: 'dist-southdelhi', name: 'South Delhi', stateCode: 'DL', stateName: 'Delhi NCR', trainingCentres: [{ id: 'tc-sdel-001', name: 'Okhla Technical Training Hub', code: 'TC-SDEL-001' }] },

  // Telangana
  { id: 'dist-hyderabad', name: 'Hyderabad', stateCode: 'TS', stateName: 'Telangana', trainingCentres: [{ id: 'tc-hyd-001', name: 'HITEC Skilling Mission Centre', code: 'TC-HYD-001' }] },
  { id: 'dist-warangal', name: 'Warangal', stateCode: 'TS', stateName: 'Telangana', trainingCentres: [{ id: 'tc-wgl-001', name: 'Kakatiya Vocational Institute', code: 'TC-WGL-001' }] },

  // Tamil Nadu
  { id: 'dist-chennai', name: 'Chennai', stateCode: 'TN', stateName: 'Tamil Nadu', trainingCentres: [{ id: 'tc-chn-001', name: 'Chennai Central Skilling Institute', code: 'TC-CHN-001' }] },
  { id: 'dist-coimbatore', name: 'Coimbatore', stateCode: 'TN', stateName: 'Tamil Nadu', trainingCentres: [{ id: 'tc-cbe-001', name: 'Kovai Engineering Skill Hub', code: 'TC-CBE-001' }] },

  // Uttar Pradesh
  { id: 'dist-noida', name: 'Gautam Buddha Nagar (Noida)', stateCode: 'UP', stateName: 'Uttar Pradesh', trainingCentres: [{ id: 'tc-noi-001', name: 'Noida IT & Electronics Skill Hub', code: 'TC-NOI-001' }] },
  { id: 'dist-lucknow', name: 'Lucknow', stateCode: 'UP', stateName: 'Uttar Pradesh', trainingCentres: [{ id: 'tc-lko-001', name: 'Awadh Skill Development Academy', code: 'TC-LKO-001' }] },
  { id: 'dist-kanpur', name: 'Kanpur', stateCode: 'UP', stateName: 'Uttar Pradesh', trainingCentres: [{ id: 'tc-knp-001', name: 'Kanpur Technical Training Centre', code: 'TC-KNP-001' }] },

  // Gujarat
  { id: 'dist-ahmedabad', name: 'Ahmedabad', stateCode: 'GJ', stateName: 'Gujarat', trainingCentres: [{ id: 'tc-ahd-001', name: 'Sabarmati Vocational Centre', code: 'TC-AHD-001' }] },
  { id: 'dist-surat', name: 'Surat', stateCode: 'GJ', stateName: 'Gujarat', trainingCentres: [{ id: 'tc-sur-001', name: 'Diamond City Skill Hub', code: 'TC-SUR-001' }] },

  // Rajasthan
  { id: 'dist-jaipur', name: 'Jaipur', stateCode: 'RJ', stateName: 'Rajasthan', trainingCentres: [{ id: 'tc-jpr-001', name: 'Pink City Skilling Institute', code: 'TC-JPR-001' }] },
  { id: 'dist-jodhpur', name: 'Jodhpur', stateCode: 'RJ', stateName: 'Rajasthan', trainingCentres: [{ id: 'tc-jdh-001', name: 'Marwar Vocational Academy', code: 'TC-JDH-001' }] },

  // West Bengal
  { id: 'dist-kolkata', name: 'Kolkata', stateCode: 'WB', stateName: 'West Bengal', trainingCentres: [{ id: 'tc-kol-001', name: 'Kolkata Skill & Tech Hub', code: 'TC-KOL-001' }] },

  // Kerala
  { id: 'dist-ernakulam', name: 'Kochi (Ernakulam)', stateCode: 'KL', stateName: 'Kerala', trainingCentres: [{ id: 'tc-koc-001', name: 'Cochin Maritime & Tech Academy', code: 'TC-KOC-001' }] },

  // Madhya Pradesh
  { id: 'dist-indore', name: 'Indore', stateCode: 'MP', stateName: 'Madhya Pradesh', trainingCentres: [{ id: 'tc-ind-001', name: 'Malwa Advanced Skill Centre', code: 'TC-IND-001' }] },

  // Punjab & Haryana
  { id: 'dist-ludhiana', name: 'Ludhiana', stateCode: 'PB', stateName: 'Punjab', trainingCentres: [{ id: 'tc-ldh-001', name: 'Ludhiana Industrial Training Hub', code: 'TC-LDH-001' }] },
  { id: 'dist-gurugram', name: 'Gurugram', stateCode: 'HR', stateName: 'Haryana', trainingCentres: [{ id: 'tc-gur-001', name: 'Cyber City Vocational Institute', code: 'TC-GUR-001' }] },

  // Andhra Pradesh & Bihar & Odisha
  { id: 'dist-vizag', name: 'Visakhapatnam', stateCode: 'AP', stateName: 'Andhra Pradesh', trainingCentres: [{ id: 'tc-vzg-001', name: 'Vizag Coastal Skill Centre', code: 'TC-VZG-001' }] },
  { id: 'dist-patna', name: 'Patna', stateCode: 'BR', stateName: 'Bihar', trainingCentres: [{ id: 'tc-pat-001', name: 'Patliputra Vocational Centre', code: 'TC-PAT-001' }] },
  { id: 'dist-bhubaneswar', name: 'Bhubaneswar', stateCode: 'OD', stateName: 'Odisha', trainingCentres: [{ id: 'tc-bbs-001', name: 'Kalinga Skilling Hub', code: 'TC-BBS-001' }] },
];

const demoUsers: any[] = [
  { id: 'user-anika', name: 'Anika Sharma', email: 'anika@certiflow.demo', password: 'Demo@1234', role: 'TRAINING_CENTRE', trainingCentreId: 'tc-pune-001', districtId: 'dist-pune', trainingCentre: { id: 'tc-pune-001', name: 'Pune Skill Development Centre', code: 'TC-PUNE-001' }, district: { id: 'dist-pune', name: 'Pune', stateName: 'Maharashtra' } },
  { id: 'user-dev', name: 'Dev Kulkarni', email: 'dev@certiflow.demo', password: 'Demo@1234', role: 'DISTRICT_OFFICER', districtId: 'dist-pune', district: { id: 'dist-pune', name: 'Pune', stateName: 'Maharashtra' } },
  { id: 'user-meera', name: 'Meera Joshi', email: 'meera@certiflow.demo', password: 'Demo@1234', role: 'DISTRICT_OFFICER', districtId: 'dist-pune', district: { id: 'dist-pune', name: 'Pune', stateName: 'Maharashtra' } },
  { id: 'user-kabir', name: 'Kabir Patel', email: 'kabir@certiflow.demo', password: 'Demo@1234', role: 'DISTRICT_OFFICER', districtId: 'dist-nashik', district: { id: 'dist-nashik', name: 'Nashik', stateName: 'Maharashtra' } },
  { id: 'user-neha', name: 'Neha Gupta', email: 'neha@certiflow.demo', password: 'Demo@1234', role: 'QUALITY_TEAM' },
  { id: 'user-farah', name: 'Farah Khan', email: 'farah@certiflow.demo', password: 'Demo@1234', role: 'STATE_OFFICE' },
];

let batches: any[] = [];
let certificates: any[] = [];
let auditLogs: any[] = [];
let notifications: any[] = [];

function addAudit(action: string, userId: string, role: string, batchId?: string, reason?: string, metadata?: any) {
  const user = demoUsers.find(u => u.id === userId);
  const batch = batches.find(b => b.id === batchId);
  auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    action,
    userId,
    userRole: role,
    user: user ? { id: user.id, name: user.name, role: user.role } : null,
    batchId: batchId || null,
    batchName: batch?.batchName || metadata?.batchName || null,
    reason: reason || null,
    metadata: metadata || null,
    createdAt: new Date(),
  });
}

// ── Clean Slate: Zero Existing Batches for Live Testing ──────────────────────
async function seedInitialData() {
  batches = [];
  certificates = [];
  addAudit('SYSTEM_INITIALIZED', 'user-farah', 'STATE_OFFICE', undefined, 'Clean slate initialized. 0 existing batches. Ready for fresh candidate batch upload.');
  console.log('✓ Clean slate: 0 existing batches. System ready for live user testing.');
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

// ── States & Districts ───────────────────────────────────────────────────────
app.get('/api/states', (_req, res) => res.json(states));

app.get('/api/districts', (req, res) => {
  const { state } = req.query;
  if (state) {
    return res.json(districts.filter(d => d.stateCode === state || d.stateName.toLowerCase() === (state as string).toLowerCase()));
  }
  res.json(districts);
});

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

// ── Global & Filterable Audit Trail ─────────────────────────────────────────
app.get('/api/audit', authenticate, (req: any, res) => {
  const { batchId, action, limit } = req.query;
  let result = [...auditLogs];
  if (batchId && batchId !== 'all') {
    result = result.filter(a => a.batchId === batchId);
  }
  if (action && action !== 'all') {
    result = result.filter(a => a.action === action);
  }
  const max = limit ? parseInt(limit as string, 10) : 250;
  const sliced = result.slice(0, max);
  res.json({
    data: sliced,
    auditLog: sliced,
    total: result.length,
  });
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
