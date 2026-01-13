import express, { Request, Response } from 'express';
import pool, { normalizeProjectCode, normalizeUserName } from '../db/index.js';
import { callAgent, selectAgentId } from '../services/agentBuilder.js';
import type { Project, ReviewAttempt, ReviewCategory, UserState } from '../types.js';

const router = express.Router();

// Get project information
router.get('/projects/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    
    const result = await pool.query<Project>(
      `SELECT code, title, description, youtube_url, word_limit, attempt_limit_per_category
       FROM projects
       WHERE code = $1`,
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

// Get user state for a project
router.get('/projects/:code/user-state', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const userName = req.query.userName as string;
    
    if (!userName) {
      res.status(400).json({ error: 'userName is required' });
      return;
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
    const projectResult = await pool.query<Pick<Project, 'attempt_limit_per_category'>>(
      `SELECT attempt_limit_per_category FROM projects WHERE code = $1`,
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    const limit = projectResult.rows[0].attempt_limit_per_category;
    
    // Get attempt counts per category
    const attemptsResult = await pool.query<{ category: ReviewCategory; count: number }>(
      `SELECT category, COUNT(*)::int as count
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2
       GROUP BY category`,
      [code, userNameNorm]
    );
    
    const attemptCounts: Partial<Record<ReviewCategory, number>> = {};
    attemptsResult.rows.forEach(row => {
      attemptCounts[row.category] = row.count;
    });
    
    // Calculate remaining attempts
    const categories: ReviewCategory[] = ['grammar', 'structure', 'style', 'content'];
    const attemptsRemaining: Record<ReviewCategory, number> = {} as Record<ReviewCategory, number>;
    categories.forEach(cat => {
      attemptsRemaining[cat] = limit - (attemptCounts[cat] || 0);
    });
    
    // Get review history grouped by category (most recent first)
    const historyResult = await pool.query<ReviewAttempt>(
      `SELECT id, category, attempt_number, status, score, result_json, error_message, created_at
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2
       ORDER BY category, attempt_number DESC`,
      [code, userNameNorm]
    );
    
    const reviewHistory: Record<ReviewCategory, ReviewAttempt[]> = {
      grammar: [],
      structure: [],
      style: [],
      content: []
    };
    
    historyResult.rows.forEach(row => {
      reviewHistory[row.category].push(row);
    });
    
    const userState: UserState = {
      alreadySubmitted,
      attemptsRemaining,
      reviewHistory
    };
    
    res.json(userState);
  } catch (error) {
    console.error('Get user state error:', error);
    res.status(500).json({ error: 'Failed to fetch user state' });
  }
});

// Submit a review request
router.post('/projects/:code/reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName, essay, category } = req.body;
    
    if (!userName || !essay || !category) {
      res.status(400).json({ error: 'userName, essay, and category are required' });
      return;
    }
    
    const validCategories: ReviewCategory[] = ['grammar', 'structure', 'style', 'content'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }
    
    const userNameNorm = normalizeUserName(userName);
    
    // Check if already submitted
    const submissionCheck = await pool.query(
      `SELECT id FROM submissions WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    if (submissionCheck.rows.length > 0) {
      res.status(403).json({ error: 'You have already submitted your final essay' });
      return;
    }
    
    // Get project configuration
    const projectResult = await pool.query<Project>(
      `SELECT * FROM projects WHERE code = $1`,
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    const project = projectResult.rows[0];
    
    // Count existing attempts for this category
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2 AND category = $3`,
      [code, userNameNorm, category]
    );
    
    const attemptCount = countResult.rows[0].count;
    
    if (attemptCount >= project.attempt_limit_per_category) {
      res.status(403).json({ 
        error: `You have reached the attempt limit for ${category} reviews`,
        attemptsRemaining: 0
      });
      return;
    }
    
    const attemptNumber = attemptCount + 1;
    
    // Fetch previous attempt for this category (for context)
    const previousAttemptsResult = await pool.query<ReviewAttempt>(
      `SELECT essay_snapshot, score, result_json
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2 AND category = $3
       ORDER BY attempt_number DESC
       LIMIT 1`,
      [code, userNameNorm, category]
    );
    
    const previousAttempts = previousAttemptsResult.rows;
    
    // Select the correct agent ID
    const agentId = selectAgentId(project, category);
    
    // Call the agent with retry logic
    let agentResult: any;
    const maxRetries = 2;
    let lastError: string | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        agentResult = await callAgent(agentId, {
          userName,
          essay,
          category,
          attemptNumber,
          projectCode: code,
          wordLimit: project.word_limit,
          previousAttempts: previousAttempts
        });
      } catch (error) {
        console.error(`Error calling agent (attempt ${attempt}/${maxRetries}):`, error);
        agentResult = {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error calling agent'
        };
      }
      
      // If successful, break out of retry loop
      if (agentResult.status === 'success') {
        break;
      }
      
      // Store the error message
      lastError = agentResult.error_message || 'Unknown error';
      
      // If this was the last attempt, don't wait
      if (attempt < maxRetries) {
        console.log(`Agent call attempt ${attempt} failed, retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      } else {
        console.log(`Agent call failed after ${maxRetries} attempts`);
      }
    }
    
    // If still failed after retries, use the last error
    if (agentResult.status === 'error') {
      agentResult.error_message = `Failed after ${maxRetries} attempts: ${lastError}`;
    }
    
    // Save the review attempt
    const insertResult = await pool.query<ReviewAttempt>(
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
    
    // Debug: Log what we're sending to frontend
    console.log('Sending to frontend:', JSON.stringify({
      review: {
        ...savedAttempt,
        result_json: savedAttempt.result_json
      },
      attemptsRemaining
    }, null, 2));
    
    res.json({
      review: savedAttempt,
      attemptsRemaining
    });
    
  } catch (error) {
    console.error('Review submission error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Failed to process review request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Submit final essay
router.post('/projects/:code/submissions/final', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName, essay } = req.body;
    
    if (!userName || !essay) {
      res.status(400).json({ error: 'userName and essay are required' });
      return;
    }
    
    const userNameNorm = normalizeUserName(userName);
    
    // Insert submission (unique constraint will prevent duplicates)
    const result = await pool.query<{ id: string; submitted_at: Date }>(
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
    
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'You have already submitted your final essay' });
      return;
    }
    console.error('Final submission error:', error);
    res.status(500).json({ error: 'Failed to submit essay' });
  }
});

export default router;
