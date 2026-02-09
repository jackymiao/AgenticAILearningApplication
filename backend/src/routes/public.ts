import express, { Request, Response } from 'express';
import pool, { normalizeProjectCode, normalizeUserName } from '../db/index.js';
import { runWorkflow } from '../sdk/reviewSdk.js';
import type { Project, ReviewAttempt, ReviewCategory, UserState } from '../types.js';

const router = express.Router();

// Get project information
router.get('/projects/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    
    const result = await pool.query<Project>(
      `SELECT code, title, description, youtube_url, word_limit, attempt_limit_per_category, enable_feedback
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
    
    // Count total review attempts (global, not per category)
    const attemptsResult = await pool.query<{ count: number }>(
      `SELECT COUNT(DISTINCT attempt_number)::int as count
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    const totalAttempts = attemptsResult.rows[0]?.count || 0;
    const attemptsRemaining = limit - totalAttempts;
    
    // Get review history grouped by category (most recent first)
    const historyResult = await pool.query<ReviewAttempt>(
      `SELECT id, category, attempt_number, status, score, result_json, error_message, created_at
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2
       ORDER BY attempt_number DESC, category`,
      [code, userNameNorm]
    );
    
    const reviewHistory: Record<ReviewCategory, ReviewAttempt[]> = {
      content: [],
      structure: [],
      mechanics: []
    };
    
    historyResult.rows.forEach(row => {
      if (reviewHistory[row.category]) {
        reviewHistory[row.category].push(row);
      }
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

// Submit a review request - now reviews all three categories at once
router.post('/projects/:code/reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName, essay } = req.body;
    
    if (!userName || !essay) {
      res.status(400).json({ error: 'userName and essay are required' });
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
    
    // Check player state and tokens
    const playerResult = await pool.query(
      `SELECT review_tokens, attack_tokens, last_review_at 
       FROM player_state 
       WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    if (playerResult.rows.length === 0) {
      res.status(400).json({ error: 'Player state not initialized' });
      return;
    }
    
    const playerState = playerResult.rows[0];
    
    // Check if has review tokens
    if (playerState.review_tokens < 1) {
      res.status(403).json({ 
        error: 'No review tokens available',
        reviewTokens: 0
      });
      return;
    }
    
    // Get project configuration to read cooldown setting
    const projectResult = await pool.query<Project>(
      `SELECT * FROM projects WHERE code = $1`,
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    const project = projectResult.rows[0];
    
    // Check cooldown (use project-specific setting, fallback to env variable for backwards compatibility)
    if (playerState.last_review_at) {
      const lastReviewTime = new Date(playerState.last_review_at).getTime();
      const now = Date.now();
      const elapsed = now - lastReviewTime;
      // Convert project's cooldown seconds to milliseconds
      const cooldownMs = (project.review_cooldown_seconds || 120) * 1000;
      
      if (elapsed < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
        res.status(429).json({ 
          error: `Please wait ${remaining} seconds before submitting another review`,
          cooldownRemaining: cooldownMs - elapsed
        });
        return;
      }
    }
    
    // Count total review attempts (not per category anymore)
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(DISTINCT attempt_number)::int as count
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    const attemptCount = countResult.rows[0].count;
    
    if (attemptCount >= project.attempt_limit_per_category) {
      res.status(403).json({ 
        error: `You have reached the attempt limit for reviews`,
        attemptsRemaining: 0
      });
      return;
    }
    
    const attemptNumber = attemptCount + 1;
    
    // Fetch previous attempt for context (from last attempt number across all categories)
    const previousEssayResult = await pool.query<ReviewAttempt>(
      `SELECT essay_snapshot
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2 AND attempt_number = $3
       LIMIT 1`,
      [code, userNameNorm, attemptCount]
    );
    
    const previousEssay = previousEssayResult.rows.length > 0 
      ? previousEssayResult.rows[0].essay_snapshot 
      : null;
    
    // Prepare input for SDK
    let sdkInput = `<<<CURRENT_START>>>\n${essay}\n<<<CURRENT_END>>>`;
    if (previousEssay) {
      sdkInput = `<<<PREVIOUS_START>>>\n${previousEssay}\n<<<PREVIOUS_END>>>\n` + sdkInput;
    }
    
    // Call SDK to get review (or use mock in E2E test mode)
    let sdkResult: any;
    
    const isE2ETest = process.env.E2E_TEST === '1';
    
    if (isE2ETest) {
      console.log('[REVIEW] E2E_TEST mode - using mock AI result');
      // Mock AI result for E2E testing
      sdkResult = {
        final_score: 88,
        details: {
          content: {
            score: 22,
            overview_good: ['Clear thesis statement', 'Strong supporting evidence'],
            overview_improve: ['Could expand on counterarguments'],
            suggestions: ['Add more examples in paragraph 3']
          },
          structure: {
            score: 22,
            overview_good: ['Logical flow', 'Good transitions'],
            overview_improve: ['Conclusion could be stronger'],
            suggestions: ['Rework final paragraph']
          },
          mechanics: {
            score: 22,
            overview_good: ['Few grammatical errors', 'Proper citations'],
            overview_improve: ['Some punctuation issues'],
            suggestions: ['Review comma usage']
          }
        }
      };
    } else {
      try {
        console.log('[REVIEW] Calling SDK with input length:', sdkInput.length);
        sdkResult = await runWorkflow({ input_as_text: sdkInput });
        console.log('[REVIEW] SDK Result:', JSON.stringify(sdkResult, null, 2));
      } catch (error) {
        console.error('[REVIEW] Error calling SDK:', error);
        res.status(500).json({ 
          error: 'Failed to process review request',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
      }
    }
    
    // Check if SDK returned valid result
    if (!sdkResult) {
      console.error('[REVIEW] SDK returned null/undefined');
      res.status(500).json({ 
        error: 'Failed to process review request',
        details: 'SDK returned no result'
      });
      return;
    }
    
    // Check if guardrail blocked the request
    if (sdkResult && sdkResult.code === 'INVALID_REQUEST') {
      res.status(400).json({ 
        error: sdkResult.message || 'Invalid request'
      });
      return;
    }
    
    // Check if details exist
    if (!sdkResult.details) {
      console.error('[REVIEW] SDK result missing details:', sdkResult);
      res.status(500).json({ 
        error: 'Failed to process review request',
        details: 'SDK result missing category details'
      });
      return;
    }
    
    // Extract results for each category
    const categories: ReviewCategory[] = ['content', 'structure', 'mechanics'];
    const savedAttempts: ReviewAttempt[] = [];
    
    console.log('[REVIEW] sdkResult.details type:', typeof sdkResult.details);
    console.log('[REVIEW] sdkResult.details keys:', Object.keys(sdkResult.details || {}));
    
    for (const category of categories) {
      const categoryData = sdkResult.details[category];
      
      if (!categoryData) {
        console.error(`[REVIEW] Missing category data for: ${category}`);
        console.error(`[REVIEW] Available keys:`, Object.keys(sdkResult.details));
        continue;
      }
      
      console.log(`[REVIEW] Processing ${category}:`, JSON.stringify(categoryData, null, 2));
      
      // Parse the category feedback - SDK returns overview_good, overview_improve, suggestions
      const result_json = {
        score: categoryData.score || 0,
        overview: {
          good: categoryData.overview_good || [],
          improve: categoryData.overview_improve || []
        },
        suggestions: categoryData.suggestions || []
      };
      
      // Save each category as a separate review attempt
      const insertResult = await pool.query<ReviewAttempt>(
        `INSERT INTO review_attempts 
         (project_code, user_name, user_name_norm, category, attempt_number, 
          essay_snapshot, status, score, result_json, final_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, category, attempt_number, status, score, result_json, error_message, created_at`,
        [
          code,
          userName,
          userNameNorm,
          category,
          attemptNumber,
          essay,
          'success',
          categoryData.score || 0,
          JSON.stringify(result_json),
          sdkResult.final_score // Store the final score from SDK
        ]
      );
      
      savedAttempts.push(insertResult.rows[0]);
    }
    
    // Update player state: deduct review token, add attack token (max 1), update last_review_at
    await pool.query(
      `UPDATE player_state 
       SET review_tokens = review_tokens - 1,
           attack_tokens = LEAST(attack_tokens + 1, 1),
           last_review_at = NOW(),
           updated_at = NOW()
       WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    // Get updated player state
    const updatedPlayerResult = await pool.query(
      `SELECT review_tokens, attack_tokens, shield_tokens 
       FROM player_state 
       WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    const updatedTokens = updatedPlayerResult.rows[0];
    
    const attemptsRemaining = project.attempt_limit_per_category - attemptNumber;
    
    res.json({
      reviews: savedAttempts,
      finalScore: sdkResult.final_score || 0,
      attemptsRemaining,
      tokens: updatedTokens,
      cooldownMs: 2 * 60 * 1000 // 2 minutes
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

// Get leaderboard for a project (top 3 highest scores)
router.get('/projects/:code/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    
    // Verify project exists
    const projectResult = await pool.query(
      'SELECT code FROM projects WHERE code = $1',
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    // Get top 3 users by their highest final_score
    const leaderboardResult = await pool.query<{
      user_name: string;
      highest_score: number;
    }>(
      `SELECT user_name, MAX(final_score) as highest_score
       FROM review_attempts
       WHERE project_code = $1 AND final_score IS NOT NULL
       GROUP BY user_name
       ORDER BY highest_score DESC
       LIMIT 3`,
      [code]
    );
    
    // Format response with rank
    const leaderboard = leaderboardResult.rows.map((row, index) => ({
      rank: index + 1,
      userName: row.user_name,
      score: row.highest_score
    }));
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
