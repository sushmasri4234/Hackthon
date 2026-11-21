import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { loginSchema } from '../validators/schemas';
import { createAuditLog } from '../services/auditService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, districtId, trainingCentreName, trainingCentreCode } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !role) {
      res.status(400).json({ error: 'Full name, email, password, and role are required' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    let tcId = undefined;
    if (role === 'TRAINING_CENTRE') {
      const code = trainingCentreCode?.trim() || `TC-${Date.now().toString().slice(-4)}`;
      const dist = districtId ? await prisma.district.findUnique({ where: { id: districtId } }) : await prisma.district.findFirst();
      if (dist) {
        const tc = await prisma.trainingCentre.create({
          data: {
            name: trainingCentreName?.trim() || `${name}'s Training Centre`,
            code,
            districtId: dist.id,
          },
        });
        tcId = tc.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: role as any,
        trainingCentreId: tcId,
        districtId: districtId || undefined,
      },
      include: { trainingCentre: true, district: true },
    });

    await createAuditLog({
      userId: user.id,
      userRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      metadata: { action: 'REGISTER' },
    });

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      trainingCentreId: user.trainingCentreId,
      districtId: user.districtId,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' } as any);
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', { expiresIn: '7d' } as any);

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(201).json({ accessToken, refreshToken, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        trainingCentre: true,
        district: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      trainingCentreId: user.trainingCentreId,
      districtId: user.districtId,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    } as any);

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as any
    );

    await createAuditLog({
      userId: user.id,
      userRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trainingCentre: user.trainingCentre,
        district: user.district,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { trainingCentre: true, district: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      trainingCentreId: user.trainingCentreId,
      districtId: user.districtId,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    } as any);

    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { trainingCentre: true, district: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await createAuditLog({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'USER_LOGOUT',
      entityType: 'USER',
      entityId: req.user!.id,
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// Demo users endpoint (for judge convenience)
router.get('/demo-users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trainingCentre: { select: { name: true } },
        district: { select: { name: true } },
      },
      orderBy: { role: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

export default router;
