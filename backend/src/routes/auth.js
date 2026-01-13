import express from 'express';
import { createAdmin, verifyAdmin } from '../services/auth.js';

const router = express.Router();

// Admin signup with access code
router.post('/admin/signup', async (req, res) => {
  try {
    const { username, password, accessCode } = req.body;
    
    if (!username || !password || !accessCode) {
      return res.status(400).json({ error: 'Username, password, and access code are required' });
    }
    
    // Validate access code
    if (accessCode !== process.env.ADMIN_SIGNUP_CODE) {
      return res.status(403).json({ error: 'Invalid access code' });
    }
    
    // Create admin user
    const admin = await createAdmin(username, password);
    
    // Set session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    
    res.json({
      isAdmin: true,
      adminName: admin.username
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const admin = await verifyAdmin(username, password);
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Set session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    
    res.json({
      isAdmin: true,
      adminName: admin.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  if (req.session.adminId) {
    return res.json({
      isAdmin: true,
      adminName: req.session.adminUsername
    });
  }
  
  res.json({ isAdmin: false });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

export default router;
