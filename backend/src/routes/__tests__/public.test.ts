import request from 'supertest';
import express from 'express';
import publicRouter from '../public.js';
import pool from '../../db/index.js';

describe('Public Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/public', publicRouter);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /public/projects/:code', () => {
    it('should return project when enabled', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true,  '00000000-0000-0000-0000-000000000001']
      );

      const response = await request(app).get('/public/projects/TEST01');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 'TEST01');
      expect(response.body).toHaveProperty('title');
    });

    it('should block access when project is disabled', async () => {
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', false,  '00000000-0000-0000-0000-000000000001']
      );

      const response = await request(app).get('/public/projects/TEST01');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'This project is currently disabled' });
    });
  });

  describe('POST /public/projects/:code/validate-student', () => {
    it('should validate student when project is enabled', async () => {
      // Setup project (ensure it's enabled)
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', true,  '00000000-0000-0000-0000-000000000001']
      );

      // Add test student
      await pool.query(
        'INSERT INTO project_students (project_code, student_name, student_name_norm, student_id, student_id_norm) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        ['TEST01', 'John Doe', 'john doe', 'JD1234', 'JD1234']
      );

      const response = await request(app)
        .post('/public/projects/TEST01/validate-student')
        .send({ studentId: 'JD1234' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('studentName', 'John Doe');
      expect(response.body).toHaveProperty('studentId', 'JD1234');
    });

    it('should block validation when project is disabled', async () => {
      // Explicitly set project to disabled
      await pool.query(
        'INSERT INTO projects (code, title, description, enabled, created_by_admin_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET enabled = $4',
        ['TEST01', 'Test Project', 'Test Description', false,  '00000000-0000-0000-0000-000000000001']
      );

      const response = await request(app)
        .post('/public/projects/TEST01/validate-student')
        .send({ studentId: 'JD1234' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'This project is currently disabled' });
    });
  });
});
