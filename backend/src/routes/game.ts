import express, { Request, Response } from 'express';
import pool, { normalizeProjectCode, normalizeUserName } from '../db/index.js';
import type { Application } from 'express';

const router = express.Router();

// Initialize or get player state
router.post('/projects/:code/player/init', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName } = req.body;
    
    if (!userName) {
      res.status(400).json({ error: 'userName is required' });
      return;
    }
    
    const userNameNorm = normalizeUserName(userName);
    
    // Get project's attempt limit
    const projectResult = await pool.query(
      `SELECT attempt_limit_per_category FROM projects WHERE code = $1`,
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    const limit = projectResult.rows[0].attempt_limit_per_category;
    
    // Insert or get existing player state
    const result = await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_code, user_name_norm)
       DO UPDATE SET updated_at = NOW(), user_name = EXCLUDED.user_name
       RETURNING review_tokens, attack_tokens, shield_tokens, last_review_at`,
      [code, userName, userNameNorm, limit]
    );
    
    const playerState = result.rows[0];
    
    // Calculate cooldown remaining
    let cooldownRemaining = 0;
    if (playerState.last_review_at) {
      const lastReviewTime = new Date(playerState.last_review_at).getTime();
      const now = Date.now();
      const elapsed = now - lastReviewTime;
      const cooldownMs = 2 * 60 * 1000; // 2 minutes
      
      if (elapsed < cooldownMs) {
        cooldownRemaining = cooldownMs - elapsed;
      }
    }
    
    res.json({
      reviewTokens: playerState.review_tokens,
      attackTokens: playerState.attack_tokens,
      shieldTokens: playerState.shield_tokens,
      cooldownRemaining
    });
  } catch (error) {
    console.error('Init player error:', error);
    res.status(500).json({ error: 'Failed to initialize player' });
  }
});

// Update session heartbeat
router.post('/projects/:code/heartbeat', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName, sessionId } = req.body;
    
    if (!userName || !sessionId) {
      res.status(400).json({ error: 'userName and sessionId are required' });
      return;
    }
    
    const userNameNorm = normalizeUserName(userName);
    
    // Upsert active session
    await pool.query(
      `INSERT INTO active_sessions (project_code, user_name, user_name_norm, session_id, last_seen)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (project_code, user_name_norm)
       DO UPDATE SET session_id = $4, last_seen = NOW()`,
      [code, userName, userNameNorm, sessionId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

// Get list of active players
router.get('/projects/:code/active-players', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const currentUserName = req.query.userName as string;
    
    if (!currentUserName) {
      res.status(400).json({ error: 'userName is required' });
      return;
    }
    
    const currentUserNameNorm = normalizeUserName(currentUserName);
    
    // Get active sessions (updated within last 2 minutes) with their player state
    const result = await pool.query(
      `SELECT 
         s.user_name,
         s.user_name_norm,
         p.review_tokens,
         p.shield_tokens,
         CASE 
           WHEN EXISTS (
             SELECT 1 FROM attacks 
             WHERE project_code = $1 
             AND attacker_name_norm = $2 
             AND target_name_norm = s.user_name_norm
           ) THEN true
           ELSE false
         END as already_attacked
       FROM active_sessions s
       JOIN player_state p ON s.project_code = p.project_code AND s.user_name_norm = p.user_name_norm
       WHERE s.project_code = $1
       AND s.last_seen > NOW() - INTERVAL '2 minutes'
       AND s.user_name_norm != $2
       ORDER BY p.review_tokens DESC, s.user_name`,
      [code, currentUserNameNorm]
    );
    
    const players = result.rows.map(row => ({
      userName: row.user_name,
      reviewTokens: row.review_tokens,
      shieldTokens: row.shield_tokens,
      canAttack: row.review_tokens > 0 && !row.already_attacked
    }));
    
    res.json(players);
  } catch (error) {
    console.error('Get active players error:', error);
    res.status(500).json({ error: 'Failed to get active players' });
  }
});

// Initiate an attack
router.post('/projects/:code/attack', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { attackerName, targetName } = req.body;
    
    if (!attackerName || !targetName) {
      res.status(400).json({ error: 'attackerName and targetName are required' });
      return;
    }
    
    const attackerNameNorm = normalizeUserName(attackerName);
    const targetNameNorm = normalizeUserName(targetName);
    
    const app = req.app as Application;
    const ws = app.locals.ws;
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check attacker has attack token
      const attackerResult = await client.query(
        'SELECT attack_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        [code, attackerNameNorm]
      );
      
      if (attackerResult.rows.length === 0 || attackerResult.rows[0].attack_tokens < 1) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'No attack tokens available' });
        return;
      }
      
      // Check target has tokens to steal
      const targetResult = await client.query(
        'SELECT review_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        [code, targetNameNorm]
      );
      
      if (targetResult.rows.length === 0 || targetResult.rows[0].review_tokens < 1) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Target has no tokens to steal' });
        return;
      }
      
      // Check if already attacked this target
      const existingAttack = await client.query(
        'SELECT id FROM attacks WHERE project_code = $1 AND attacker_name_norm = $2 AND target_name_norm = $3',
        [code, attackerNameNorm, targetNameNorm]
      );
      
      if (existingAttack.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'You have already attacked this player' });
        return;
      }
      
      // Deduct attack token from attacker
      await client.query(
        'UPDATE player_state SET attack_tokens = attack_tokens - 1 WHERE project_code = $1 AND user_name_norm = $2',
        [code, attackerNameNorm]
      );
      
      // Create attack record
      const attackResult = await client.query(
        `INSERT INTO attacks (project_code, attacker_name, attacker_name_norm, target_name, target_name_norm, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW() + INTERVAL '15 seconds')
         RETURNING id`,
        [code, attackerName, attackerNameNorm, targetName, targetNameNorm]
      );
      
      const attackId = attackResult.rows[0].id;
      
      await client.query('COMMIT');
      
      // Get updated tokens for attacker
      const attackerTokensResult = await pool.query(
        'SELECT review_tokens, attack_tokens, shield_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        [code, attackerNameNorm]
      );
      
      // Send WebSocket notification to target
      const notificationSent = ws.sendAttackNotification(code, targetName, attackId);
      
      if (!notificationSent) {
        // Target not connected, auto-succeed after 15 seconds
        console.log('[ATTACK] Target not connected, will auto-resolve');
      }
      
      // Start timer to auto-resolve attack after 15 seconds
      setTimeout(async () => {
        await autoResolveAttack(attackId, code, attackerName, targetName, ws);
      }, 15000);
      
      res.json({ 
        success: true, 
        attackId,
        message: 'Attack initiated, waiting for target response...',
        tokens: attackerTokensResult.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Attack error:', error);
    res.status(500).json({ error: 'Failed to initiate attack' });
  }
});

// Respond to an attack (defend)
router.post('/projects/:code/defend', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { attackId, useShield } = req.body;
    
    if (!attackId || useShield === undefined) {
      res.status(400).json({ error: 'attackId and useShield are required' });
      return;
    }
    
    const app = req.app as Application;
    const ws = app.locals.ws;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get attack details
      const attackResult = await client.query(
        `SELECT attacker_name, attacker_name_norm, target_name, target_name_norm, status
         FROM attacks
         WHERE id = $1 AND project_code = $2`,
        [attackId, code]
      );
      
      if (attackResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Attack not found' });
        return;
      }
      
      const attack = attackResult.rows[0];
      
      if (attack.status !== 'pending') {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Attack already resolved' });
        return;
      }
      
      if (useShield) {
        // Check if target has shield
        const shieldResult = await client.query(
          'SELECT shield_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
          [code, attack.target_name_norm]
        );
        
        if (shieldResult.rows.length === 0 || shieldResult.rows[0].shield_tokens < 1) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'No shield available' });
          return;
        }
        
        // Use shield - deduct it
        await client.query(
          'UPDATE player_state SET shield_tokens = shield_tokens - 1 WHERE project_code = $1 AND user_name_norm = $2',
          [code, attack.target_name_norm]
        );
        
        // Update attack status
        await client.query(
          'UPDATE attacks SET status = $1, shield_used = true, responded_at = NOW() WHERE id = $2',
          ['defended', attackId]
        );
        
        await client.query('COMMIT');
        
        // Notify attacker
        ws.sendAttackResult(code, attack.attacker_name, {
          success: false,
          defended: true,
          message: 'Target used their shield! Attack blocked.'
        });
        
        // Get updated tokens
        const tokensResult = await pool.query(
          'SELECT review_tokens, attack_tokens, shield_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
          [code, attack.target_name_norm]
        );
        
        res.json({ 
          success: true, 
          defended: true,
          tokens: tokensResult.rows[0]
        });
        
      } else {
        // Accept attack - lose 1 review token, attacker gains 1
        await client.query(
          'UPDATE player_state SET review_tokens = review_tokens - 1 WHERE project_code = $1 AND user_name_norm = $2',
          [code, attack.target_name_norm]
        );
        
        await client.query(
          'UPDATE player_state SET review_tokens = LEAST(review_tokens + 1, 3) WHERE project_code = $1 AND user_name_norm = $2',
          [code, attack.attacker_name_norm]
        );
        
        // Update attack status
        await client.query(
          'UPDATE attacks SET status = $1, responded_at = NOW() WHERE id = $2',
          ['succeeded', attackId]
        );
        
        await client.query('COMMIT');
        
        // Notify attacker
        ws.sendAttackResult(code, attack.attacker_name, {
          success: true,
          defended: false,
          message: 'Attack succeeded! You gained 1 review token.'
        });
        
        // Get updated tokens for both
        const targetTokensResult = await pool.query(
          'SELECT review_tokens, attack_tokens, shield_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
          [code, attack.target_name_norm]
        );
        
        const attackerTokensResult = await pool.query(
          'SELECT review_tokens, attack_tokens, shield_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
          [code, attack.attacker_name_norm]
        );
        
        // Broadcast token updates
        ws.broadcastTokenUpdate(code, attack.target_name, targetTokensResult.rows[0]);
        ws.broadcastTokenUpdate(code, attack.attacker_name, attackerTokensResult.rows[0]);
        
        res.json({ 
          success: true, 
          defended: false,
          tokens: targetTokensResult.rows[0]
        });
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Defend error:', error);
    res.status(500).json({ error: 'Failed to respond to attack' });
  }
});

// Auto-resolve attack if no response
async function autoResolveAttack(attackId: string, projectCode: string, attackerName: string, targetName: string, ws: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if attack is still pending
    const attackResult = await client.query(
      'SELECT status, target_name_norm, attacker_name_norm FROM attacks WHERE id = $1',
      [attackId]
    );
    
    if (attackResult.rows.length === 0 || attackResult.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return; // Already resolved
    }
    
    const attack = attackResult.rows[0];
    
    // Attack succeeds - target loses 1 token, attacker gains 1
    await client.query(
      'UPDATE player_state SET review_tokens = review_tokens - 1 WHERE project_code = $1 AND user_name_norm = $2',
      [projectCode, attack.target_name_norm]
    );
    
    await client.query(
      'UPDATE player_state SET review_tokens = LEAST(review_tokens + 1, 3) WHERE project_code = $1 AND user_name_norm = $2',
      [projectCode, attack.attacker_name_norm]
    );
    
    // Update attack status
    await client.query(
      'UPDATE attacks SET status = $1, responded_at = NOW() WHERE id = $2',
      ['expired', attackId]
    );
    
    await client.query('COMMIT');
    
    console.log('[ATTACK] Auto-resolved (no response):', attackId);
    
    // Notify attacker
    ws.sendAttackResult(projectCode, attackerName, {
      success: true,
      defended: false,
      message: 'Attack succeeded! Target did not respond in time.'
    });
    
    // Get updated tokens
    const targetTokensResult = await pool.query(
      'SELECT review_tokens, attack_tokens, shield_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
      [projectCode, attack.target_name_norm]
    );
    
    const attackerTokensResult = await pool.query(
      'SELECT review_tokens, attack_tokens, shield_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
      [projectCode, attack.attacker_name_norm]
    );
    
    // Broadcast token updates
    ws.broadcastTokenUpdate(projectCode, targetName, targetTokensResult.rows[0]);
    ws.broadcastTokenUpdate(projectCode, attackerName, attackerTokensResult.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ATTACK] Auto-resolve error:', error);
  } finally {
    client.release();
  }
}

export default router;
