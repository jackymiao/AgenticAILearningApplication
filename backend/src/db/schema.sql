-- Database initialization script for Essay Grading Application

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  code CHAR(6) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  youtube_url TEXT,
  word_limit INTEGER NOT NULL DEFAULT 150,
  attempt_limit_per_category INTEGER NOT NULL DEFAULT 3,
  
  -- Agent Builder configuration (uses preset agent IDs)
  agent_mode TEXT NOT NULL CHECK (agent_mode IN ('agent_a', 'agent_b')),
  
  -- Audit fields
  created_by_admin_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_name_norm TEXT NOT NULL,
  essay TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_score INTEGER,
  admin_feedback TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Enforce one submission per user per project
  CONSTRAINT unique_submission UNIQUE (project_code, user_name_norm)
);

-- Create review_attempts table
CREATE TABLE IF NOT EXISTS review_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_name_norm TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('grammar', 'structure', 'style', 'content')),
  attempt_number INTEGER NOT NULL,
  essay_snapshot TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  score NUMERIC(5,2),
  result_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  
  -- Enforce unique attempts
  CONSTRAINT unique_attempt UNIQUE (project_code, user_name_norm, category, attempt_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_review_attempts_lookup ON review_attempts(project_code, user_name_norm);
CREATE INDEX IF NOT EXISTS idx_review_attempts_submission ON review_attempts(submission_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_code);

-- Create session table for express-session
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
