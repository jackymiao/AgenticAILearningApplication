import { Router } from 'express';
import pool from '../db/index.js';

const router = Router();

// Only enable test routes when E2E_TEST=1
const isTestMode = process.env.E2E_TEST === '1' || process.env.NODE_ENV === 'test';

if (!isTestMode) {
  console.log('[TEST] Test routes are DISABLED (E2E_TEST not set)');
}

// POST /test/set-session - Set session for a user (for Puppeteer login)
router.post('/set-session', async (req, res) => {
  if (!isTestMode) {
    return res.status(403).json({ error: 'Test routes disabled' });
  }

  const { userName, projectCode } = req.body;

  if (!userName || !projectCode) {
    return res.status(400).json({ error: 'userName and projectCode required' });
  }

  try {
    // Set session data
    (req.session as any).userName = userName;
    (req.session as any).projectCode = projectCode;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ 
      success: true, 
      userName,
      projectCode,
      sessionId: req.sessionID 
    });
  } catch (error) {
    console.error('[TEST] Set session error:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});

// POST /test/reset-tokens - Reset token state for a user
router.post('/reset-tokens', async (req, res) => {
  if (!isTestMode) {
    return res.status(403).json({ error: 'Test routes disabled' });
  }

  const { userName, projectCode, reviewTokens, attackTokens, shieldTokens } = req.body;

  if (!userName || !projectCode) {
    return res.status(400).json({ error: 'userName and projectCode required' });
  }

  try {
    const userNameNorm = userName.trim().toLowerCase();
    const normalizedCode = projectCode.trim().toUpperCase();
    
    await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_code, user_name_norm)
       DO UPDATE SET 
         review_tokens = EXCLUDED.review_tokens,
         attack_tokens = EXCLUDED.attack_tokens,
         shield_tokens = EXCLUDED.shield_tokens,
         last_review_at = NULL`,
      [
        normalizedCode,
        userName,
        userNameNorm,
        reviewTokens ?? 3,
        attackTokens ?? 0,
        shieldTokens ?? 1
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[TEST] Reset tokens error:', error);
    res.status(500).json({ error: 'Failed to reset tokens' });
  }
});

// DELETE /test/clear-attacks - Clear all pending attacks for a project
router.delete('/clear-attacks', async (req, res) => {
  if (!isTestMode) {
    return res.status(403).json({ error: 'Test routes disabled' });
  }

  const { projectCode } = req.body;

  if (!projectCode) {
    return res.status(400).json({ error: 'projectCode required' });
  }

  try {
    await pool.query(
      `DELETE FROM attacks WHERE project_code = $1 AND status = 'pending'`,
      [projectCode]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[TEST] Clear attacks error:', error);
    res.status(500).json({ error: 'Failed to clear attacks' });
  }
});

// GET /test/health - Test endpoint health check
router.get('/health', (req, res) => {
  res.json({ 
    testMode: isTestMode,
    env: process.env.NODE_ENV,
    e2eTest: process.env.E2E_TEST
  });
});

export default router;
