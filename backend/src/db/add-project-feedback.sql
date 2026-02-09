-- Add project_feedback table for anonymous student feedback
-- Students can rate Project Content, System Design, and Response Quality (1-5 stars each)

-- First, add enable_feedback column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS enable_feedback BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN projects.enable_feedback IS 'Whether to collect anonymous feedback from students after final submission';

-- Create project_feedback table
CREATE TABLE IF NOT EXISTS project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  
  -- Ratings (1-5 stars each, all required)
  content_rating INTEGER NOT NULL CHECK (content_rating BETWEEN 1 AND 5),
  system_design_rating INTEGER NOT NULL CHECK (system_design_rating BETWEEN 1 AND 5),
  response_quality_rating INTEGER NOT NULL CHECK (response_quality_rating BETWEEN 1 AND 5),
  
  -- Optional text comment (max 200 words)
  comment TEXT DEFAULT '',
  
  -- Timestamp
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Anonymous tracking hash (to prevent duplicate submissions)
  -- We hash project_code + user_name to allow one feedback per student per project
  -- But we don't store the actual user_name for anonymity
  submission_hash TEXT NOT NULL UNIQUE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_feedback_project_code ON project_feedback(project_code);
CREATE INDEX IF NOT EXISTS idx_project_feedback_submitted_at ON project_feedback(submitted_at DESC);

COMMENT ON TABLE project_feedback IS 'Anonymous student feedback collected after final essay submission';
COMMENT ON COLUMN project_feedback.submission_hash IS 'Hash of project_code+user_name to prevent duplicate submissions while maintaining anonymity';
