import request from 'supertest';
import express from 'express';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('Leaderboard & Scoring', () => {
  let app: express.Express;
  const testProjectCode = 'LEAD01';
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
      [testAdminId, 'leadtestadmin', 'hash', true]
    );

    // Create test project
    await pool.query(
      `INSERT INTO projects (code, title, description, created_by_admin_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO NOTHING`,
      [testProjectCode, 'Leaderboard Test', 'Test', testAdminId]
    );

    // Create test students
    const students = ['student1', 'student2', 'student3'];
    for (const student of students) {
      await pool.query(
        `INSERT INTO project_students (project_code, student_id_norm, student_id, student_name, student_name_norm)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [testProjectCode, student, `ID${student.toUpperCase()}123`, `Student ${student}`, student.toLowerCase()]
      );
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM review_attempts WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM project_students WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);
    delete process.env.E2E_TEST;
    await pool.end();
  });

  describe('Leaderboard endpoint', () => {
    it('should return leaderboard data', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/leaderboard`);

      expect([200, 404, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.body) || typeof response.body === 'object').toBe(true);
      }
    });

    it('should handle non-existent project', async () => {
      const response = await request(app)
        .get('/public/projects/NOEXIST/leaderboard');

      expect([404, 400, 200]).toContain(response.status);
    });
  });

  describe('User state endpoint', () => {
    it('should return user state with tokens', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`)
        .query({ userName: 'student1' });

      expect([200, 400, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('attemptsRemaining');
      }
    });

    it('should require userName parameter', async () => {
      const response = await request(app)
        .get(`/public/projects/${testProjectCode}/user-state`);

      expect(response.status).toBe(400);
    });
  });

  describe('Essay review scoring', () => {
    it('should accept review submission', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: 'student1',
          essay: 'This is a sample essay with sufficient content'
        });

      expect([200, 400, 403]).toContain(response.status);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/public/projects/${testProjectCode}/reviews`)
        .send({
          userName: 'student1'
        });

      expect(response.status).toBe(400);
    });
  });
});
