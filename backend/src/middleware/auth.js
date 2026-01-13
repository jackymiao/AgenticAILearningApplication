// Middleware to require admin authentication
export function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
}
