import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import adminRouter from '../admin.js';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('Test Mode Feature', () => {
  let app: express.Express;
  let adminApp: express.Express;
  const originalApiKey = process.env.AIORNOT_API_KEY;
  const originalFetch = (global as any).fetch;
  const testProjectCode = 'TSTMOD';
  const testProjectCodeDisabled = 'TSMOD2';
  const testUserName = 'testStudent';
  const testUserNameNorm = 'teststudent';
  const testAdminId = '10000000-0000-0000-0000-000000000001';
  const testEssay = 'This is a test essay for test mode verification.';

  beforeAll(async () => {
    // Set E2E_TEST to use mock SDK
    process.env.E2E_TEST = '1';

    // Create admin app with mocked session
    adminApp = express();
    adminApp.use(express.json());
    adminApp.use((req, _res, next) => {
      req.session = {
        adminId: testAdminId,
        adminUsername: 'testadmin_testmode',
        isSuperAdmin: true
      } as any;
      next();
    });
    adminApp.use('/admin', adminRouter);

    // Create public app
    app = express();
    app.use(express.json());
    app.use('/public', publicRouter);

    // Create test admin user
    await pool.query(
      `INSERT INTO admin_users (id, username, password_hash, is_super_admin) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [testAdminId, 'testadmin_testmode', 'hash', true]
    );
  });

  beforeEach(async () => {
    process.env.AIORNOT_API_KEY = 'test-aiornot-key';

    // Clean up test data before each test
    await pool.query('DELETE FROM review_attempts WHERE project_code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM player_state WHERE project_code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM project_students WHERE project_code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM ai_detections WHERE project_code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM projects WHERE code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);

    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'det-test-id',
        report: {
          ai_text: {
            confidence: 0.95,
            is_detected: true,
            annotations: [['Suspicious paragraph', 0.99]],
          },
        },
        metadata: {
          word_count: 120,
          character_count: 720,
          token_count: 150,
          md5: 'abc123',
        },
        created_at: new Date().toISOString(),
      }),
    });
  });

  afterAll(async () => {
    process.env.AIORNOT_API_KEY = originalApiKey;
    (global as any).fetch = originalFetch;

    // Clean up in proper order (projects first, then admin)
    await pool.query('DELETE FROM review_attempts WHERE project_code IN ($1,$2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM player_state WHERE project_code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM project_students WHERE project_code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM ai_detections WHERE project_code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM projects WHERE code IN ($1, $2)', [testProjectCode, testProjectCodeDisabled]);
    await pool.query('DELETE FROM admin_users WHERE id = $1', [testAdminId]);
    await pool.end();
  });

  describe('Admin Project Creation with Test Mode', () => {
    it('should create project with test_mode set to true', async () => {
      const response = await request(adminApp)
        .post('/admin/projects')
        .send({
          code: testProjectCode,
          title: 'Test Mode Project',
          description: 'Testing test mode',
          projectPassword: 'TestModePass123',
          wordLimit: 150,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120,
          enableFeedback: false,
          testMode: true,
          enabled: true
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('test_mode', true);
      expect(response.body.code).toBe(testProjectCode.toUpperCase());
    });

    it('should create project with test_mode set to false (default)', async () => {
      const response = await request(adminApp)
        .post('/admin/projects')
        .send({
          code: testProjectCode,
          title: 'Production Project',
          description: 'Testing production mode',
          projectPassword: 'TestModePass123',
          wordLimit: 150,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120,
          enableFeedback: false,
          testMode: false,
          enabled: true
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('test_mode', false);
    });

    it('should default test_mode to false when not provided', async () => {
      const response = await request(adminApp)
        .post('/admin/projects')
        .send({
          code: testProjectCode,
          title: 'Default Project',
          description: 'Testing default behavior',
          projectPassword: 'TestModePass123',
          wordLimit: 150,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120,
          enableFeedback: false,
          enabled: true
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('test_mode', false);
    });
  });

  describe('Admin Project Update with Test Mode', () => {
    beforeEach(async () => {
      // Create a project with test_mode false
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, test_mode, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testProjectCode, 'Original Project', 'Original Description', true, false, testAdminId]
      );
    });

    it('should update project to enable test_mode', async () => {
      const response = await request(adminApp)
        .put(`/admin/projects/${testProjectCode}`)
        .send({
          title: 'Updated Project',
          description: 'Updated with test mode',
          projectPassword: 'UpdatedPass123',
          youtubeUrl: '',
          wordLimit: 200,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120,
          enableFeedback: false,
          testMode: true
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('test_mode', true);
    });

    it('should update project to disable test_mode', async () => {
      // First enable test mode
      await pool.query(
        `UPDATE projects SET test_mode = true WHERE code = $1`,
        [testProjectCode]
      );

      const response = await request(adminApp)
        .put(`/admin/projects/${testProjectCode}`)
        .send({
          title: 'Updated Project',
          description: 'Disabled test mode',
          projectPassword: 'UpdatedPass123',
          youtubeUrl: '',
          wordLimit: 200,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120,
          enableFeedback: false,
          testMode: false
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('test_mode', false);
    });
  });

  describe('Review Submission with Test Mode', () => {
    beforeEach(async () => {
      // Create project with test_mode enabled
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, test_mode, review_cooldown_seconds, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCode, 'Test Mode Enabled Project', 'Test Description', true, true, 120, testAdminId]
      );

      // Create project with test_mode disabled
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, test_mode, review_cooldown_seconds, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testProjectCodeDisabled, 'Test Mode Disabled Project', 'Test Description', true, false, 120, testAdminId]
      );

      // Add test student to both projects
      await pool.query(
        `INSERT INTO project_students (project_code, student_name, student_name_norm, student_id, student_id_norm) 
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCode, testUserName, testUserNameNorm, 'STU001', 'stu001']
      );

      await pool.query(
        `INSERT INTO project_students (project_code, student_name, student_name_norm, student_id, student_id_norm) 
         VALUES ($1, $2, $3, $4, $5)`,
        [testProjectCodeDisabled, testUserName, testUserNameNorm, 'STU001', 'stu001']
      );

      // Initialize player state with review tokens for both projects
      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testProjectCode, testUserName, testUserNameNorm, 3, 0, 0]
      );

      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testProjectCodeDisabled, testUserName, testUserNameNorm, 3, 0, 0]
      );
    });

    it('should accept review submission when test_mode is true', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('finalScore');
      expect(response.body).toHaveProperty('reviews');
      expect(response.body).toHaveProperty('tokens');
    });

    it('should process review normally when test_mode is false', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCodeDisabled}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('finalScore');
      expect(response.body).toHaveProperty('reviews');
    });

    it('should return a warning instead of rejecting when AI is detected and test_mode is false', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCodeDisabled}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('warning');
      expect(response.body.warning).toMatchObject({
        type: 'ai-detected',
        message: 'This essay may have been generated with AI assistance. Your review was still processed.',
      });
      expect(response.body.warning.detection).toMatchObject({
        is_detected: true,
        confidence: 0.95,
        confidence_category: 'HIGH'
      });
    });

    it('should not store AI detection data when test_mode is true', async () => {
      await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      // Check that no AI detection was stored
      const detectionCheck = await pool.query(
        `SELECT * FROM ai_detections WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );

      expect(detectionCheck.rows.length).toBe(0);
    });

    it('should consume review token even when test_mode is true', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);
      expect(response.body.tokens.review_tokens).toBe(2); // Started with 3, should be 2 now
      expect(response.body.attemptsRemaining).toBe(2);
    });

    it('should still create review_attempts records when test_mode is true', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: testUserName,
          essay: testEssay
        });

      expect(response.status).toBe(200);

      // Verify review attempts were created
      const attemptsCheck = await pool.query(
        `SELECT * FROM review_attempts WHERE project_code = $1 AND user_name_norm = $2`,
        [testProjectCode, testUserNameNorm]
      );

      expect(attemptsCheck.rows.length).toBeGreaterThan(0);
      expect(attemptsCheck.rows.length).toBe(3); // content, structure, mechanics
    });
  });

  describe('Test Mode Database Persistence', () => {
    it('should persist test_mode setting in database', async () => {
      // Create project via API
      const createResponse = await request(adminApp)
        .post('/admin/projects')
        .send({
          code: testProjectCode,
          title: 'Persistence Test',
          description: 'Testing persistence',
          projectPassword: 'TestModePass123',
          wordLimit: 150,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120,
          enableFeedback: false,
          testMode: true,
          enabled: true
        });

      expect(createResponse.status).toBe(201);

      // Fetch directly from database
      const dbCheck = await pool.query(
        `SELECT test_mode FROM projects WHERE code = $1`,
        [testProjectCode.toUpperCase()]
      );

      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].test_mode).toBe(true);
    });

    it('should retrieve test_mode when fetching project', async () => {
      // Create project with test_mode true
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, test_mode, created_by_admin_id) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testProjectCode, 'Fetch Test', 'Description', true, true, testAdminId]
      );

      const response = await request(adminApp)
        .get(`/admin/projects/${testProjectCode}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('test_mode', true);
    });
  });
});
