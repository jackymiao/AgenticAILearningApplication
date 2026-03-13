import express, { Request, Response } from 'express';
import { decryptPassword } from '../utils/crypto.js';
import pool, { normalizeProjectCode, normalizeUserName, normalizeStudentId } from '../db/index.js';
import { runWorkflow } from '../sdk/reviewSdk.js';
import { detectAIContent, storeDetectionResult } from '../services/aiDetection.js';
import { compareEssaysOptimized } from '../services/essayComparison.js';
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
    const { studentId, projectPassword } = req.body;

    if (!studentId || !projectPassword) {
      res.status(400).json({ error: 'studentId and projectPassword are required' });
      return;
    }

    const enabled = await ensureProjectEnabled(code, res);
    if (!enabled) return;

    const studentIdNorm = normalizeStudentId(studentId);

    const projectResult = await pool.query<Pick<Project, 'project_password_hash'>>(
      `SELECT project_password_hash
       FROM projects
       WHERE code = $1`,
      [code]
    );

    const storedHash = projectResult.rows[0]?.project_password_hash || null;
    if (!storedHash) {
      res.status(403).json({ error: 'Project password is not configured yet. Please contact your instructor.' });
      return;
    }

    const decryptedPassword = decryptPassword(storedHash);
    if (String(projectPassword) !== decryptedPassword) {
      res.status(401).json({ error: 'Invalid project password' });
      return;
    }

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
      const cooldownSeconds = projectResult.rows[0].review_cooldown_seconds ?? 120;
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
      const cooldownMs = (project.review_cooldown_seconds ?? 120) * 1000;
      
      if (elapsed < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
        res.status(429).json({ 
          error: `Please wait ${remaining} seconds before submitting another review`,
          cooldownRemaining: cooldownMs - elapsed
        });
        return;
      }
    }
    
    // Check for AI-generated content (skip if test mode is enabled)
    if (!project.test_mode) {
      try {
        console.log('[DETECTION] 🔍 Starting AI content detection...');
        const detection = await detectAIContent(essay);
        
        // Store detection result (asynchronously, don't wait for it)
        storeDetectionResult(code, userNameNorm, essay, detection).catch(err => 
          console.error('[DETECTION] Failed to store result:', err)
        );
        
        if (detection.isAI) {
          console.log(`[DETECTION] ⚠️ AI-generated content detected for ${code}/${userNameNorm}`);
          res.status(400).json({
            error: 'AI-Generated Content Detected',
            details: 'This essay appears to be generated by AI (predicted_class: ' + detection.predicted_class + '). Please submit your own original work.',
            detection: {
              predicted_class: detection.predicted_class,
              confidence_score: detection.confidence_score,
              confidence_category: detection.confidence_category
            }
          });
          return;
        }
        
        console.log(`[DETECTION] ✅ Content verified as human-generated`);
      } catch (detectionError) {
        console.error('[DETECTION] ❌ AI detection error:', detectionError);
        // Continue with review even if detection fails (don't block the service)
        console.log('[DETECTION] Continuing with review despite detection error');
      }
    } else {
      console.log(`[DETECTION] 🧪 Test mode enabled - skipping AI content detection for ${code}`);
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
    
    // Check if essay is identical to previous submission
    if (previousEssay) {
      const comparisonResult = compareEssaysOptimized(previousEssay, essay);
      if (comparisonResult.areEqual) {
        res.status(400).json({ 
          error: 'Please revise your essay based on the previous feedback before submitting again',
          code: 'ESSAY_UNCHANGED'
        });
        return;
      }
    }
    
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

    // Re-check right before persistence to prevent writes if admin disabled the project mid-flow.
    const enabledBeforePersist = await ensureProjectEnabled(code, res);
    if (!enabledBeforePersist) return;
    
    // Extract results for each category
    const categories: ReviewCategory[] = ['content', 'structure', 'mechanics'];
    const savedAttempts: ReviewAttempt[] = [];
    const categoryScores: Record<string, number> = {};
    
    if (process.env.DEBUG === '1') {

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
        console.error(`[REVIEW] ❌ Missing category data for: ${category}`);
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
    
    // Update player state: deduct review token, add attack token (max 1), update last_review_at, set first review flag
    await pool.query(
      `UPDATE player_state 
       SET review_tokens = review_tokens - 1,
           attack_tokens = LEAST(attack_tokens + 1, 1),
           last_review_at = NOW(),
           has_submitted_first_review = true,
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
    
    const responseData = {
      reviews: savedAttempts,
      finalScore: calculatedFinalScore,
      attemptsRemaining: updatedTokens.review_tokens,
      tokens: updatedTokens,
      cooldownMs: (project.review_cooldown_seconds ?? 120) * 1000
    };
    

    
    res.json(responseData);
    
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
       SELECT $1, $2, $3, $4
       FROM projects
       WHERE code = $1 AND enabled = TRUE
       RETURNING id, submitted_at`,
      [code, userName, userNameNorm, essay]
    );

    if (result.rows.length === 0) {
      const projectStatus = await pool.query<Pick<Project, 'enabled'>>(
        'SELECT enabled FROM projects WHERE code = $1',
        [code]
      );

      if (projectStatus.rows.length === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.status(403).json({ error: 'This project is currently disabled' });
      return;
    }
    
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
    
    // Get all users by their highest final_score, ordered by score DESC and most recent review first
    const leaderboardResult = await pool.query<{
      user_name: string;
      highest_score: number;
    }>(
      `SELECT user_name, MAX(final_score) as highest_score
       FROM review_attempts
       WHERE project_code = $1 AND final_score IS NOT NULL
       GROUP BY user_name
       ORDER BY highest_score DESC, MAX(created_at) DESC`,
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

// Track editor focus/blur events for time-on-task analytics
router.post('/projects/:code/editor-events', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = normalizeProjectCode(req.params.code);
    const { userName, eventType, duration_ms, essay_length, attempt_number } = req.body;
    
    if (!userName || !eventType) {
      res.status(400).json({ error: 'userName and eventType required' });
      return;
    }

    if (!['focus', 'blur'].includes(eventType)) {
      res.status(400).json({ error: "eventType must be 'focus' or 'blur'" });
      return;
    }
    
    const userNameNorm = normalizeUserName(userName);
    const sessionId = (req as any).sessionID || `session-${Date.now()}`;
    
    console.log(`[EDITOR] 📝 Event: ${eventType} for ${code}/${userNameNorm} (duration: ${duration_ms}ms)`);
    
    await pool.query(
      `INSERT INTO editor_sessions 
       (project_code, user_name_norm, session_id, event_type, duration_ms, essay_length, current_attempt_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [code, userNameNorm, sessionId, eventType, duration_ms, essay_length, attempt_number]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('[EDITOR] ❌ Error logging editor event:', error);
    res.status(500).json({ error: 'Failed to log editor event' });
  }
});

export default router;
