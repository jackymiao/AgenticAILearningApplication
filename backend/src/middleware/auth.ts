import type { Request, Response, NextFunction } from 'express';

// Middleware to require admin authentication
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  console.log('[AUTH CHECK] Session:', {
    adminId: req.session.adminId,
    adminUsername: req.session.adminUsername,
    isSuperAdmin: req.session.isSuperAdmin
  });
  
  if (!req.session.adminId) {
    console.error('[AUTH CHECK] FAILED - No admin ID in session');
    res.status(401).json({ error: 'Admin authentication required' });
    return;
  }
  
  console.log('[AUTH CHECK] PASSED - Admin ID:', req.session.adminId);
  next();
}
