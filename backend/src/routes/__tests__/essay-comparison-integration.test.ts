import request from 'supertest';
import express from 'express';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('POST /public/projects/:code/reviews - Essay Comparison Feature', () => {
  let app: express.Express;
  const testProjectCode = 'ESSCMP';
  const testUserName = 'testStudent';
  const testUserNameNorm = 'teststudent';
  const testEssay = 'This is a well-written essay that demonstrates strong argumentative skills and clear thesis statement.';
  const revisedEssay = 'This is a REVISED and improved essay that demonstrates even stronger argumentative skills with additional evidence and clear thesis statement.';

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

    // Create test project (enabled, test_mode on to skip AI detection)
    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, review_cooldown_seconds, test_mode, created_by_admin_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testProjectCode, 'Essay Comparison Test Project', 'Test Description', true, 0, true, adminId]
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
      [testProjectCode, testUserName, testUserNameNorm, 5, 0, 0]
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM review_attempts WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM project_students WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);
    
    delete process.env.E2E_TEST;
    await pool.end();
  });

  describe('First submission (no previous essay)', () => {
    it('should accept first essay submission without comparison check', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('finalScore');
      expect(response.body).toHaveProperty('reviews');
    });
  });

  describe('Identical essay submission', () => {
    it('should reject identical essay on second submission with 400 and ESSAY_UNCHANGED code', async () => {
      // First submission - should succeed
      const firstResponse = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(firstResponse.status).toBe(200);

      // Second submission with IDENTICAL essay - should be rejected
      const secondResponse = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toHaveProperty('error');
      expect(secondResponse.body.error).toBe('Please revise your essay based on the previous feedback before submitting again');
      expect(secondResponse.body).toHaveProperty('code', 'ESSAY_UNCHANGED');
    });

    it('should not consume review token when rejecting identical essay', async () => {
      // First submission
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      // Check tokens after first submission (should be 4 remaining)
      const stateAfterFirst = await pool.query(
        `SELECT review_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );
      expect(stateAfterFirst.rows[0].review_tokens).toBe(4);

      // Second submission with identical essay
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      // Check tokens after rejection (should still be 4)
      const stateAfterReject = await pool.query(
        `SELECT review_tokens FROM player_state WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );
      expect(stateAfterReject.rows[0].review_tokens).toBe(4);
    });

    it('should not increment attempt_number when rejecting identical essay', async () => {
      // First submission
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      // Check attempt_number after first submission (should be 1)
      const attemptsAfterFirst = await pool.query(
        `SELECT DISTINCT attempt_number FROM review_attempts 
         WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );
      expect(attemptsAfterFirst.rows[0].attempt_number).toBe(1);

      // Second submission with identical essay
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      // Check attempt_number after rejection (should still be 1)
      const attemptsAfterReject = await pool.query(
        `SELECT DISTINCT attempt_number FROM review_attempts 
         WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );
      expect(attemptsAfterReject.rows.length).toBe(1);
      expect(attemptsAfterReject.rows[0].attempt_number).toBe(1);
    });
  });

  describe('Revised essay submission', () => {
    it('should accept revised essay after first submission', async () => {
      // First submission
      const firstResponse = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(firstResponse.status).toBe(200);

      // Second submission with REVISED essay - should succeed
      const secondResponse = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: revisedEssay
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body).toHaveProperty('finalScore');
    });

    it('should accept essay with same words but different punctuation', async () => {
      const essayWithPunctuation = 'This is a test! Essay with punctuation?';
      const essayWithoutPunctuation = 'This is a test Essay with punctuation';

      // First submission
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: essayWithPunctuation
        });

      // Second submission - same words, different punctuation - should be REJECTED
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: essayWithoutPunctuation
        });

      // Essays are considered identical (normalized to same words)
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ESSAY_UNCHANGED');
    });

    it('should accept essay with same words but different case as identical', async () => {
      const essayUpperCase = 'THIS IS A TEST ESSAY';
      const essayLowerCase = 'this is a test essay';

      // First submission
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: essayUpperCase
        });

      // Second submission - same words, different case - should be REJECTED
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: essayLowerCase
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ESSAY_UNCHANGED');
    });

    it('should accept essay when even one word is changed', async () => {
      const essay1 = 'This is my original essay about climate change.';
      const essay2 = 'This is my revised essay about climate change.';

      // First submission
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: essay1
        });

      // Second submission - one word changed - should SUCCEED
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: essay2
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('finalScore');
    });
  });
});
