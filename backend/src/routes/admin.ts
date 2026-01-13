import express, { Request, Response } from 'express';
import pool, { normalizeProjectCode } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import type { Project, Submission, ReviewAttempt, ReviewCategory } from '../types.js';

const router = express.Router();

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
      query = `SELECT p.code, p.title, p.description, p.created_at, p.updated_at,
                      a.username as created_by
               FROM projects p
               LEFT JOIN admin_users a ON p.created_by_admin_id = a.id
               ORDER BY p.created_at DESC`;
      params = [];
    } else {
      // Regular admin sees only their own projects
      query = `SELECT p.code, p.title, p.description, p.created_at, p.updated_at,
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
      agentMode
    } = req.body;
    
    // Validate required fields
    if (!code || !title || !description || !agentMode) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    // Validate code format
    if (!/^[A-Z0-9]{6}$/i.test(code)) {
      res.status(400).json({ error: 'Project code must be exactly 6 alphanumeric characters' });
      return;
    }
    
    // Validate agent mode
    if (!['agent_a', 'agent_b'].includes(agentMode)) {
      res.status(400).json({ error: 'Agent mode must be either agent_a or agent_b' });
      return;
    }
    
    const codeNorm = normalizeProjectCode(code);
    
    const result = await pool.query<Project>(
      `INSERT INTO projects (
        code, title, description, youtube_url, word_limit, attempt_limit_per_category,
        agent_mode, created_by_admin_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        codeNorm,
        title,
        description,
        youtubeUrl || null,
        wordLimit || 150,
        attemptLimitPerCategory || 3,
        agentMode,
        req.session.adminId
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Project code already exists' });
      return;
    }
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
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
      agentMode
    } = req.body;
    
    // Validate agent mode
    if (agentMode && !['agent_a', 'agent_b'].includes(agentMode)) {
      res.status(400).json({ error: 'Agent mode must be either agent_a or agent_b' });
      return;
    }
    
    const result = await pool.query<Project>(
      `UPDATE projects
       SET title = $2,
           description = $3,
           youtube_url = $4,
           word_limit = $5,
           attempt_limit_per_category = $6,
           agent_mode = $7,
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
        agentMode
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
      grammar: [],
      structure: [],
      style: [],
      content: []
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

export default router;
