import express, { Request, Response } from 'express';
import { createAdmin, verifyAdmin } from '../services/auth.js';

const router = express.Router();

// Admin signup with access code
router.post('/admin/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, accessCode } = req.body;
    
    if (!username || !password || !accessCode) {
      res.status(400).json({ error: 'Username, password, and access code are required' });
      return;
    }
    
    // Check if this is a super admin signup
    const isSuperAdmin = accessCode === process.env.SUPER_ADMIN_CODE;
    
    // Validate access code - must be either regular or super admin code
    if (!isSuperAdmin && accessCode !== process.env.ADMIN_SIGNUP_CODE) {
      res.status(403).json({ error: 'Invalid access code' });
      return;
    }
    
    // Create admin user with appropriate role
    const admin = await createAdmin(username, password, isSuperAdmin);
    
    // Set session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    req.session.isSuperAdmin = admin.is_super_admin || false;
    
    res.json({
      isAdmin: true,
      adminName: admin.username,
      isSuperAdmin: admin.is_super_admin || false
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

// Admin login
router.post('/admin/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    
    const admin = await verifyAdmin(username, password);
    
    if (!admin) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    
    // Set session with role information
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    req.session.isSuperAdmin = admin.is_super_admin || false;
    
    res.json({
      isAdmin: true,
      adminName: admin.username,
      isSuperAdmin: admin.is_super_admin || false
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', (req: Request, res: Response): void => {
  if (req.session.adminId) {
    res.json({
      isAdmin: true,
      adminName: req.session.adminUsername,
      isSuperAdmin: req.session.isSuperAdmin || false
    });
    return;
  }
  
  res.json({ isAdmin: false });
});

// Logout
router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.json({ success: true });
  });
});

export default router;
