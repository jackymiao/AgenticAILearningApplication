import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import pool, { normalizeProjectCode, normalizeStudentId, normalizeUserName } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import type { Project, Submission, ReviewAttempt, ReviewCategory, ProjectFeedback, ProjectStudent } from '../types.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const allowedRosterExtensions = new Set(['.csv', '.xlsx', '.xls']);

function getNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'XX';
  const first = parts[0][0] || 'X';
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][0]) || 'X';
  return `${first}${last}`.toUpperCase();
}

function generateStudentId(name: string, usedIds: Set<string>): string {
  const initials = getNameInitials(name);
  let studentId = '';
  let attempts = 0;
  do {
    const digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    studentId = `${initials}${digits}`;
    attempts += 1;
  } while (usedIds.has(studentId) && attempts < 10000);
  usedIds.add(studentId);
  return studentId;
}

function validateHeaderKeys(keys: string[]): string | null {
  if (keys.length === 0) return 'Missing header row';
  const normalized = keys.map(k => k.trim().toLowerCase()).filter(Boolean);
  if (normalized.length !== 1 || normalized[0] !== 'name') {
    return 'Invalid header. Only a single "name" column is allowed.';
  }
  return null;
}

// Apply admin auth to all routes
router.use(requireAdmin);

// Get all projects (filtered by admin role)
router.get('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.session.isSuperAdmin || false;
    const adminId = req.session.adminId;
    
    let query, params;
    
    if (isSuperAdmin) {
      // Super admin sees all projects
      query = `SELECT p.code, p.title, p.description, p.enabled, p.created_at, p.updated_at,
                      a.username as created_by
               FROM projects p
               LEFT JOIN admin_users a ON p.created_by_admin_id = a.id
               ORDER BY p.created_at DESC`;
      params = [];
    } else {
      // Regular admin sees only their own projects
      query = `SELECT p.code, p.title, p.description, p.enabled, p.created_at, p.updated_at,
                      a.username as created_by
               FROM projects p
               LEFT JOIN admin_users a ON p.created_by_admin_id = a.id
               WHERE p.created_by_admin_id = $1
               ORDER BY p.created_at DESC`;
      params = [adminId];
    }
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/projects/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    
    const result = await pool.query<Project>(
      `SELECT * FROM projects WHERE code = $1`,
      [code]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      title,
      description,
      youtubeUrl,
      wordLimit,
      attemptLimitPerCategory,
      reviewCooldownSeconds,
      enableFeedback,
      enabled
    } = req.body;
    
    // Validate required fields
    if (!code || !title || !description) {
      console.error('[CREATE PROJECT] Missing required fields');
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    // Validate code format
    if (!/^[A-Z0-9]{6}$/i.test(code)) {
      console.error('[CREATE PROJECT] Invalid code format:', code);
      res.status(400).json({ error: 'Project code must be exactly 6 alphanumeric characters' });
      return;
    }
    
    const codeNorm = normalizeProjectCode(code);
    
    const result = await pool.query<Project>(
      `INSERT INTO projects (
        code, title, description, youtube_url, word_limit, attempt_limit_per_category,
        review_cooldown_seconds, enable_feedback, enabled, created_by_admin_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        codeNorm,
        title,
        description,
        youtubeUrl || null,
        Number(wordLimit) || 150,
        Number(attemptLimitPerCategory) || 3,
        Number(reviewCooldownSeconds) || 120,
        enableFeedback === true || enableFeedback === 'true',
        enabled !== false && enabled !== 'false',
        req.session.adminId
      ]
    );
    
    if (process.env.DEBUG === '1') {
      console.log('[CREATE PROJECT] Success:', result.rows[0]);
    }
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('[CREATE PROJECT] Error:', error);
    console.error('[CREATE PROJECT] Error code:', error.code);
    console.error('[CREATE PROJECT] Error detail:', error.detail);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Project code already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

// Update project
router.put('/projects/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const {
      title,
      description,
      youtubeUrl,
      wordLimit,
      attemptLimitPerCategory,
      reviewCooldownSeconds,
      enableFeedback
    } = req.body;
    
    const result = await pool.query<Project>(
      `UPDATE projects
       SET title = $2,
           description = $3,
           youtube_url = $4,
           word_limit = $5,
           attempt_limit_per_category = $6,
           review_cooldown_seconds = $7,
           enable_feedback = $8,
           updated_at = NOW()
       WHERE code = $1
       RETURNING *`,
      [
        code,
        title,
        description,
        youtubeUrl || null,
        wordLimit,
        attemptLimitPerCategory,
        reviewCooldownSeconds,
        enableFeedback === true || enableFeedback === 'true'
      ]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Update project enabled status
router.patch('/projects/:code/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { enabled } = req.body;

    const result = await pool.query<Project>(
      `UPDATE projects
       SET enabled = $2,
           updated_at = NOW()
       WHERE code = $1
       RETURNING *`,
      [code, enabled === true || enabled === 'true']
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ error: 'Failed to update project status' });
  }
});

// Get student roster for a project
router.get('/projects/:code/students', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const result = await pool.query<ProjectStudent>(
      `SELECT id, project_code, student_name, student_id, created_at
       FROM project_students
       WHERE project_code = $1
       ORDER BY created_at ASC`,
      [code]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Import student roster for a project (replaces existing list)
router.post('/projects/:code/students/import', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    if (!req.file) {
      res.status(400).json({ error: 'Roster file is required' });
      return;
    }

    const extension = path.extname(req.file.originalname || '').toLowerCase();
    if (!allowedRosterExtensions.has(extension)) {
      res.status(400).json({ error: 'Invalid file type. Only .csv, .xlsx, or .xls are supported.' });
      return;
    }

    let names: string[] = [];

    if (extension === '.csv') {
      const csvText = req.file.buffer.toString('utf8');
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true
      });

      const headerError = validateHeaderKeys(parsed.meta.fields || []);
      if (headerError) {
        res.status(400).json({ error: headerError });
        return;
      }

      const nameKey = (parsed.meta.fields || []).find(field => field.trim().toLowerCase() === 'name') || 'name';

      names = (parsed.data || [])
        .map(row => row[nameKey] || '')
        .map(value => value.trim())
        .filter(Boolean);
    } else {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { defval: '' });

      const headerKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
      const headerError = validateHeaderKeys(headerKeys);
      if (headerError) {
        res.status(400).json({ error: headerError });
        return;
      }

      const nameKey = headerKeys.find(key => key.trim().toLowerCase() === 'name') || 'name';
      names = rows
        .map(row => String(row[nameKey] || '').trim())
        .filter(Boolean);
    }

    if (names.length === 0) {
      res.status(400).json({ error: 'No student names found in the file' });
      return;
    }

    const usedIds = new Set<string>();
    const students = names.map(name => {
      const studentId = generateStudentId(name, usedIds);
      return {
        student_name: name,
        student_name_norm: normalizeUserName(name),
        student_id: studentId,
        student_id_norm: normalizeStudentId(studentId)
      };
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM project_students WHERE project_code = $1', [code]);

      const values: string[] = [];
      const params: any[] = [];
      students.forEach((student, index) => {
        const offset = index * 5;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
        params.push(
          code,
          student.student_name,
          student.student_name_norm,
          student.student_id,
          student.student_id_norm
        );
      });

      await client.query(
        `INSERT INTO project_students (project_code, student_name, student_name_norm, student_id, student_id_norm)
         VALUES ${values.join(', ')}`,
        params
      );

      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    res.json({
      count: students.length,
      students: students.map(student => ({
        student_name: student.student_name,
        student_id: student.student_id
      }))
    });
  } catch (error) {
    console.error('Import students error:', error);
    res.status(500).json({ error: 'Failed to import students' });
  }
});

// Get submissions for a project
router.get('/projects/:code/submissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const sort = req.query.sort as string || 'newest';
    
    let orderBy: string;
    switch (sort) {
      case 'high-to-low':
        orderBy = 'admin_score DESC NULLS LAST';
        break;
      case 'low-to-high':
        orderBy = 'admin_score ASC NULLS LAST';
        break;
      case 'unscored':
        orderBy = 'CASE WHEN admin_score IS NULL THEN 0 ELSE 1 END, submitted_at DESC';
        break;
      case 'oldest':
        orderBy = 'submitted_at ASC';
        break;
      case 'newest':
      default:
        orderBy = 'submitted_at DESC';
    }
    
    const result = await pool.query(
      `SELECT id, user_name, 
              CASE 
                WHEN LENGTH(essay) > 100 THEN SUBSTRING(essay, 1, 100) || '...'
                ELSE essay
              END as essay_preview,
              admin_score,
              submitted_at
       FROM submissions
       WHERE project_code = $1
       ORDER BY ${orderBy}`,
      [code]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Get single submission with review attempts
router.get('/submissions/:submissionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.submissionId;
    
    // Get submission
    const submissionResult = await pool.query<Submission>(
      `SELECT * FROM submissions WHERE id = $1`,
      [submissionId]
    );
    
    if (submissionResult.rows.length === 0) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    
    const submission = submissionResult.rows[0];
    
    // Get review attempts grouped by category
    const reviewsResult = await pool.query<ReviewAttempt>(
      `SELECT id, category, attempt_number, status, score, result_json, 
              error_message, created_at, essay_snapshot
       FROM review_attempts
       WHERE submission_id = $1 OR 
             (project_code = $2 AND user_name_norm = $3)
       ORDER BY category, attempt_number`,
      [submissionId, submission.project_code, submission.user_name_norm]
    );
    
    // Group by category
    const reviewHistory: Record<ReviewCategory, ReviewAttempt[]> = {
      content: [],
      structure: [],
      mechanics: []
    };
    
    reviewsResult.rows.forEach(review => {
      if (reviewHistory[review.category]) {
        reviewHistory[review.category].push(review);
      }
    });
    
    res.json({
      ...submission,
      reviewHistory
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// Update submission grading
router.patch('/submissions/:submissionId/grading', async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.submissionId;
    const { adminScore, adminFeedback } = req.body;
    
    const result = await pool.query(
      `UPDATE submissions
       SET admin_score = $2,
           admin_feedback = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, admin_score, admin_feedback, updated_at`,
      [submissionId, adminScore, adminFeedback || '']
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update grading error:', error);
    res.status(500).json({ error: 'Failed to update grading' });
  }
});

// Delete projects (bulk delete)
router.delete('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const { codes } = req.body;
    
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      res.status(400).json({ error: 'Project codes array is required' });
      return;
    }
    
    // Normalize all codes
    const normalizedCodes = codes.map(code => normalizeProjectCode(code));
    
    // Check if user is super admin or owns the projects
    const isSuperAdmin = req.session.isSuperAdmin || false;
    let query;
    let params;
    
    if (isSuperAdmin) {
      // Super admin can delete any projects
      query = 'DELETE FROM projects WHERE code = ANY($1::char(6)[])';
      params = [normalizedCodes];
    } else {
      // Regular admin can only delete their own projects
      query = 'DELETE FROM projects WHERE code = ANY($1::char(6)[]) AND created_by_admin_id = $2';
      params = [normalizedCodes, req.session.adminId];
    }
    
    const result = await pool.query(query, params);
    
    res.json({ 
      deleted: result.rowCount || 0,
      message: `Successfully deleted ${result.rowCount || 0} project(s)`
    });
  } catch (error) {
    console.error('Delete projects error:', error);
    res.status(500).json({ error: 'Failed to delete projects' });
  }
});

// Get project feedback (admin only)
router.get('/projects/:code/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const sortBy = (req.query.sort as string) || 'newest';

    // Check if project exists and has feedback enabled
    const projectResult = await pool.query<Project>(
      'SELECT enable_feedback FROM projects WHERE code = $1',
      [code]
    );

    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!projectResult.rows[0].enable_feedback) {
      res.status(403).json({ error: 'Feedback is not enabled for this project' });
      return;
    }

    // Determine sort order
    let orderBy = 'submitted_at DESC';
    switch (sortBy) {
      case 'content-high':
        orderBy = 'content_rating DESC, submitted_at DESC';
        break;
      case 'content-low':
        orderBy = 'content_rating ASC, submitted_at DESC';
        break;
      case 'system-high':
        orderBy = 'system_design_rating DESC, submitted_at DESC';
        break;
      case 'system-low':
        orderBy = 'system_design_rating ASC, submitted_at DESC';
        break;
      case 'response-high':
        orderBy = 'response_quality_rating DESC, submitted_at DESC';
        break;
      case 'response-low':
        orderBy = 'response_quality_rating ASC, submitted_at DESC';
        break;
      case 'oldest':
        orderBy = 'submitted_at ASC';
        break;
      default:
        orderBy = 'submitted_at DESC';
    }

    // Get individual feedback
    const feedbackResult = await pool.query<ProjectFeedback>(
      `SELECT id, project_code, content_rating, system_design_rating, 
              response_quality_rating, comment, submitted_at
       FROM project_feedback
       WHERE project_code = $1
       ORDER BY ${orderBy}`,
      [code]
    );

    // Calculate aggregate statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*)::int as total_responses,
        AVG(content_rating)::numeric(3,2) as avg_content_rating,
        AVG(system_design_rating)::numeric(3,2) as avg_system_design_rating,
        AVG(response_quality_rating)::numeric(3,2) as avg_response_quality_rating
      FROM project_feedback
      WHERE project_code = $1
    `, [code]);

    const stats = statsResult.rows[0];

    res.json({
      aggregate: {
        totalResponses: parseInt(stats.total_responses) || 0,
        avgContentRating: parseFloat(stats.avg_content_rating) || 0,
        avgSystemDesignRating: parseFloat(stats.avg_system_design_rating) || 0,
        avgResponseQualityRating: parseFloat(stats.avg_response_quality_rating) || 0
      },
      feedback: feedbackResult.rows
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;
