import { Router, Request, Response } from 'express';
import pool from '../db/index.js';
import crypto from 'crypto';
import { ProjectFeedback, Project } from '../types.js';

const router = Router();

// Submit anonymous feedback (public endpoint)
router.post('/:code/feedback/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code.toUpperCase();
    const {
      userName,
      contentRating,
      systemDesignRating,
      responseQualityRating,
      comment
    } = req.body;

    // Validate required fields
    if (!userName || !contentRating || !systemDesignRating || !responseQualityRating) {
      res.status(400).json({ error: 'All ratings are required' });
      return;
    }

    // Validate ratings are 1-5
    if ([contentRating, systemDesignRating, responseQualityRating].some(r => r < 1 || r > 5)) {
      res.status(400).json({ error: 'Ratings must be between 1 and 5' });
      return;
    }

    // Validate comment length (max 200 words)
    if (comment && comment.trim()) {
      const wordCount = comment.trim().split(/\s+/).length;
      if (wordCount > 200) {
        res.status(400).json({ error: 'Comment must be 200 words or less' });
        return;
      }
    }

    // Check if project has feedback enabled
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

    // Create hash for duplicate prevention (anonymous but trackable)
    const submissionHash = crypto
      .createHash('sha256')
      .update(`${code}-${userName.trim().toLowerCase()}`)
      .digest('hex');

    // Check if already submitted
    const existingResult = await pool.query(
      'SELECT id FROM project_feedback WHERE submission_hash = $1',
      [submissionHash]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({ error: 'Feedback already submitted for this project' });
      return;
    }

    // Insert feedback
    const result = await pool.query<ProjectFeedback>(
      `INSERT INTO project_feedback 
       (project_code, content_rating, system_design_rating, response_quality_rating, 
        comment, submission_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_code, content_rating, system_design_rating, 
                 response_quality_rating, comment, submitted_at`,
      [code, contentRating, systemDesignRating, responseQualityRating, comment || '', submissionHash]
    );

    res.status(201).json({ 
      success: true,
      feedback: result.rows[0]
    });
  } catch (error: any) {
    console.error('Submit feedback error:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Feedback already submitted for this project' });
    } else {
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  }
});

// Check if user has already submitted feedback
router.post('/:code/feedback/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code.toUpperCase();
    const { userName } = req.body;

    if (!userName) {
      res.status(400).json({ error: 'userName is required' });
      return;
    }

    const submissionHash = crypto
      .createHash('sha256')
      .update(`${code}-${userName.trim().toLowerCase()}`)
      .digest('hex');

    const result = await pool.query(
      'SELECT id FROM project_feedback WHERE submission_hash = $1',
      [submissionHash]
    );

    res.json({ hasSubmitted: result.rows.length > 0 });
  } catch (error) {
    console.error('Check feedback error:', error);
    res.status(500).json({ error: 'Failed to check feedback status' });
  }
});

export default router;
