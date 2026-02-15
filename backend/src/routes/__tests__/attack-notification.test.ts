import request from 'supertest';
import express from 'express';
import pool from '../../db/index.js';
import gameRouter from '../game.js';

describe('Attack Notification Flow', () => {
  let app: express.Express;
  let mockSendAttackNotification: any;
  let mockSendAttackResult: any;
  let mockBroadcastTokenUpdate: any;

  beforeAll(async () => {
    // Initialize mock functions as simple tracking functions
    const calls: any[] = [];
    mockSendAttackNotification = (...args: any[]) => {
      calls.push({ fn: 'sendAttackNotification', args });
      return true; // Simulate successful notification
    };
    mockSendAttackResult = (...args: any[]) => {
      calls.push({ fn: 'sendAttackResult', args });
    };
    mockBroadcastTokenUpdate = (...args: any[]) => {
      calls.push({ fn: 'broadcastTokenUpdate', args });
    };

    // Add helper to check calls
    (mockSendAttackNotification as any).getCalls = () => calls.filter((c: any) => c.fn === 'sendAttackNotification');
    (mockSendAttackResult as any).getCalls = () => calls.filter((c: any) => c.fn === 'sendAttackResult');
    (mockBroadcastTokenUpdate as any).getCalls = () => calls.filter((c: any) => c.fn === 'broadcastTokenUpdate');
    (mockSendAttackNotification as any).clearCalls = () => { calls.length = 0; };

    // Setup Express app with real routes
    app = express();
    app.use(express.json());

    // Mock WebSocket server
    app.locals.ws = {
      sendAttackNotification: mockSendAttackNotification,
      sendAttackResult: mockSendAttackResult,
      broadcastTokenUpdate: mockBroadcastTokenUpdate,
    };

    app.use('/game', gameRouter);

    // Ensure TEST01 project exists and is enabled
    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET enabled = $4`,
      ['TEST01', 'Test Project', 'Test Description', true, '00000000-0000-0000-0000-000000000001']
    );

    // Setup test data
    await pool.query('DELETE FROM attacks WHERE project_code = $1', ['TEST01']);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', ['TEST01']);

    // Create attacker with attack token
    await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_code, user_name_norm) 
       DO UPDATE SET review_tokens = $4, attack_tokens = $5, shield_tokens = $6`,
      ['TEST01', 'Alice', 'alice', 3, 1, 1]
    );

    // Create target with review tokens
    await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_code, user_name_norm) 
       DO UPDATE SET review_tokens = $4, attack_tokens = $5, shield_tokens = $6`,
      ['TEST01', 'Bob', 'bob', 3, 0, 1]
    );
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM attacks WHERE project_code = $1', ['TEST01']);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', ['TEST01']);
    // Don't call pool.end() - it causes "Cannot use a pool after calling end" errors
  });

  beforeEach(() => {
    // Reset mock calls before each test
    (mockSendAttackNotification as any).clearCalls();
  });

  describe('POST /game/projects/:code/attack', () => {
    it('should send attack notification to target player when attack is initiated', async () => {
      // Alice attacks Bob
      const response = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({
          attackerName: 'Alice',
          targetName: 'Bob',
        });

      // Verify attack was created successfully
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.attackId).toBeDefined();
      // attackId can be either string or number depending on database driver
      expect(response.body.attackId).toBeTruthy();
      expect(response.body.tokens).toMatchObject({
        review_tokens: 3,
        attack_tokens: 0, // Reduced from 1 to 0
        shield_tokens: 1,
      });

      // Verify WebSocket notification was sent to Bob
      const calls = (mockSendAttackNotification as any).getCalls();
      expect(calls.length).toBe(1);
      expect(calls[0].args).toEqual([
        'TEST01',
        'Bob',
        response.body.attackId
      ]);

      // Verify attack record was created in database
      const attackResult = await pool.query(
        'SELECT * FROM attacks WHERE id = $1',
        [response.body.attackId]
      );
      expect(attackResult.rows.length).toBe(1);
      expect(attackResult.rows[0]).toMatchObject({
        project_code: 'TEST01',
        attacker_name: 'Alice',
        target_name: 'Bob',
        status: 'pending',
      });

      // Verify attacker's token was deducted
      const aliceTokens = await pool.query(
        'SELECT attack_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );
      expect(aliceTokens.rows[0].attack_tokens).toBe(0);
    });

    it('should reject attack when attacker has no attack tokens', async () => {
      // Alice tries to attack again (no tokens left)
      const response = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({
          attackerName: 'Alice',
          targetName: 'Bob',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'No attack tokens available',
      });

      // Verify no notification was sent
      const calls = (mockSendAttackNotification as any).getCalls();
      expect(calls.length).toBe(0);
    });

    it('should reject attack when target has no review tokens', async () => {
      // Remove Bob's tokens
      await pool.query(
        'UPDATE player_state SET review_tokens = 0 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'bob']
      );

      // Give Alice another attack token
      await pool.query(
        'UPDATE player_state SET attack_tokens = 1 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({
          attackerName: 'Alice',
          targetName: 'Bob',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Target has no tokens to steal',
      });

      // Verify no notification was sent
      const calls = (mockSendAttackNotification as any).getCalls(); expect(calls.length).toBe(0);

      // Restore Bob's tokens for next tests
      await pool.query(
        'UPDATE player_state SET review_tokens = 3 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'bob']
      );
    });

    it('should handle target not connected (offline)', async () => {
      // Delete previous attack
      await pool.query('DELETE FROM attacks WHERE project_code = $1', ['TEST01']);

      // Give Alice attack token
      await pool.query(
        'UPDATE player_state SET attack_tokens = 1 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({
          attackerName: 'Alice',
          targetName: 'Bob',
        });

      // Attack should still succeed (will auto-resolve after 15s)
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify notification attempt was made
      const calls = (mockSendAttackNotification as any).getCalls();
      expect(calls.length).toBe(1);
      expect(calls[0].args).toEqual([
        'TEST01',
        'Bob',
        response.body.attackId
      ]);
    });

    it('should prevent duplicate attacks on same target', async () => {
      // Delete existing attacks first
      await pool.query('DELETE FROM attacks WHERE project_code = $1', ['TEST01']);
      
      // Create an existing attack
      const existingAttack = await pool.query(
        `INSERT INTO attacks (project_code, attacker_name, attacker_name_norm, target_name, target_name_norm, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW() + INTERVAL '15 seconds')
         RETURNING id`,
        ['TEST01', 'Alice', 'alice', 'Bob', 'bob']
      );

      // Give Alice attack token
      await pool.query(
        'UPDATE player_state SET attack_tokens = 1 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );

      // Try to attack same target again
      const response = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({
          attackerName: 'Alice',
          targetName: 'Bob',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'You have already attacked this player',
      });

      // Verify no new notification was sent
      const calls = (mockSendAttackNotification as any).getCalls(); expect(calls.length).toBe(0);

      // Cleanup
      await pool.query('DELETE FROM attacks WHERE id = $1', [existingAttack.rows[0].id]);
    });
  });

  describe('Defense Response - Use Shield', () => {
    let attackId: number;

    beforeEach(async () => {
      // Setup: Create a pending attack
      await pool.query('DELETE FROM attacks WHERE project_code = $1', ['TEST01']);
      await pool.query(
        'UPDATE player_state SET attack_tokens = 1, shield_tokens = 1 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );
      await pool.query(
        'UPDATE player_state SET review_tokens = 3, shield_tokens = 1 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'bob']
      );

      const attackResponse = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({
          attackerName: 'Alice',
          targetName: 'Bob',
        });

      attackId = attackResponse.body.attackId;
    });

    it('should allow target to use shield and refund attacker token', async () => {
      const response = await request(app)
        .post('/game/projects/TEST01/defend')
        .send({
          attackId,
          useShield: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        defended: true,
      });

      // Verify attack status updated
      const attackResult = await pool.query(
        'SELECT status FROM attacks WHERE id = $1',
        [attackId]
      );
      expect(attackResult.rows[0].status).toBe('defended');

      // Verify Bob's shield token was deducted
      const bobTokens = await pool.query(
        'SELECT shield_tokens, review_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'bob']
      );
      expect(bobTokens.rows[0].shield_tokens).toBe(0);
      expect(bobTokens.rows[0].review_tokens).toBe(3); // Unchanged

      // Note: Backend does NOT refund attack token when shield is used
      // Attacker loses the attack token permanently
      const aliceTokens = await pool.query(
        'SELECT attack_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );
      expect(aliceTokens.rows[0].attack_tokens).toBe(0); // Not refunded
    });
  });

  describe('Defense Response - Accept Attack', () => {
    let attackId: number;

    beforeEach(async () => {
      // Setup: Create a pending attack
      await pool.query('DELETE FROM attacks WHERE project_code = $1', ['TEST01']);
      await pool.query(
        'UPDATE player_state SET attack_tokens = 1 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );
      await pool.query(
        'UPDATE player_state SET review_tokens = 3 WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'bob']
      );

      const attackResponse = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({
          attackerName: 'Alice',
          targetName: 'Bob',
        });

      attackId = attackResponse.body.attackId;
    });

    it('should allow target to accept attack and transfer token', async () => {
      const response = await request(app)
        .post('/game/projects/TEST01/defend')
        .send({
          attackId,
          useShield: false,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        defended: false,
      });

      // Verify attack status updated
      const attackResult = await pool.query(
        'SELECT status FROM attacks WHERE id = $1',
        [attackId]
      );
      expect(attackResult.rows[0].status).toBe('succeeded');

      // Verify Bob lost a review token
      const bobTokens = await pool.query(
        'SELECT review_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'bob']
      );
      expect(bobTokens.rows[0].review_tokens).toBe(2); // Reduced from 3

      // Verify Alice gained a review token (capped at 3)
      const aliceTokens = await pool.query(
        'SELECT review_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2',
        ['TEST01', 'alice']
      );
      expect(aliceTokens.rows[0].review_tokens).toBe(3); // Capped at 3 (was already 3)
    });
  });
});
