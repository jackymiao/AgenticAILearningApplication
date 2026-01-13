import express from 'express';
import pool, { normalizeProjectCode } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply admin auth to all routes
router.use(requireAdmin);

// Get all projects
router.get('/projects', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.code, p.title, p.description, p.created_at, p.updated_at,
              a.username as created_by
       FROM projects p
       LEFT JOIN admin_users a ON p.created_by_admin_id = a.id
       ORDER BY p.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/projects/:code', async (req, res) => {
  try {
    const code = normalizeProjectCode(req.params.code);
    
    const result = await pool.query(
      `SELECT * FROM projects WHERE code = $1`,
      [code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/projects', async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      youtubeUrl,
      wordLimit,
      attemptLimitPerCategory,
      agentMode,
      agentAId,
      agentBGrammarId,
      agentBStructureId,
      agentBStyleId,
      agentBContentId
    } = req.body;
    
    // Validate required fields
    if (!code || !title || !description || !agentMode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate code format
    if (!/^[A-Z0-9]{6}$/i.test(code)) {
      return res.status(400).json({ error: 'Project code must be exactly 6 alphanumeric characters' });
    }
    
    const codeNorm = normalizeProjectCode(code);
    
    // Validate agent configuration
    if (agentMode === 'agent_a' && !agentAId) {
      return res.status(400).json({ error: 'Agent A ID is required for Agent A mode' });
    }
    
    if (agentMode === 'agent_b') {
      if (!agentBGrammarId || !agentBStructureId || !agentBStyleId || !agentBContentId) {
        return res.status(400).json({ error: 'All four agent IDs are required for Agent B mode' });
      }
    }
    
    const result = await pool.query(
      `INSERT INTO projects (
        code, title, description, youtube_url, word_limit, attempt_limit_per_category,
        agent_mode, agent_a_id, agent_b_grammar_id, agent_b_structure_id, 
        agent_b_style_id, agent_b_content_id, created_by_admin_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        codeNorm,
        title,
        description,
        youtubeUrl || null,
        wordLimit || 150,
        attemptLimitPerCategory || 3,
        agentMode,
        agentAId || null,
        agentBGrammarId || null,
        agentBStructureId || null,
        agentBStyleId || null,
        agentBContentId || null,
        req.session.adminId
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Project code already exists' });
    }
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/projects/:code', async (req, res) => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const {
      title,
      description,
      youtubeUrl,
      wordLimit,
      attemptLimitPerCategory,
      agentMode,
      agentAId,
      agentBGrammarId,
      agentBStructureId,
      agentBStyleId,
      agentBContentId
    } = req.body;
    
    // Validate agent configuration
    if (agentMode === 'agent_a' && !agentAId) {
      return res.status(400).json({ error: 'Agent A ID is required for Agent A mode' });
    }
    
    if (agentMode === 'agent_b') {
      if (!agentBGrammarId || !agentBStructureId || !agentBStyleId || !agentBContentId) {
        return res.status(400).json({ error: 'All four agent IDs are required for Agent B mode' });
      }
    }
    
    const result = await pool.query(
      `UPDATE projects
       SET title = $2,
           description = $3,
           youtube_url = $4,
           word_limit = $5,
           attempt_limit_per_category = $6,
           agent_mode = $7,
           agent_a_id = $8,
           agent_b_grammar_id = $9,
           agent_b_structure_id = $10,
           agent_b_style_id = $11,
           agent_b_content_id = $12,
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
        agentMode,
        agentAId || null,
        agentBGrammarId || null,
        agentBStructureId || null,
        agentBStyleId || null,
        agentBContentId || null
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Get submissions for a project
router.get('/projects/:code/submissions', async (req, res) => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const sort = req.query.sort || 'newest';
    
    let orderBy;
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
router.get('/submissions/:submissionId', async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    
    // Get submission
    const submissionResult = await pool.query(
      `SELECT * FROM submissions WHERE id = $1`,
      [submissionId]
    );
    
    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = submissionResult.rows[0];
    
    // Get review attempts grouped by category
    const reviewsResult = await pool.query(
      `SELECT id, category, attempt_number, status, score, result_json, 
              error_message, created_at, essay_snapshot
       FROM review_attempts
       WHERE submission_id = $1 OR 
             (project_code = $2 AND user_name_norm = $3)
       ORDER BY category, attempt_number`,
      [submissionId, submission.project_code, submission.user_name_norm]
    );
    
    // Group by category
    const reviewHistory = {
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
router.patch('/submissions/:submissionId/grading', async (req, res) => {
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
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update grading error:', error);
    res.status(500).json({ error: 'Failed to update grading' });
  }
});

export default router;
