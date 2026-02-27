import request from 'supertest';
import express from 'express';
import adminRouter from '../admin.js';
import pool from '../../db/index.js';

describe('Admin Feedback', () => {
  let app: express.Express;
  const testProjectCode = 'FDB002';
  const testAdminId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    app.use((req, _res, next) => {
      req.session = {
        adminId: testAdminId,
        adminUsername: 'admin',
        isSuperAdmin: true
      } as any;
      next();
    });

    app.use('/admin', adminRouter);

    await pool.query(
      `INSERT INTO admin_users (id, username, password_hash, is_super_admin)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [testAdminId, 'feedbackadmin2', 'hash', true]
    );

    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, enable_feedback, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE SET enable_feedback = $5, enabled = $4`,
      [testProjectCode, 'Feedback Admin', 'Admin Feedback', true, true, testAdminId]
    );

    await pool.query(
      `INSERT INTO project_feedback
       (project_code, content_rating, system_design_rating, response_quality_rating, comment, submission_hash)
       VALUES ($1, $2, $3, $4, $5, $6),
              ($1, $7, $8, $9, $10, $11)`,
      [
        testProjectCode,
        5,
        4,
        3,
        'First comment',
        'hash-one',
        4,
        4,
        4,
        'Second comment',
        'hash-two'
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM project_feedback WHERE project_code = $1', [testProjectCode]);
    await pool.query('DELETE FROM projects WHERE code = $1', [testProjectCode]);
    await pool.query('DELETE FROM admin_users WHERE id = $1', [testAdminId]);
    await pool.end();
  });

  it('returns feedback with aggregate stats', async () => {
    const response = await request(app)
      .get(`/admin/projects/${testProjectCode}/feedback`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('aggregate');
    expect(response.body.aggregate).toHaveProperty('totalResponses', 2);
    expect(Array.isArray(response.body.feedback)).toBe(true);
    expect(response.body.feedback.length).toBe(2);
  });
});
