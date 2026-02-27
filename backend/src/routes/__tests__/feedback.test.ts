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

  describe('POST /public/:code/feedback/submit', () => {
    it('accepts valid feedback and stores in database', async () => {
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
      expect(response.body.feedback).toHaveProperty('content_rating', 4);
      expect(response.body.feedback).toHaveProperty('system_design_rating', 5);
      expect(response.body.feedback).toHaveProperty('response_quality_rating', 3);
      expect(response.body.feedback).toHaveProperty('comment', 'Good experience.');

      // Verify data is actually in database
      const dbCheck = await pool.query(
        'SELECT * FROM project_feedback WHERE id = $1',
        [response.body.feedback.id]
      );
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].project_code).toBe(testProjectCode);
      expect(dbCheck.rows[0].content_rating).toBe(4);
    });

    it('prevents duplicate submissions from same user', async () => {
      const payload = {
        userName: 'Student Two',
        contentRating: 5,
        systemDesignRating: 4,
        responseQualityRating: 5,
        comment: 'Great!'
      };

      // First submission
      const first = await request(app)
        .post(`/public/${testProjectCode}/feedback/submit`)
        .send(payload);
      expect(first.status).toBe(201);

      // Second submission should fail
      const second = await request(app)
        .post(`/public/${testProjectCode}/feedback/submit`)
        .send(payload);
      expect(second.status).toBe(409);
      expect(second.body.error).toContain('already submitted');
    });

    it('rejects submission with missing ratings', async () => {
      const response = await request(app)
        .post(`/public/${testProjectCode}/feedback/submit`)
        .send({
          userName: 'Student Three',
          contentRating: 4,
          systemDesignRating: 5,
          // missing responseQualityRating
          comment: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('All ratings are required');
    });

    it('rejects submission with invalid rating values', async () => {
      const response = await request(app)
        .post(`/public/${testProjectCode}/feedback/submit`)
        .send({
          userName: 'Student Four',
          contentRating: 6, // invalid - must be 1-5
          systemDesignRating: 5,
          responseQualityRating: 3,
          comment: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('between 1 and 5');
    });

    it('rejects submission with comment exceeding 200 words', async () => {
      const longComment = Array(201).fill('word').join(' ');
      const response = await request(app)
        .post(`/public/${testProjectCode}/feedback/submit`)
        .send({
          userName: 'Student Five',
          contentRating: 4,
          systemDesignRating: 5,
          responseQualityRating: 3,
          comment: longComment
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('200 words');
    });

    it('accepts submission without comment', async () => {
      const response = await request(app)
        .post(`/public/${testProjectCode}/feedback/submit`)
        .send({
          userName: 'Student Six',
          contentRating: 3,
          systemDesignRating: 4,
          responseQualityRating: 5
          // no comment
        });

      expect(response.status).toBe(201);
      expect(response.body.feedback.comment).toBe('');
    });

    it('rejects submission when feedback is disabled', async () => {
      // Create project with feedback disabled
      await pool.query(
        `INSERT INTO projects (code, title, description, enabled, enable_feedback, created_by_admin_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE SET enable_feedback = $5`,
        ['FDB002', 'No Feedback', 'Test', true, false, testAdminId]
      );

      const response = await request(app)
        .post(`/public/FDB002/feedback/submit`)
        .send({
          userName: 'Student Seven',
          contentRating: 4,
          systemDesignRating: 5,
          responseQualityRating: 3
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not enabled');

      // Cleanup
      await pool.query('DELETE FROM projects WHERE code = $1', ['FDB002']);
    });

    it('rejects submission for non-existent project', async () => {
      const response = await request(app)
        .post(`/public/NOEXIST/feedback/submit`)
        .send({
          userName: 'Student Eight',
          contentRating: 4,
          systemDesignRating: 5,
          responseQualityRating: 3
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /public/:code/feedback/check', () => {
    it('returns false when user has not submitted', async () => {
      const response = await request(app)
        .post(`/public/${testProjectCode}/feedback/check`)
        .send({ userName: 'New Student' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ hasSubmitted: false });
    });

    it('returns true when user has already submitted', async () => {
      // Submit feedback first
      await request(app)
        .post(`/public/${testProjectCode}/feedback/submit`)
        .send({
          userName: 'Check Student',
          contentRating: 5,
          systemDesignRating: 5,
          responseQualityRating: 5
        });

      // Check if submitted
      const response = await request(app)
        .post(`/public/${testProjectCode}/feedback/check`)
        .send({ userName: 'Check Student' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ hasSubmitted: true });
    });

    it('requires userName parameter', async () => {
      const response = await request(app)
        .post(`/public/${testProjectCode}/feedback/check`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('userName is required');
    });
  });
});
