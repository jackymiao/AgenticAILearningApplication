import express, { Request, Response } from 'express';
import pool, { normalizeProjectCode, normalizeUserName, normalizeStudentId } from '../db/index.js';
import { runWorkflow } from '../sdk/reviewSdk.js';
import type { Project, ReviewAttempt, ReviewCategory, UserState } from '../types.js';

const router = express.Router();

async function ensureProjectEnabled(code: string, res: Response): Promise<boolean> {
  const result = await pool.query<Pick<Project, 'enabled'>>(
    'SELECT enabled FROM projects WHERE code = $1',
    [code]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return false;
  }

  if (!result.rows[0].enabled) {
    res.status(403).json({ error: 'This project is currently disabled' });
    return false;
  }

  return true;
}

// Get project information
router.get('/projects/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);

    const enabled = await ensureProjectEnabled(code, res);
    if (!enabled) return;
    
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

// Validate student ID for project access
router.post('/projects/:code/validate-student', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { studentId } = req.body;

    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    const enabled = await ensureProjectEnabled(code, res);
    if (!enabled) return;

    const studentIdNorm = normalizeStudentId(studentId);

    const result = await pool.query(
      `SELECT student_name, student_id
       FROM project_students
       WHERE project_code = $1 AND student_id_norm = $2`,
      [code, studentIdNorm]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student ID not found' });
      return;
    }

    res.json({
      studentName: result.rows[0].student_name,
      studentId: result.rows[0].student_id
    });
  } catch (error) {
    console.error('Validate student error:', error);
    res.status(500).json({ error: 'Failed to validate student ID' });
  }
});

// Get user state for a project
router.get('/projects/:code/user-state', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const userName = req.query.userName as string;

    const enabled = await ensureProjectEnabled(code, res);
    if (!enabled) return;
    
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
    
    // Get project limits and cooldown settings
    const projectResult = await pool.query<Pick<Project, 'attempt_limit_per_category' | 'review_cooldown_seconds'>>(
      `SELECT attempt_limit_per_category, review_cooldown_seconds FROM projects WHERE code = $1`,
      [code]
    );
    
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    const limit = projectResult.rows[0].attempt_limit_per_category;
    
    // Initialize or get player_state
    const playerStateResult = await pool.query(
      `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_code, user_name_norm) 
       DO UPDATE SET updated_at = NOW(), user_name = EXCLUDED.user_name
       RETURNING review_tokens, last_review_at`,
      [code, userName, userNameNorm, limit]
    );
    
    const attemptsRemaining = playerStateResult.rows[0].review_tokens;
    const lastReviewAt = playerStateResult.rows[0].last_review_at;
    
    // Calculate cooldown remaining (if any)
    let cooldownRemaining = 0;
    if (lastReviewAt) {
      const cooldownSeconds = projectResult.rows[0].review_cooldown_seconds || 120;
      const cooldownMs = cooldownSeconds * 1000;
      const lastReviewTime = new Date(lastReviewAt).getTime();
      const elapsed = Date.now() - lastReviewTime;
      cooldownRemaining = Math.max(0, cooldownMs - elapsed);
    }
    
    // Get review history grouped by category (most recent first)
    const historyResult = await pool.query<ReviewAttempt>(
      `SELECT id, category, attempt_number, status, score, final_score, result_json, error_message, created_at
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
      reviewHistory,
      cooldownRemaining
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

    const enabled = await ensureProjectEnabled(code, res);
    if (!enabled) return;
    
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
    
    // Check review_tokens
    if (playerState.review_tokens < 1) {
      res.status(403).json({ 
        error: `You have no review tokens remaining`,
        attemptsRemaining: 0
      });
      return;
    }
    
    // Count total review attempts (not per category anymore)
    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(DISTINCT attempt_number)::int as count
       FROM review_attempts
       WHERE project_code = $1 AND user_name_norm = $2`,
      [code, userNameNorm]
    );
    
    const attemptCount = countResult.rows[0].count;
    
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
        sdkResult = await runWorkflow({ input_as_text: sdkInput });
        if (process.env.DEBUG === '1') {
          console.log('[REVIEW] final_score:', sdkResult?.final_score);
          console.log('[REVIEW] Full SDK Result:', JSON.stringify(sdkResult, null, 2));
        }
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
    const categoryScores: Record<string, number> = {};
    
    if (process.env.DEBUG === '1') {
      console.log('[REVIEW] sdkResult.details keys:', Object.keys(sdkResult.details || {}));
    }
    
    // First pass: extract all category scores
    for (const category of categories) {
      let categoryData = sdkResult.details[category];

      // If category data is a JSON string, parse it
      if (typeof categoryData === 'string') {
        try {
          categoryData = JSON.parse(categoryData);
        } catch (parseError) {
          console.error(`[REVIEW] Failed to parse ${category} details JSON:`, parseError);
          categoryData = null;
        }
      }
      
      if (!categoryData) {
        console.error(`[REVIEW] Missing category data for: ${category}`);
        console.error(`[REVIEW] Available keys:`, Object.keys(sdkResult.details));
        continue;
      }

      categoryScores[category] = categoryData.score || 0;
    }

    // Calculate final score as average of three categories
    const scores = Object.values(categoryScores);
    const calculatedFinalScore = scores.length === 3 
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : sdkResult.final_score || 0;
    
    if (process.env.DEBUG === '1') {
      console.log('[REVIEW] Calculated final score:', { scores: categoryScores, final: calculatedFinalScore });
    }
    
    // Second pass: save each category with the calculated final score
    for (const category of categories) {
      let categoryData = sdkResult.details[category];

      // If category data is a JSON string, parse it
      if (typeof categoryData === 'string') {
        try {
          categoryData = JSON.parse(categoryData);
        } catch (parseError) {
          console.error(`[REVIEW] Failed to parse ${category} details JSON:`, parseError);
          categoryData = null;
        }
      }
      
      if (!categoryData) {
        console.error(`[REVIEW] Missing category data for: ${category}`);
        console.error(`[REVIEW] Available keys:`, Object.keys(sdkResult.details));
        continue;
      }
      
      if (process.env.DEBUG === '1') {
        console.log(`[REVIEW] Processing ${category}:`, JSON.stringify(categoryData, null, 2));
      }
      
      // Parse the category feedback - SDK returns overview_good, overview_improve, suggestions
      const result_json = {
        score: categoryData.score || 0,
        overview: {
          good: categoryData.overview_good || [],
          improve: categoryData.overview_improve || []
        },
        suggestions: categoryData.suggestions || []
      };
      
      // Save each category as a separate review attempt with calculated final score
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
          calculatedFinalScore
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
    
    res.json({
      reviews: savedAttempts,
      finalScore: calculatedFinalScore,
      attemptsRemaining: updatedTokens.review_tokens,
      tokens: updatedTokens,
      cooldownMs: (project.review_cooldown_seconds || 120) * 1000
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

    const enabled = await ensureProjectEnabled(code, res);
    if (!enabled) return;
    
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
    const enabled = await ensureProjectEnabled(code, res);
    if (!enabled) return;
    
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
