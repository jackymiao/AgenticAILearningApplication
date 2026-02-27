import request from 'supertest';
import express from 'express';
import feedbackRouter from '../feedback.js';
import pool from '../../db/index.js';

describe('Feedback Routes', () => {
  let app: express.Express;
  const testProjectCode = 'FDB001';
  const testAdminId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/public', feedbackRouter);

    await pool.query(
      `INSERT INTO admin_users (id, username, password_hash, is_super_admin)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [testAdminId, 'feedbackadmin', 'hash', true]
    );

    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, enable_feedback, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE SET enable_feedback = $5, enabled = $4`,
      [testProjectCode, 'Feedback Project', 'Feedback Desc', true, true, testAdminId]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM project_feedback WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM review_attempts WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM submissions WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM player_state WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM attacks WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM active_sessions WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM project_students WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);
    await pool.end();
  });

  it('accepts feedback submission', async () => {
    const response = await request(app)
      .post(`/public/${testProjectCode}/feedback/submit`)
      .send({
        userName: 'Student One',
        contentRating: 4,
        systemDesignRating: 5,
        responseQualityRating: 3,
        comment: 'Good experience.'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.feedback).toHaveProperty('project_code', testProjectCode);
  });
});
