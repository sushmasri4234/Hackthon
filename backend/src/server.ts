import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth';
import batchRoutes from './routes/batches';
import certificateRoutes from './routes/certificates';
import dashboardRoutes from './routes/dashboard';
import districtRoutes from './routes/districts';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import { prisma } from './db/prisma';

const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Auth middleware for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    // Allow unauthenticated connections for public pages (e.g., verification)
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  if (user) {
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.id}`);
    if (user.trainingCentreId) socket.join(`tc:${user.trainingCentreId}`);
    logger.debug(`Socket connected: ${user.name} (${user.role})`);
  }

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// Export emit helper for use in services
export function emitEvent(room: string, event: string, data: unknown): void {
  io.to(room).emit(event, data);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests, please try again later',
});
app.use(limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/districts', districtRoutes);

// Public verify route (shorthand)
app.get('/api/verify/:certNumber', async (req, res, next) => {
  try {
    // Redirect to certificate verify endpoint
    const { certNumber } = req.params;
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber: certNumber },
      include: {
        candidate: { select: { fullName: true, courseName: true, trainingCentre: true, district: true, completionDate: true } },
      },
    });

    if (!certificate) {
      res.json({ status: 'INVALID', message: 'Certificate not found.' });
      return;
    }
    if (certificate.status === 'CANCELLED') {
      res.json({ status: 'CANCELLED', message: 'This certificate has been cancelled.', certificateNumber: certNumber });
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

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, () => {
  logger.info(`CertiFlow API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
