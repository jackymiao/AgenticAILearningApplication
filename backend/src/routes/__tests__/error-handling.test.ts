import request from 'supertest';
import express from 'express';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('Error Handling & Responses', () => {
  let app: express.Express;
  const testProjectCode = 'ERR001';
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
      [testAdminId, 'errtestadmin', 'hash', true]
    );

    // Create enabled test project
    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET enabled = $4`,
      [testProjectCode, 'Error Test', 'Test', true, testAdminId]
    );

    // Create disabled test project
    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET enabled = $4`,
      ['DSB001', 'Disabled Test', 'Test', false, testAdminId]
    );

    // Create test student
    await pool.query(
      `INSERT INTO project_students (project_code, student_id_norm, student_id, student_name, student_name_norm)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [testProjectCode, 'errstudent', 'ERRSTUDENT123', 'Error Student', 'error student']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM review_attempts WHERE project_code IN ($1, $2)', [testProjectCode, 'DSB001']);
    await pool.query('DELETE FROM player_state WHERE project_code IN ($1, $2)', [testProjectCode, 'DSB001']);
    await pool.query('DELETE FROM project_students WHERE project_code IN ($1, $2)', [testProjectCode, 'DSB001']);
    await pool.query('DELETE FROM projects WHERE code IN ($1, $2)', [testProjectCode, 'DSB001']);
    delete process.env.E2E_TEST;
    await pool.end();
  });

  describe('Endpoints respond without crashing', () => {
    it('should handle GET /public/projects/:code', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}`);

      expect([200, 400, 404]).toContain(response.status);
    });

    it('should handle GET /public/projects/:code/user-state with userName', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: 'errstudent' });

      expect([200, 400, 404]).toContain(response.status);
    });

    it('should handle POST /public/projects/:code/reviews', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: 'errstudent',
          essay: 'This is a valid essay'
        });

      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('should handle GET /public/projects/:code/leaderboard', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/leaderboard`);

      expect([200, 400, 404]).toContain(response.status);
    });

    it('should handle GET /public/projects/:code/validate-student', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/validate-student`)
        .send({ studentId: 'errstudent' });

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Disabled projects block access', () => {
    it('should block access to disabled project', async () => {
      const response = await request(app)
        .get('/public/projects/DSB001/user-state')
        .query({ userName: 'student1' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should block review submission to disabled project', async () => {
      const response = await request(app)
        .post('/public/projects/DSB001/reviews')
        .send({
          userName: 'student1',
          essay: 'This is an essay'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response format validation', () => {
    it('should return JSON responses', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: 'errstudent' });

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should include error field when present', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({ userName: 'errstudent' }); // Missing essay

      if (response.status !== 200) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Non-existent endpoints', () => {
    it('should handle non-existent project gracefully', async () => {
      const response = await request(app)
        .get('/public/projects/NOEXIST/user-state')
        .query({ userName: 'student1' });

      expect(response.status).toBe(404);
    });

    it('should return error for invalid method', async () => {
      const response = await request(app)
        .delete(`/public/projects/${testProjectCode}`);

      expect([404, 405]).toContain(response.status);
    });
  });
});
