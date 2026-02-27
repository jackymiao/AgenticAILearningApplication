-- Migration: Add has_submitted_first_review flag to player_state
-- Purpose: Track if player has submitted their first review for token protection logic
-- Date: 2026-02-26

-- Add the boolean field with default false
ALTER TABLE player_state 
ADD COLUMN IF NOT EXISTS has_submitted_first_review BOOLEAN NOT NULL DEFAULT false;

-- Update existing players who have review attempts to set the flag to true
UPDATE player_state ps
SET has_submitted_first_review = true
WHERE EXISTS (
  SELECT 1 FROM review_attempts ra
  WHERE ra.project_code = ps.project_code 
  AND ra.user_name_norm = ps.user_name_norm
);
