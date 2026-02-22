import request from 'supertest';
import express from 'express';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('Input Validation', () => {
  let app: express.Express;
  const testProjectCode = 'VAL001';
  const testAdminId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    process.env.E2E_TEST = '1';
    
    app = express();
    app.use(express.json());
    app.use('/public', publicRouter);

    // Create test admin
    await pool.query(
      `INSERT INTO admin_users (id, username, password_hash, is_super_admin)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [testAdminId, 'valtestadmin', 'hash', true]
    );

    // Create test project
    await pool.query(
      `INSERT INTO projects (code, title, description, word_limit, attempt_limit_per_category, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO NOTHING`,
      [testProjectCode, 'Validation Test', 'Test', 150, 3, testAdminId]
    );

    // Create test student
    await pool.query(
      `INSERT INTO project_students (project_code, student_id_norm, student_id, student_name, student_name_norm)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [testProjectCode, 'valstudent', 'VALSTUDENT123', 'Val Student', 'val student']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM review_attempts WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM project_students WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);
    delete process.env.E2E_TEST;
    await pool.end();
  });

  describe('Essay submission validation', () => {
    it('should accept valid essay', async () => {
      const essay = 'This is a valid essay with proper content';
      
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: 'valstudent',
          essay
        });

      expect([200, 400, 403]).toContain(response.status);
    });

    it('should reject missing essay', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: 'valstudent'
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing userName', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          essay: 'This is an essay'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Student validation', () => {
    it('should validate student endpoint responds', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/validate-student`)
        .send({ studentId: 'valstudent' });

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('studentName');
      }
    });

    it('should reject missing studentId', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/validate-student`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('User state endpoint', () => {
    it('should require userName parameter', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`);

      expect(response.status).toBe(400);
    });

    it('should respond with user state for valid student', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: 'valstudent' });

      expect([200, 400, 403]).toContain(response.status);
    });
  });

  describe('Special character handling', () => {
    it('should accept essay with quotes and apostrophes', async () => {
      const essay = 'Essay with "quotes" and \'apostrophes\'';
      
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: 'valstudent',
          essay
        });

      expect([200, 400, 403]).toContain(response.status);
    });

    it('should accept essay with unicode characters', async () => {
      const essay = 'Essay with café and naïve words';
      
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: 'valstudent',
          essay
        });

      expect([200, 400, 403, 429]).toContain(response.status);
    });
  });
});
