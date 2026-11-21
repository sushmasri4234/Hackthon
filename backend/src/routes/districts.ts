import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

/**
 * GET /api/districts
 * Returns all districts with their training centres.
 * Public endpoint – used by NewBatchPage district selector.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const districts = await prisma.district.findMany({
      select: {
        id: true,
        name: true,
        stateCode: true,
        trainingCentres: {
          select: {
            id: true,
            name: true,
            code: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(districts);
  } catch (err) {
    next(err);
  }
});

export default router;
