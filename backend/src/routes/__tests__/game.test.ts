import request from 'supertest';
import express from 'express';
import gameRouter from '../game.js';
import pool from '../../db/index.js';

describe('Game Routes - Project Enabled Checks', () => {
  let app: express.Express;
  const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/game', gameRouter);
    
    // Clean up test data
    await pool.query('DELETE FROM player_state WHERE project_code = $1', ['TEST01']);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM player_state WHERE project_code = $1', ['TEST01']);
    await pool.end();
  });

  describe('POST /game/projects/:code/player/init', () => {
    it('should initialize player when project is enabled', async () => {
      // Ensure project exists and is enabled
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true,  '00000000-0000-0000-0000-000000000001']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/player/init')
        .send({ userName: 'Test User' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reviewTokens');
      expect(response.body).toHaveProperty('attackTokens');
      expect(response.body).toHaveProperty('shieldTokens');
      expect(response.body).toHaveProperty('cooldownRemaining');
    });

    it('should block player init when project is disabled', async () => {
      // Set project to disabled
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', false,  '00000000-0000-0000-0000-000000000001']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/player/init')
        .send({ userName: 'Test User' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'This project is currently disabled' });
    });

    it('should return 404 when project not found', async () => {
      const response = await request(app)
        .post('/game/projects/NOTFOUND999/player/init')
        .send({ userName: 'Test User' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Project not found' });
    });

    it('should require userName field', async () => {
      // Ensure project exists and is enabled
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      const response = await request(app)
        .post('/game/projects/TEST01/player/init')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'userName is required' });
    });
  });

  describe('POST /game/projects/:code/heartbeat', () => {
    it('should update heartbeat when project is enabled', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true,  '00000000-0000-0000-0000-000000000001']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/heartbeat')
        .send({ userName: 'Test User', sessionId: 'session123' });

      expect(response.status).toBe(200);
    });

    it('should block heartbeat when project is disabled', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', false,  '00000000-0000-0000-0000-000000000001']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/heartbeat')
        .send({ userName: 'Test User', sessionId: 'session123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'This project is currently disabled' });
    });
  });

  describe('GET /game/projects/:code/active-players', () => {
    it('returns active players excluding current user and stale sessions', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      await pool.query('DELETE FROM active_sessions WHERE project_code = $1', ['TEST01']);
      await pool.query('DELETE FROM player_state WHERE project_code = $1', ['TEST01']);

      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, shield_tokens, has_submitted_first_review)
         VALUES
         ($1, 'Alice', 'alice', 3, 1, true),
         ($1, 'Bob', 'bob', 2, 1, true),
         ($1, 'Carol', 'carol', 3, 1, false)`,
        ['TEST01']
      );

      await pool.query(
        `INSERT INTO active_sessions (project_code, user_name, user_name_norm, session_id, last_seen)
         VALUES
         ($1, 'Alice', 'alice', 'sess-alice', NOW()),
         ($1, 'Bob', 'bob', 'sess-bob', NOW()),
         ($1, 'Carol', 'carol', 'sess-carol', NOW() - INTERVAL '3 minutes')`,
        ['TEST01']
      );

      const response = await request(app)
        .get('/game/projects/TEST01/active-players')
        .query({ userName: 'Alice' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toMatchObject({
        userName: 'Bob',
        reviewTokens: 2,
        canAttack: true
      });
    });

    it('requires userName query param', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      const response = await request(app).get('/game/projects/TEST01/active-players');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'userName is required' });
    });

    it('blocks active-players when project is disabled', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', false, TEST_ADMIN_ID]
      );

      const response = await request(app)
        .get('/game/projects/TEST01/active-players')
        .query({ userName: 'Alice' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'This project is currently disabled' });
    });

    it('computes canAttack correctly and orders by reviewTokens then name', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      await pool.query('DELETE FROM active_sessions WHERE project_code = $1', ['TEST01']);
      await pool.query('DELETE FROM player_state WHERE project_code = $1', ['TEST01']);

      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, shield_tokens, has_submitted_first_review)
         VALUES
         ($1, 'Alice', 'alice', 3, 1, true),
         ($1, 'Bob', 'bob', 3, 1, false),
         ($1, 'Eve', 'eve', 1, 1, false),
         ($1, 'Dan', 'dan', 2, 1, true)`,
        ['TEST01']
      );

      await pool.query(
        `INSERT INTO active_sessions (project_code, user_name, user_name_norm, session_id, last_seen)
         VALUES
         ($1, 'Alice', 'alice', 'sess-alice', NOW()),
         ($1, 'Bob', 'bob', 'sess-bob', NOW()),
         ($1, 'Eve', 'eve', 'sess-eve', NOW()),
         ($1, 'Dan', 'dan', 'sess-dan', NOW())`,
        ['TEST01']
      );

      const response = await request(app)
        .get('/game/projects/TEST01/active-players')
        .query({ userName: 'Alice' });

      expect(response.status).toBe(200);
      expect(response.body.map((p: any) => p.userName)).toEqual(['Bob', 'Dan', 'Eve']);

      const bob = response.body.find((p: any) => p.userName === 'Bob');
      const dan = response.body.find((p: any) => p.userName === 'Dan');
      const eve = response.body.find((p: any) => p.userName === 'Eve');

      expect(bob.canAttack).toBe(true); // first review not submitted, tokens=3 (>1)
      expect(dan.canAttack).toBe(true); // first review submitted, tokens=2 (>=1)
      expect(eve.canAttack).toBe(false); // first review not submitted, tokens=1 (not >1)
    });
  });

  describe('POST /game/projects/:code/attack input validation', () => {
    it('requires attackerName and targetName', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      const response = await request(app)
        .post('/game/projects/TEST01/attack')
        .send({ attackerName: 'Alice' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'attackerName and targetName are required' });
    });
  });

  describe('POST /game/projects/:code/defend - error branches', () => {
    it('requires attackId and useShield payload', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      const response = await request(app)
        .post('/game/projects/TEST01/defend')
        .send({ attackId: 'any-id' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'attackId and useShield are required' });
    });

    it('returns 404 when attack is not found', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      const response = await request(app)
        .post('/game/projects/TEST01/defend')
        .send({
          attackId: '00000000-0000-0000-0000-000000000099',
          useShield: true
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Attack not found' });
    });

    it('returns 400 when attack is already resolved', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      await pool.query(
        `INSERT INTO attacks (project_code, attacker_name, attacker_name_norm, target_name, target_name_norm, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '15 seconds')`,
        ['TEST01', 'Alice', 'alice', 'Bob', 'bob', 'succeeded']
      );

      const latestAttack = await pool.query(
        `SELECT id FROM attacks WHERE project_code = $1 ORDER BY created_at DESC LIMIT 1`,
        ['TEST01']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/defend')
        .send({ attackId: latestAttack.rows[0].id, useShield: true });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Attack already resolved' });
    });

    it('returns 400 when target has no shield', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true, TEST_ADMIN_ID]
      );

      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens)
         VALUES ($1, 'Bob', 'bob', 3, 0, 0)
         ON CONFLICT (project_code, user_name_norm)
         DO UPDATE SET shield_tokens = 0`,
        ['TEST01']
      );

      await pool.query(
        `INSERT INTO attacks (project_code, attacker_name, attacker_name_norm, target_name, target_name_norm, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '15 seconds')`,
        ['TEST01', 'Alice', 'alice', 'Bob', 'bob', 'pending']
      );

      const latestAttack = await pool.query(
        `SELECT id FROM attacks WHERE project_code = $1 ORDER BY created_at DESC LIMIT 1`,
        ['TEST01']
      );

      const response = await request(app)
        .post('/game/projects/TEST01/defend')
        .send({ attackId: latestAttack.rows[0].id, useShield: true });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No shield available' });
    });
  });
});
