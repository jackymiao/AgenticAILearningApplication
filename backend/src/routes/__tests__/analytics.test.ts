import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import adminRouter from '../admin.js';
import publicRouter from '../public.js';
import pool from '../../db/index.js';
import { encryptPassword } from '../../utils/crypto.js';

const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const PROJECT_CODE = 'ANLYT1';

const mockAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  req.session = { adminId: ADMIN_ID, isSuperAdmin: true } as any;
  next();
};

describe('Analytics Data Retrieval', () => {
  let adminApp: Express;
  let publicApp: Express;

  beforeAll(async () => {
    adminApp = express();
    adminApp.use(express.json());
    adminApp.use((req, _res, next) => { req.session = {} as any; next(); });
    adminApp.use('/admin', mockAdminAuth);
    adminApp.use('/admin', adminRouter);

    publicApp = express();
    publicApp.use(express.json());
    publicApp.use((req, _res, next) => {
      // Provide a stable sessionID so editor-events can use it
      (req as any).sessionID = 'test-session-id';
      next();
    });
    publicApp.use('/public', publicRouter);

    // Seed: project
    const hash = encryptPassword('PASS01');
    await pool.query(
      `INSERT INTO projects (code, title, description, enabled, project_password_hash, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE SET enabled = $4, project_password_hash = $5`,
      [PROJECT_CODE, 'Analytics Test Project', 'Desc', true, hash, ADMIN_ID]
    );

    // Seed: player state (needed by attacks JOIN)
    await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_code, user_name_norm) DO UPDATE SET review_tokens = $4`,
      [PROJECT_CODE, 'Alice Smith', 'alice smith', 3, 1, 1]
    );
    await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (project_code, user_name_norm) DO UPDATE SET review_tokens = $4`,
      [PROJECT_CODE, 'Bob Jones', 'bob jones', 2, 0, 0]
    );

    // Seed: editor sessions
    await pool.query(
      `INSERT INTO editor_sessions (project_code, user_name_norm, session_id, event_type, duration_ms, essay_length, current_attempt_number, timestamp)
       VALUES
         ($1, 'alice smith', 'sess-a1', 'focus',  NULL, 50,  1, NOW() - INTERVAL '10 minutes'),
         ($1, 'alice smith', 'sess-a2', 'blur',   30000, 120, 1, NOW() - INTERVAL '9 minutes'),
         ($1, 'bob jones',   'sess-b1', 'focus',  NULL, 80,  1, NOW() - INTERVAL '5 minutes'),
         ($1, 'bob jones',   'sess-b2', 'blur',   45000, 200, 1, NOW() - INTERVAL '4 minutes')`,
      [PROJECT_CODE]
    );

    // Seed: attacks
    await pool.query(
      `INSERT INTO attacks (project_code, attacker_name, attacker_name_norm, target_name, target_name_norm, status, shield_used, expires_at)
       VALUES
         ($1, 'Alice Smith', 'alice smith', 'Bob Jones',   'bob jones',   'succeeded', false, NOW() + INTERVAL '5 minutes'),
         ($1, 'Bob Jones',   'bob jones',   'Alice Smith', 'alice smith', 'defended',  true,  NOW() + INTERVAL '5 minutes')`,
      [PROJECT_CODE]
    );

    // Seed: review_attempts (draft snapshots + task events)
    await pool.query(
      `INSERT INTO review_attempts (project_code, user_name, user_name_norm, category, attempt_number, essay_snapshot, status, score)
       VALUES
         ($1, 'Alice Smith', 'alice smith', 'content',   1, 'Draft one', 'success', 75),
         ($1, 'Alice Smith', 'alice smith', 'structure', 1, 'Draft one', 'success', 80),
         ($1, 'Bob Jones',   'bob jones',   'content',   1, 'Bob draft', 'success', 60)`,
      [PROJECT_CODE]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM editor_sessions   WHERE project_code = $1', [PROJECT_CODE]);
    await pool.query('DELETE FROM attacks           WHERE project_code = $1', [PROJECT_CODE]);
    await pool.query('DELETE FROM review_attempts   WHERE project_code = $1', [PROJECT_CODE]);
    await pool.query('DELETE FROM player_state      WHERE project_code = $1', [PROJECT_CODE]);
    await pool.query('DELETE FROM projects          WHERE code = $1',        [PROJECT_CODE]);
    await pool.end();
  });

  // ─── Time-on-Task ──────────────────────────────────────────────────────────

  describe('GET /admin/projects/:code/analytics/time-on-task', () => {
    it('returns 200 with summary, byAttempt and events arrays', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/time-on-task`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('byAttempt');
      expect(res.body).toHaveProperty('events');
      expect(Array.isArray(res.body.summary)).toBe(true);
      expect(Array.isArray(res.body.byAttempt)).toBe(true);
      expect(Array.isArray(res.body.events)).toBe(true);
    });

    it('summary has correct keys per student', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/time-on-task`);
      const alice = res.body.summary.find((s: any) => s.user_name_norm === 'alice smith');
      expect(alice).toBeDefined();
      expect(alice).toHaveProperty('total_focus_sessions');
      expect(alice).toHaveProperty('total_time_ms');
      expect(alice).toHaveProperty('total_time_minutes');
    });

    it('summary totals match seeded blur events', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/time-on-task`);
      const alice = res.body.summary.find((s: any) => s.user_name_norm === 'alice smith');
      expect(Number(alice.total_focus_sessions)).toBe(1);
      expect(Number(alice.total_time_ms)).toBe(30000);

      const bob = res.body.summary.find((s: any) => s.user_name_norm === 'bob jones');
      expect(Number(bob.total_focus_sessions)).toBe(1);
      expect(Number(bob.total_time_ms)).toBe(45000);
    });

    it('byAttempt includes attempt_number and time_minutes', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/time-on-task`);
      expect(res.body.byAttempt.length).toBeGreaterThan(0);
      const row = res.body.byAttempt[0];
      expect(row).toHaveProperty('current_attempt_number');
      expect(row).toHaveProperty('time_minutes');
    });

    it('events contains 4 rows (focus+blur for 2 students)', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/time-on-task`);
      expect(res.body.events.length).toBe(4);
    });

    it('returns 404 for unknown project', async () => {
      const res = await request(adminApp).get('/admin/projects/XXXXXX/analytics/time-on-task');
      expect(res.status).toBe(404);
    });

    it('works with lowercase project code in URL', async () => {
      const lower = PROJECT_CODE.toLowerCase();
      const res = await request(adminApp).get(`/admin/projects/${lower}/analytics/time-on-task`);
      expect(res.status).toBe(200);
    });
  });

  // ─── Game Events ───────────────────────────────────────────────────────────

  describe('GET /admin/projects/:code/analytics/game-events', () => {
    it('returns 200 with attacks, playerStats and shieldUsage', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/game-events`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.attacks)).toBe(true);
      expect(Array.isArray(res.body.playerStats)).toBe(true);
      expect(Array.isArray(res.body.shieldUsage)).toBe(true);
    });

    it('attacks contains seeded records with correct fields', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/game-events`);
      expect(res.body.attacks.length).toBe(2);
      const attack = res.body.attacks[0];
      expect(attack).toHaveProperty('attack_id');
      expect(attack).toHaveProperty('attacker_name_norm');
      expect(attack).toHaveProperty('target_name_norm');
      expect(attack).toHaveProperty('status');
      expect(attack).toHaveProperty('shield_used');
      expect(attack).toHaveProperty('remaining_passes');
    });

    it('playerStats has steal counts per player', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/game-events`);
      const alice = res.body.playerStats.find((p: any) => p.attacker_name_norm === 'alice smith');
      expect(alice).toBeDefined();
      expect(Number(alice.steal_success_count)).toBe(1);
      expect(Number(alice.steal_fail_count)).toBe(0);
    });

    it('shieldUsage reflects defended attack', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/game-events`);
      const bob = res.body.shieldUsage.find((s: any) => s.target_name_norm === 'alice smith');
      expect(bob).toBeDefined();
      expect(Number(bob.shields_used)).toBe(1);
    });

    it('returns 404 for unknown project', async () => {
      const res = await request(adminApp).get('/admin/projects/XXXXXX/analytics/game-events');
      expect(res.status).toBe(404);
    });
  });

  // ─── Review Attempts ───────────────────────────────────────────────────────

  describe('GET /admin/projects/:code/analytics/review-attempts', () => {
    it('returns 200 with array of review attempt rows', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/review-attempts`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
    });

    it('each row has expected fields', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/review-attempts`);
      const row = res.body[0];
      expect(row).toHaveProperty('user_name');
      expect(row).toHaveProperty('user_name_norm');
      expect(row).toHaveProperty('attempt_number');
      expect(row).toHaveProperty('category');
      expect(row).toHaveProperty('status');
      expect(row).toHaveProperty('score');
      expect(row).toHaveProperty('essay_snapshot');
      expect(row).toHaveProperty('created_at');
    });

    it('includes draft snapshots (essay_snapshot is not null)', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/review-attempts`);
      res.body.forEach((row: any) => {
        expect(row.essay_snapshot).not.toBeNull();
      });
    });

    it('returns 404 for unknown project', async () => {
      const res = await request(adminApp).get('/admin/projects/XXXXXX/analytics/review-attempts');
      expect(res.status).toBe(404);
    });
  });

  // ─── Comprehensive Export ──────────────────────────────────────────────────

  describe('GET /admin/projects/:code/analytics/export', () => {
    it('returns 200 with all four data type arrays', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/export`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('project');
      expect(res.body).toHaveProperty('draftSnapshots');
      expect(res.body).toHaveProperty('editorSessions');
      expect(res.body).toHaveProperty('gameEvents');
      expect(res.body).toHaveProperty('finalSubmissions');
    });

    it('project field contains code and title', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/export`);
      expect(res.body.project).toHaveProperty('code', PROJECT_CODE);
      expect(res.body.project).toHaveProperty('title', 'Analytics Test Project');
    });

    it('draftSnapshots has 3 seeded attempts', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/export`);
      expect(res.body.draftSnapshots.length).toBe(3);
    });

    it('editorSessions has 4 seeded events', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/export`);
      expect(res.body.editorSessions.length).toBe(4);
    });

    it('gameEvents has 2 seeded attacks', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/export`);
      expect(res.body.gameEvents.length).toBe(2);
    });

    it('all draftSnapshots have event_category = draft_snapshot', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/export`);
      res.body.draftSnapshots.forEach((r: any) => {
        expect(r.event_category).toBe('draft_snapshot');
      });
    });

    it('all editorSessions have event_category = editor_session', async () => {
      const res = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/export`);
      res.body.editorSessions.forEach((r: any) => {
        expect(r.event_category).toBe('editor_session');
      });
    });

    it('returns 404 for unknown project', async () => {
      const res = await request(adminApp).get('/admin/projects/XXXXXX/analytics/export');
      expect(res.status).toBe(404);
    });
  });

  // ─── Editor Events Bug Fixes (public route) ────────────────────────────────

  describe('POST /public/projects/:code/editor-events (bug fixes)', () => {
    it('accepts valid focus event', async () => {
      const res = await request(publicApp)
        .post(`/public/projects/${PROJECT_CODE}/editor-events`)
        .send({ userName: 'Alice Smith', eventType: 'focus', essay_length: 100, attempt_number: 1 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('accepts valid blur event with duration', async () => {
      const res = await request(publicApp)
        .post(`/public/projects/${PROJECT_CODE}/editor-events`)
        .send({ userName: 'Alice Smith', eventType: 'blur', duration_ms: 15000, essay_length: 150, attempt_number: 1 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('rejects invalid eventType (not focus or blur)', async () => {
      const res = await request(publicApp)
        .post(`/public/projects/${PROJECT_CODE}/editor-events`)
        .send({ userName: 'Alice Smith', eventType: 'click', essay_length: 100, attempt_number: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("eventType must be 'focus' or 'blur'");
    });

    it('rejects missing userName', async () => {
      const res = await request(publicApp)
        .post(`/public/projects/${PROJECT_CODE}/editor-events`)
        .send({ eventType: 'focus' });
      expect(res.status).toBe(400);
    });

    it('rejects missing eventType', async () => {
      const res = await request(publicApp)
        .post(`/public/projects/${PROJECT_CODE}/editor-events`)
        .send({ userName: 'Alice Smith' });
      expect(res.status).toBe(400);
    });

    it('normalizes lowercase project code in URL (bug fix)', async () => {
      const lower = PROJECT_CODE.toLowerCase();
      const res = await request(publicApp)
        .post(`/public/projects/${lower}/editor-events`)
        .send({ userName: 'Alice Smith', eventType: 'focus', essay_length: 50, attempt_number: 1 });
      // Should succeed — stored with normalized (uppercase) code matching FK
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('stored events are retrievable via analytics endpoint after insertion', async () => {
      // Insert a new event via public route
      await request(publicApp)
        .post(`/public/projects/${PROJECT_CODE}/editor-events`)
        .send({ userName: 'Bob Jones', eventType: 'blur', duration_ms: 9999, essay_length: 300, attempt_number: 2 });

      // Verify it appears in the analytics endpoint
      const analyticsRes = await request(adminApp).get(`/admin/projects/${PROJECT_CODE}/analytics/time-on-task`);
      expect(analyticsRes.status).toBe(200);
      const bob = analyticsRes.body.summary.find((s: any) => s.user_name_norm === 'bob jones');
      expect(bob).toBeDefined();
      // Should now have at least 2 blur sessions (1 seeded + 1 just inserted)
      expect(Number(bob.total_focus_sessions)).toBeGreaterThanOrEqual(2);
    });
  });
});
