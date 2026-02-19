import request from 'supertest';
import express from 'express';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('POST /public/projects/:code/reviews - Submit Essay for Review', () => {
  let app: express.Express;
  const testProjectCode = 'REVW01';
  const testUserName = 'testStudent';
  const testUserNameNorm = 'teststudent';
  const testEssay = 'This is a well-written essay that demonstrates strong argumentative skills and clear thesis statement.';

  beforeEach(async () => {
    // Set E2E_TEST environment variable to use mock SDK
    process.env.E2E_TEST = '1';
    
    // Create Express app with public router
    app = express();
    app.use(express.json());
    app.use('/public', publicRouter);

    // Clean up test data
    await pool.query('DELETE FROM review_attempts WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM project_students WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);

    // Create test admin (required due to FK constraint)
    const adminId = '00000000-0000-0000-0000-000000000001';
    await pool.query(
      `INSERT INTO admin_users (id, username, password_hash, is_super_admin) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [adminId, 'testadmin', 'hash', true]
    );

    // Create test project (enabled)
    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, created_by_admin_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testProjectCode, 'Review Test Project', 'Test Description', true, 120, adminId]
    );

    // Add test student to project
    await pool.query(
      `INSERT INTO project_students (project_code, student_name, student_name_norm, student_id, student_id_norm) 
       VALUES ($1, $2, $3, $4, $5)`,
      [testProjectCode, testUserName, testUserNameNorm, 'STU001', 'stu001']
    );

    // Initialize player state with review tokens
    await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_code, user_name_norm) DO UPDATE SET 
         review_tokens = $4, attack_tokens = $5, shield_tokens = $6`,
      [testProjectCode, testUserName, testUserNameNorm, 3, 0, 0]
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Happy Path - Successful Review Submission', () => {
    it('should accept essay submission and return valid review response with finalScore', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      // Verify response status
      expect(response.status).toBe(200);

      // Verify response has required fields
      expect(response.body).toHaveProperty('finalScore');
      expect(response.body).toHaveProperty('reviews');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body).toHaveProperty('cooldownMs');
      expect(response.body).toHaveProperty('attemptsRemaining');
    });

    it('should return finalScore as a valid number between 0-100', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(typeof response.body.finalScore).toBe('number');
      expect(response.body.finalScore).toBeGreaterThanOrEqual(0);
      expect(response.body.finalScore).toBeLessThanOrEqual(100);
    });

    it('should return reviews array with review objects containing category scores', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.reviews)).toBe(true);
      expect(response.body.reviews.length).toBeGreaterThan(0);

      // Each review should have essential fields
      response.body.reviews.forEach((review: any) => {
        expect(review).toHaveProperty('category');
        expect(review).toHaveProperty('attempt_number');
        expect(review).toHaveProperty('status');
        expect(review).toHaveProperty('score');
        expect(review).toHaveProperty('result_json');
      });
    });

    it('should include content, structure, and mechanics reviews', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      const categories = response.body.reviews.map((r: any) => r.category).sort();
      expect(categories).toEqual(['content', 'mechanics', 'structure']);
    });

    it('should return valid result_json structure with score, overview, and suggestions', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      const firstReview = response.body.reviews[0];
      const resultJson = firstReview.result_json;

      expect(resultJson).toHaveProperty('score');
      expect(resultJson).toHaveProperty('overview');
      expect(resultJson.overview).toHaveProperty('good');
      expect(resultJson.overview).toHaveProperty('improve');
      expect(resultJson).toHaveProperty('suggestions');

      // Verify types
      expect(typeof resultJson.score).toBe('number');
      expect(Array.isArray(resultJson.overview.good)).toBe(true);
      expect(Array.isArray(resultJson.overview.improve)).toBe(true);
      expect(Array.isArray(resultJson.suggestions)).toBe(true);
    });

    it('should update tokens correctly - deduct review token, add attack token', async () => {
      // Get initial state
      const initialState = await pool.query(
        `SELECT review_tokens, attack_tokens, shield_tokens FROM player_state 
         WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );
      const initialReviewTokens = initialState.rows[0].review_tokens;
      const initialAttackTokens = initialState.rows[0].attack_tokens;

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);

      // Verify tokens object is returned
      expect(response.body.tokens).toHaveProperty('review_tokens');
      expect(response.body.tokens).toHaveProperty('attack_tokens');
      expect(response.body.tokens).toHaveProperty('shield_tokens');

      // Verify review token was deducted
      expect(response.body.tokens.review_tokens).toBe(initialReviewTokens - 1);

      // Verify attack token was added (up to max of 1)
      expect(response.body.tokens.attack_tokens).toBeLessThanOrEqual(1);
      expect(response.body.tokens.attack_tokens).toBeGreaterThanOrEqual(initialAttackTokens);
    });

    it('should return attemptsRemaining matching updated review_tokens', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(response.body.attemptsRemaining).toBe(response.body.tokens.review_tokens);
    });

    it('should return cooldownMs as a valid number', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(typeof response.body.cooldownMs).toBe('number');
      expect(response.body.cooldownMs).toBeGreaterThan(0);
    });

    it('should store review attempt in database with status success', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);

      // Query database to verify storage
      const attempts = await pool.query(
        `SELECT * FROM review_attempts 
         WHERE project_code = $1 AND user_name_norm = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [testProjectCode, testUserNameNorm]
      );

      expect(attempts.rows.length).toBeGreaterThan(0);
      expect(attempts.rows[0].status).toBe('success');
      expect(attempts.rows[0].essay_snapshot).toBe(testEssay);
      expect(attempts.rows[0].result_json).not.toBeNull();
    });

    it('should set last_review_at timestamp on player_state', async () => {
      // Get time before request
      const timeBefore = Date.now();

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);

      // Query database to verify timestamp
      const playerState = await pool.query(
        `SELECT last_review_at FROM player_state 
         WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );

      expect(playerState.rows.length).toBeGreaterThan(0);
      expect(playerState.rows[0].last_review_at).not.toBeNull();

      const lastReviewTime = new Date(playerState.rows[0].last_review_at).getTime();
      expect(lastReviewTime).toBeGreaterThanOrEqual(timeBefore);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when userName is missing', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          essay: testEssay
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should return 400 when essay is missing', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should return 403 when no review tokens available', async () => {
      // Set review tokens to 0
      await pool.query(
        `UPDATE player_state SET review_tokens = 0 
         WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should return 429 when cooldown period is active', async () => {
      // Set last_review_at to recent time (within cooldown)
      await pool.query(
        `UPDATE player_state SET last_review_at = NOW() - INTERVAL '30 seconds'
         WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );

      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('wait');
    });
  });
});
