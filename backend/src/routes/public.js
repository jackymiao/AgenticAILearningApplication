import express from 'express';
import pool, { normalizeProjectCode, normalizeUserName } from '../db/index.js';
import { callAgent, selectAgentId } from '../services/agentBuilder.js';

const router = express.Router();

// Get project information
router.get('/projects/:code', async (req, res) => {
  try {
    const code = normalizeProjectCode(req.params.code);
    
    const result = await pool.query(
      `SELECT code, title, description, youtube_url, word_limit, attempt_limit_per_category
       FROM projects
       WHERE code = $1`,
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

// Get user state for a project
router.get('/projects/:code/user-state', async (req, res) => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const userName = req.query.userName;
    
    if (!userName) {
      return res.status(400).json({ error: 'userName is required' });
    }
    
    const userNameNorm = normalizeUserName(userName);
    
    // Check if user has already submitted
    const submissionResult = await pool.query(
      `SELECT id FROM submissions
       WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    const alreadySubmitted = submissionResult.rows.length > 0;
    
    // Get project limits
    const projectResult = await pool.query(
      `SELECT attempt_limit_per_category FROM projects WHERE code = $1`,
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const limit = projectResult.rows[0].attempt_limit_per_category;
    
    // Get attempt counts per category
    const attemptsResult = await pool.query(
      `SELECT category, COUNT(*)::int as count
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2
       GROUP BY category`,
      [code, userNameNorm]
    );
    
    const attemptCounts = {};
    attemptsResult.rows.forEach(row => {
      attemptCounts[row.category] = row.count;
    });
    
    // Calculate remaining attempts
    const categories = ['grammar', 'structure', 'style', 'content'];
    const attemptsRemaining = {};
    categories.forEach(cat => {
      attemptsRemaining[cat] = limit - (attemptCounts[cat] || 0);
    });
    
    // Get review history grouped by category
    const historyResult = await pool.query(
      `SELECT id, category, attempt_number, status, score, result_json, error_message, created_at
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2
       ORDER BY category, attempt_number`,
      [code, userNameNorm]
    );
    
    const reviewHistory = {};
    categories.forEach(cat => {
      reviewHistory[cat] = historyResult.rows.filter(row => row.category === cat);
    });
    
    res.json({
      alreadySubmitted,
      attemptsRemaining,
      reviewHistory
    });
  } catch (error) {
    console.error('Get user state error:', error);
    res.status(500).json({ error: 'Failed to fetch user state' });
  }
});

// Submit a review request
router.post('/projects/:code/reviews', async (req, res) => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName, essay, category } = req.body;
    
    if (!userName || !essay || !category) {
      return res.status(400).json({ error: 'userName, essay, and category are required' });
    }
    
    if (!['grammar', 'structure', 'style', 'content'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    const userNameNorm = normalizeUserName(userName);
    
    // Check if already submitted
    const submissionCheck = await pool.query(
      `SELECT id FROM submissions WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    if (submissionCheck.rows.length > 0) {
      return res.status(403).json({ error: 'You have already submitted your final essay' });
    }
    
    // Get project configuration
    const projectResult = await pool.query(
      `SELECT * FROM projects WHERE code = $1`,
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectResult.rows[0];
    
    // Count existing attempts for this category
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as count
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2 AND category = $3`,
      [code, userNameNorm, category]
    );
    
    const attemptCount = countResult.rows[0].count;
    
    if (attemptCount >= project.attempt_limit_per_category) {
      return res.status(403).json({ 
        error: `You have reached the attempt limit for ${category} reviews`,
        attemptsRemaining: 0
      });
    }
    
    const attemptNumber = attemptCount + 1;
    
    // Select the correct agent ID
    const agentId = selectAgentId(project, category);
    
    if (!agentId) {
      return res.status(500).json({ error: 'Agent not configured for this project' });
    }
    
    // Call the agent
    const agentResult = await callAgent(agentId, {
      userName,
      essay,
      category,
      attemptNumber,
      projectCode: code,
      wordLimit: project.word_limit
    });
    
    // Save the review attempt
    const insertResult = await pool.query(
      `INSERT INTO review_attempts 
       (project_code, user_name, user_name_norm, category, attempt_number, 
        essay_snapshot, status, score, result_json, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, status, score, result_json, error_message, created_at`,
      [
        code,
        userName,
        userNameNorm,
        category,
        attemptNumber,
        essay,
        agentResult.status,
        agentResult.score,
        agentResult.result_json ? JSON.stringify(agentResult.result_json) : null,
        agentResult.error_message || null
      ]
    );
    
    const savedAttempt = insertResult.rows[0];
    const attemptsRemaining = project.attempt_limit_per_category - attemptNumber;
    
    res.json({
      review: savedAttempt,
      attemptsRemaining
    });
    
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: 'Failed to process review request' });
  }
});

// Submit final essay
router.post('/projects/:code/submissions/final', async (req, res) => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName, essay } = req.body;
    
    if (!userName || !essay) {
      return res.status(400).json({ error: 'userName and essay are required' });
    }
    
    const userNameNorm = normalizeUserName(userName);
    
    // Insert submission (unique constraint will prevent duplicates)
    const result = await pool.query(
      `INSERT INTO submissions (project_code, user_name, user_name_norm, essay)
       VALUES ($1, $2, $3, $4)
       RETURNING id, submitted_at`,
      [code, userName, userNameNorm, essay]
    );
    
    const submission = result.rows[0];
    
    // Optionally link existing review attempts to this submission
    await pool.query(
      `UPDATE review_attempts
       SET submission_id = $1
       WHERE project_code = $2 AND user_name_norm = $3 AND submission_id IS NULL`,
      [submission.id, code, userNameNorm]
    );
    
    res.json({
      success: true,
      submissionId: submission.id,
      submittedAt: submission.submitted_at
    });
    
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'You have already submitted your final essay' });
    }
    console.error('Final submission error:', error);
    res.status(500).json({ error: 'Failed to submit essay' });
  }
});

export default router;
