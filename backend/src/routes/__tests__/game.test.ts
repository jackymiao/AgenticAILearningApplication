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
});
