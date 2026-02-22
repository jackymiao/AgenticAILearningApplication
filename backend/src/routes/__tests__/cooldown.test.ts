import request from 'supertest';
import express from 'express';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('Review Cooldown Feature', () => {
  let app: express.Express;
  const testProjectCode = 'CDTEST'; // 6 characters max
  const testUserName = 'Test User';
  const testAdminId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Enable E2E_TEST to use mock SDK
    process.env.E2E_TEST = '1';
    
    app = express();
    app.use(express.json());
    app.use('/public', publicRouter);
    
    // Create test admin
    await pool.query(
      `INSERT INTO admin_users (id, username, password_hash, is_super_admin) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [testAdminId, 'testadmin', 'hash', true]
    );
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM review_attempts WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM project_students WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);
    
    // Disable E2E_TEST mode
    delete process.env.E2E_TEST;
    
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM review_attempts WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM project_students WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);
  });

  describe('GET /public/projects/:code/user-state - cooldownRemaining calculation', () => {
    it('should return cooldownRemaining = 0 when user has no previous review', async () => {
      // Create project with 30 second cooldown
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 30, 3, testAdminId]
      );

      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: testUserName });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cooldownRemaining', 0);
    });

    it('should return full cooldown when user just submitted a review (30 seconds)', async () => {
      // Create project with 30 second cooldown
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 30, 3, testAdminId]
      );

      // Set last_review_at to just now
      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: testUserName });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cooldownRemaining');
      // Should be close to 30000ms (allow 500ms variance for execution time)
      expect(response.body.cooldownRemaining).toBeGreaterThan(29500);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(30000);
    });

    it('should return full cooldown when user just submitted a review (60 seconds)', async () => {
      // Create project with 60 second cooldown
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 60, 3, testAdminId]
      );

      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: testUserName });

      expect(response.status).toBe(200);
      expect(response.body.cooldownRemaining).toBeGreaterThan(59500);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(60000);
    });

    it('should return full cooldown when user just submitted a review (90 seconds)', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 90, 3, testAdminId]
      );

      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: testUserName });

      expect(response.status).toBe(200);
      expect(response.body.cooldownRemaining).toBeGreaterThan(89500);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(90000);
    });

    it('should return full cooldown when user just submitted a review (120 seconds)', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 120, 3, testAdminId]
      );

      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: testUserName });

      expect(response.status).toBe(200);
      expect(response.body.cooldownRemaining).toBeGreaterThan(119500);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(120000);
    });

    it('should return partial cooldown when time has elapsed', async () => {
      // Create project with 60 second cooldown
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 60, 3, testAdminId]
      );

      // Set last_review_at to 45 seconds ago
      const fortyFiveSecondsAgo = new Date(Date.now() - 45000);
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, fortyFiveSecondsAgo]
      );

      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: testUserName });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cooldownRemaining');
      // Should be around 15000ms (60s - 45s = 15s), allow 500ms variance
      expect(response.body.cooldownRemaining).toBeGreaterThan(14500);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(15500);
    });

    it('should return 0 cooldown when cooldown period has fully expired', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 30, 3, testAdminId]
      );

      // Set last_review_at to 35 seconds ago (past the 30s cooldown)
      const thirtyFiveSecondsAgo = new Date(Date.now() - 35000);
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, thirtyFiveSecondsAgo]
      );

      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: testUserName });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cooldownRemaining', 0);
    });
  });

  describe('POST /public/projects/:code/reviews - cooldown enforcement', () => {
    it('should allow first submission when user has no previous review', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 30, 3, testAdminId]
      );

      // Initialize player state with tokens
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens)
         VALUES ($1, $2, $3, $4)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'This is my test essay with enough words to meet the minimum requirement for testing purposes.'
        });

      // Since we're mocking the SDK, we expect this to work or at least not fail due to cooldown
      expect(response.status).not.toBe(429);
    });

    it('should block submission with 429 when user tries to submit during 30s cooldown', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 30, 3, testAdminId]
      );

      // Set last_review_at to just now
      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'This is my test essay attempting to submit during cooldown period.'
        });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Please wait \d+ seconds before submitting another review/);
      expect(response.body).toHaveProperty('cooldownRemaining');
      expect(response.body.cooldownRemaining).toBeGreaterThan(29000);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(30000);
    });

    it('should block submission with 429 when user tries to submit during 60s cooldown', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 60, 3, testAdminId]
      );

      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'Test essay for 60 second cooldown enforcement.'
        });

      expect(response.status).toBe(429);
      expect(response.body.cooldownRemaining).toBeGreaterThan(59000);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(60000);
    });

    it('should block submission with 429 when user tries to submit during 90s cooldown', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 90, 3, testAdminId]
      );

      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'Test essay for 90 second cooldown enforcement.'
        });

      expect(response.status).toBe(429);
      expect(response.body.cooldownRemaining).toBeGreaterThan(89000);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(90000);
    });

    it('should block submission with 429 when user tries to submit during 120s cooldown', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 120, 3, testAdminId]
      );

      const now = new Date();
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, now]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'Test essay for 120 second cooldown enforcement.'
        });

      expect(response.status).toBe(429);
      expect(response.body.cooldownRemaining).toBeGreaterThan(119000);
      expect(response.body.cooldownRemaining).toBeLessThanOrEqual(120000);
    });

    it('should allow submission after 30s cooldown has expired', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 30, 3, testAdminId]
      );

      // Set last_review_at to 35 seconds ago (past the 30s cooldown)
      const thirtyFiveSecondsAgo = new Date(Date.now() - 35000);
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, thirtyFiveSecondsAgo]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'Test essay submitted after 30 second cooldown has expired.'
        });

      expect(response.status).not.toBe(429);
    });

    it('should allow submission after 60s cooldown has expired', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 60, 3, testAdminId]
      );

      const sixtyFiveSecondsAgo = new Date(Date.now() - 65000);
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, sixtyFiveSecondsAgo]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'Test essay submitted after 60 second cooldown has expired.'
        });

      expect(response.status).not.toBe(429);
    });

    it('should allow submission after 90s cooldown has expired', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 90, 3, testAdminId]
      );

      const ninetyFiveSecondsAgo = new Date(Date.now() - 95000);
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, ninetyFiveSecondsAgo]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'Test essay submitted after 90 second cooldown has expired.'
        });

      expect(response.status).not.toBe(429);
    });

    it('should allow submission after 120s cooldown has expired', async () => {
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, attempt_limit_per_category, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Project', 'Test Description', true, 120, 3, testAdminId]
      );

      const oneTwentyFiveSecondsAgo = new Date(Date.now() - 125000);
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, last_review_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserName.toLowerCase(), 3, oneTwentyFiveSecondsAgo]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: 'Test essay submitted after 120 second cooldown has expired.'
        });

      expect(response.status).not.toBe(429);
    });
  });
});
