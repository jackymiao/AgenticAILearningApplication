-- Add review_cooldown_seconds column to projects table
-- This allows admins to customize the cooldown period between review submissions

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS review_cooldown_seconds INTEGER NOT NULL DEFAULT 120;

-- Update existing projects to have the default 120 seconds cooldown
UPDATE projects 
SET review_cooldown_seconds = 120 
WHERE review_cooldown_seconds IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN projects.review_cooldown_seconds IS 'Cooldown period in seconds between review submissions (30, 60, 90, 120, 150, or 180)';
