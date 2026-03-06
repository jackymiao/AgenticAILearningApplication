import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import adminRouter from '../admin.js';
import pool from '../../db/index.js';
import { encryptPassword, decryptPassword } from '../../utils/crypto.js';
import type { Project } from '../../types.js';

// Middleware to mock admin authentication for testing
const mockAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  req.session = {
    adminId: '00000000-0000-0000-0000-000000000001',
    isSuperAdmin: true
  } as any;
  next();
};

describe('Admin Routes - Project Management with Password Encryption', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Simple session mock without full session middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      req.session = {} as any;
      next();
    });
    // Apply mock admin authentication instead of real requireAdmin
    app.use('/admin', mockAdminAuth);
    app.use('/admin', adminRouter);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM projects WHERE code IN ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', 
      ['ADM001', 'ADM002', 'ADM03A', 'ADM004', 'GETAD1', 'UPDTS1', 'STATS1', 'SECUR1', 'DIFFS1', 'DIFFS2']);
    await pool.end();
  });

  describe('POST /admin/projects - Create project with password encryption', () => {
    it('should create a project with encrypted password', async () => {
      const response = await request(app)
        .post('/admin/projects')
        .send({
          code: 'ADM001',
          title: 'Test Project',
          description: '<p>Test Description</p>',
          projectPassword: 'PASS123',
          youtubeUrl: 'https://youtube.com/watch?v=test',
          wordLimit: 200,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120,
          enableFeedback: true,
          testMode: false,
          enabled: true
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('code', 'ADM001');
      expect(response.body).toHaveProperty('title', 'Test Project');
      expect(response.body).toHaveProperty('project_password_hash');
      
      // Verify password is encrypted (not plain text)
      expect(response.body.project_password_hash).not.toBe('PASS123');
      
      // Verify password can be decrypted
      const decrypted = decryptPassword(response.body.project_password_hash);
      expect(decrypted).toBe('PASS123');
    });

    it('should reject project creation without password', async () => {
      const response = await request(app)
        .post('/admin/projects')
        .send({
          code: 'ADM002',
          title: 'Test Project',
          description: 'Test Description',
          projectPassword: '', // Empty password
          youtubeUrl: 'https://youtube.com/watch?v=test',
          wordLimit: 200,
          attemptLimitPerCategory: 3
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject project creation without required fields', async () => {
      const response = await request(app)
        .post('/admin/projects')
        .send({
          code: 'ADM03A',
          // missing title, description, projectPassword
          youtubeUrl: 'https://youtube.com/watch?v=test'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    it('should reject project with invalid code format', async () => {
      const response = await request(app)
        .post('/admin/projects')
        .send({
          code: 'INVALID', // Not exactly 6 alphanumeric chars
          title: 'Test Project',
          description: 'Test Description',
          projectPassword: 'PASS123',
          wordLimit: 200
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('6 alphanumeric characters');
    });

    it('should reject duplicate project code', async () => {
      // Create first project
      await request(app)
        .post('/admin/projects')
        .send({
          code: 'ADM004',
          title: 'Test Project 1',
          description: 'Test Description 1',
          projectPassword: 'PASS123',
          wordLimit: 200,
          attemptLimitPerCategory: 3
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/admin/projects')
        .send({
          code: 'ADM004', // Same code
          title: 'Test Project 2',
          description: 'Test Description 2',
          projectPassword: 'PASS456',
          wordLimit: 200
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /admin/projects/:code - Decrypt password for admin editing', () => {
    it('should return project with decrypted password', async () => {
      const testPassword = 'MYPASS789';
      
      // Create project first
      const createResponse = await request(app)
        .post('/admin/projects')
        .send({
          code: 'GETAD1',
          title: 'Get Project Test',
          description: 'Test Description',
          projectPassword: testPassword,
          wordLimit: 200,
          attemptLimitPerCategory: 3
        });

      expect(createResponse.status).toBe(201);

      // Retrieve project
      const getResponse = await request(app)
        .get('/admin/projects/GETAD1');

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveProperty('project_password_hash');
      expect(getResponse.body).toHaveProperty('project_password', testPassword);
      
      // Clean up
      await pool.query('DELETE FROM projects WHERE code = $1', ['GETAD1']);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/admin/projects/NOEXIST');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Project not found');
    });
  });

  describe('PUT /admin/projects/:code - Update project with password re-encryption', () => {
    beforeEach(async () => {
      // Create a project to update
      await request(app)
        .post('/admin/projects')
        .send({
          code: 'UPDTS1',
          title: 'Original Title',
          description: 'Original Description',
          projectPassword: 'ORIGINALPWD',
          wordLimit: 150,
          attemptLimitPerCategory: 3,
          reviewCooldownSeconds: 120
        });
    });

    afterEach(async () => {
      await pool.query('DELETE FROM projects WHERE code = $1', ['UPDTS1']);
    });

    it('should require password during update', async () => {
      const response = await request(app)
        .put('/admin/projects/UPDTS1')
        .send({
          title: 'Updated Title',
          description: 'Updated Description',
          // Missing projectPassword
          wordLimit: 250
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when updating non-existent project', async () => {
      const response = await request(app)
        .put('/admin/projects/NOEXIST')
        .send({
          title: 'Updated Title',
          description: 'Updated Description',
          projectPassword: 'PASS123',
          wordLimit: 250
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Project not found');
    });

  });

  describe('PATCH /admin/projects/:code/status - Update project enabled status', () => {
    beforeEach(async () => {
      await request(app)
        .post('/admin/projects')
        .send({
          code: 'STATS1',
          title: 'Status Test Project',
          description: 'Test Description',
          projectPassword: 'PASS123',
          wordLimit: 200,
          enabled: true
        });
    });

    afterEach(async () => {
      await pool.query('DELETE FROM projects WHERE code = $1', ['STATS1']);
    });

    it('should disable a project', async () => {
      const response = await request(app)
        .patch('/admin/projects/STATS1/status')
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled', false);
    });

    it('should enable a project', async () => {
      // First disable
      await request(app)
        .patch('/admin/projects/STATS1/status')
        .send({ enabled: false });

      // Then enable
      const response = await request(app)
        .patch('/admin/projects/STATS1/status')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled', true);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .patch('/admin/projects/NOEXIST/status')
        .send({ enabled: false });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Project not found');
    });
  });

  describe('Password encryption security', () => {
    it('should not store plain text passwords', async () => {
      const plainPassword = 'SECRETPASS123';
      
      const response = await request(app)
        .post('/admin/projects')
        .send({
          code: 'SECUR1',
          title: 'Security Test',
          description: 'Test Description',
          projectPassword: plainPassword,
          wordLimit: 200
        });

      expect(response.status).toBe(201);
      expect(response.body.project_password_hash).not.toBe(plainPassword);
      expect(response.body.project_password_hash).not.toContain(plainPassword);
      
      // Query database directly to verify
      const dbResult = await pool.query('SELECT project_password_hash FROM projects WHERE code = $1', ['SECUR1']);
      expect(dbResult.rows[0].project_password_hash).not.toBe(plainPassword);
      
      // Clean up
      await pool.query('DELETE FROM projects WHERE code = $1', ['SECUR1']);
    });

    it('should produce different encrypted hashes for same password', async () => {
      const samePassword = 'SAMEPASS999';
      
      // Create two projects with same password
      const response1 = await request(app)
        .post('/admin/projects')
        .send({
          code: 'DIFFS1',
          title: 'Project 1',
          description: 'Test',
          projectPassword: samePassword,
          wordLimit: 200
        });

      const response2 = await request(app)
        .post('/admin/projects')
        .send({
          code: 'DIFFS2',
          title: 'Project 2',
          description: 'Test',
          projectPassword: samePassword,
          wordLimit: 200
        });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      
      // Encrypted hashes should be different (due to random IV)
      expect(response1.body.project_password_hash).not.toBe(response2.body.project_password_hash);
      
      // But both should decrypt to same value
      const decrypted1 = decryptPassword(response1.body.project_password_hash);
      const decrypted2 = decryptPassword(response2.body.project_password_hash);
      expect(decrypted1).toBe(samePassword);
      expect(decrypted2).toBe(samePassword);
      
      // Clean up
      await pool.query('DELETE FROM projects WHERE code IN ($1, $2)', ['DIFFS1', 'DIFFS2']);
    });
  });
});
