import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    const issues = (err as any).issues || (err as any).errors || [];
    res.status(400).json({
      error: 'Validation error',
      details: issues.map((e: any) => ({
        field: e.path ? e.path.join('.') : '',
        message: e.message,
      })),
    });
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
}
