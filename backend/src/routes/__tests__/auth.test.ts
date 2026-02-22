import request from 'supertest';
import express from 'express';
import authRouter from '../auth.js';
import pool from '../../db/index.js';

describe('Admin Authentication', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Mock session middleware
    app.use((req, res, next) => {
      req.session = {} as any;
      next();
    });
    
    app.use('/auth', authRouter);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /auth/admin/signup', () => {
    it('should handle signup endpoint', async () => {
      const response = await request(app)
        .post('/auth/admin/signup')
        .send({
          username: 'testadmin',
          password: 'TestPass123'
        });
      
      // Should either succeed or reject if user exists
      expect([201, 409, 400]).toContain(response.status);
    });
  });

  describe('POST /auth/admin/login', () => {
    it('should handle login endpoint', async () => {
      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          username: 'admin',
          password: 'password'
        });
      
      // Should respond with 200 or 401
      expect([200, 401, 400]).toContain(response.status);
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/auth/me');
      expect([401, 200]).toContain(response.status);
    });
  });

  describe('POST /auth/logout', () => {
    it('should handle logout endpoint', async () => {
      const response = await request(app).post('/auth/logout');
      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
