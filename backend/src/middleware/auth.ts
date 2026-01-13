import type { Request, Response, NextFunction } from 'express';

// Middleware to require admin authentication
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.adminId) {
    res.status(401).json({ error: 'Admin authentication required' });
    return;
  }
  next();
}
